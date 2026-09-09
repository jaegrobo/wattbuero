#!/usr/bin/env python3
"""
Holt Trainingsdaten von der Strava-API und schreibt eine Zusammenfassung nach
data/strava-stats.json. Gedacht zum Aufruf aus dem GitHub-Actions-Workflow
.github/workflows/strava-sync.yml (wöchentlich per Cron + manuell auslösbar).

Liefert vier Blöcke:
  rolling_28_days   - wie bisher, Kennzahlen der letzten 28 Tage
  monthly           - Zeitreihe der letzten bis zu 12 Kalendermonate
                       (outdoor/indoor/commute-km, Höhenmeter, Ausfahrten,
                       Stunden, Ø Kadenz)
  sport_split       - km-Summe je Sportart über den gesamten Abrufzeitraum
                       (Rennrad/Gravel/Virtual/E-Bike/Sonstige)
  recent_activities - wie bisher, die letzten 5 Aktivitäten

Benötigt drei Umgebungsvariablen (im Workflow als GitHub Actions Secrets
gesetzt, NIE im Code oder in Dateien im Repo):
  STRAVA_CLIENT_ID
  STRAVA_CLIENT_SECRET
  STRAVA_REFRESH_TOKEN

Nur Python-Standardbibliothek, keine externen Abhängigkeiten (kein pip
install nötig) - passt zum Rest des Projekts.
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

TOKEN_URL = "https://www.strava.com/oauth/token"
ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities"
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "strava-stats.json")

ROLLING_WINDOW_DAYS = 28
# Etwas mehr als 12 Kalendermonate abrufen, damit der aktuelle und die
# vorangegangenen 11 Monate garantiert vollständig drin sind; die
# Monatsliste wird am Ende auf die letzten 12 Monate gekappt.
HISTORY_DAYS = 380

# Strava unterscheidet "type" (älteres, gröberes Feld) und "sport_type"
# (neuer, differenzierter - z. B. "GravelRide" statt nur "Ride"). Wir lesen
# bevorzugt sport_type, fallen bei älteren Aktivitäten auf type zurück.
# Wichtig: Die alte Version dieses Skripts filterte nur auf
# type in ("Ride", "VirtualRide") - Gravel- und E-Bike-Fahrten mit eigenem
# sport_type wären dabei still unter den Tisch gefallen. Das ist hiermit
# behoben.
SPORT_LABELS = {
    "Ride": "Rennrad",
    "GravelRide": "Gravel",
    "MountainBikeRide": "Mountainbike",
    "VirtualRide": "Virtual",
    "EBikeRide": "E-Bike",
    "EMountainBikeRide": "E-Bike",
}
CYCLING_TYPES = set(SPORT_LABELS.keys())


def require_env(name):
    value = os.environ.get(name)
    if not value:
        print(f"FEHLER: Umgebungsvariable {name} fehlt.", file=sys.stderr)
        sys.exit(1)
    return value


def get_access_token():
    client_id = require_env("STRAVA_CLIENT_ID")
    client_secret = require_env("STRAVA_CLIENT_SECRET")
    refresh_token = require_env("STRAVA_REFRESH_TOKEN")

    data = urllib.parse.urlencode(
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
    ).encode()

    req = urllib.request.Request(TOKEN_URL, data=data, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            payload = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"FEHLER beim Token-Refresh: {e.code} {e.read().decode()}", file=sys.stderr)
        sys.exit(1)

    new_refresh_token = payload.get("refresh_token")
    if new_refresh_token and new_refresh_token != refresh_token:
        # Strava kann den Refresh-Token gelegentlich rotieren. Fällt der Sync
        # künftig mit "invalid_grant" aus, muss das GitHub-Secret
        # STRAVA_REFRESH_TOKEN manuell auf diesen neuen Wert aktualisiert werden.
        print(
            "HINWEIS: Strava hat einen neuen Refresh-Token ausgegeben. "
            "Falls der nächste Sync fehlschlägt, GitHub-Secret "
            "STRAVA_REFRESH_TOKEN manuell aktualisieren auf:\n"
            f"{new_refresh_token}",
            file=sys.stderr,
        )
    return payload["access_token"]


def fetch_all_activities(access_token, after_epoch):
    """Holt alle Aktivitäten seit after_epoch, seitenweise (Strava-Limit
    200 pro Seite)."""
    activities = []
    page = 1
    while True:
        params = urllib.parse.urlencode({"after": after_epoch, "per_page": 200, "page": page})
        req = urllib.request.Request(
            f"{ACTIVITIES_URL}?{params}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        try:
            with urllib.request.urlopen(req) as resp:
                batch = json.loads(resp.read())
        except urllib.error.HTTPError as e:
            print(f"FEHLER beim Abruf der Aktivitäten: {e.code} {e.read().decode()}", file=sys.stderr)
            sys.exit(1)
        if not batch:
            break
        activities.extend(batch)
        if len(batch) < 200:
            break
        page += 1
    return activities


def sport_category(a):
    st = a.get("sport_type") or a.get("type") or ""
    return SPORT_LABELS.get(st, "Sonstige")


def is_cycling(a):
    st = a.get("sport_type") or a.get("type") or ""
    return st in CYCLING_TYPES


def volume_bucket(a):
    if a.get("commute"):
        return "commute_km"
    if a.get("trainer"):
        return "indoor_km"
    return "outdoor_km"


def summarize(activities):
    rides = [a for a in activities if is_cycling(a)]

    cutoff_28 = datetime.now(timezone.utc) - timedelta(days=ROLLING_WINDOW_DAYS)
    rolling = [a for a in rides if _parse(a.get("start_date_local")) >= cutoff_28]

    ride_count = len(rolling)
    distance_km = sum(a.get("distance", 0) for a in rolling) / 1000
    elevation_m = sum(a.get("total_elevation_gain", 0) for a in rolling)
    moving_time_h = sum(a.get("moving_time", 0) for a in rolling) / 3600
    watts = [a["average_watts"] for a in rolling if a.get("average_watts") and a.get("device_watts")]
    avg_watts = round(sum(watts) / len(watts)) if watts else None

    months = {}
    for a in rides:
        ym = (a.get("start_date_local") or "")[:7]
        if not ym:
            continue
        m = months.setdefault(
            ym,
            {"ym": ym, "outdoor_km": 0.0, "indoor_km": 0.0, "commute_km": 0.0,
             "elevation_m": 0.0, "rides": 0, "hours": 0.0, "cadence_sum": 0.0, "cadence_n": 0},
        )
        m[volume_bucket(a)] += a.get("distance", 0) / 1000
        m["elevation_m"] += a.get("total_elevation_gain", 0)
        m["rides"] += 1
        m["hours"] += a.get("moving_time", 0) / 3600
        cadence = a.get("average_cadence")
        if cadence:
            m["cadence_sum"] += cadence
            m["cadence_n"] += 1

    monthly = []
    for ym in sorted(months.keys())[-12:]:
        m = months[ym]
        monthly.append(
            {
                "ym": m["ym"],
                "outdoor_km": round(m["outdoor_km"], 1),
                "indoor_km": round(m["indoor_km"], 1),
                "commute_km": round(m["commute_km"], 1),
                "elevation_m": round(m["elevation_m"]),
                "rides": m["rides"],
                "hours": round(m["hours"], 1),
                "avg_cadence": round(m["cadence_sum"] / m["cadence_n"], 1) if m["cadence_n"] else None,
            }
        )

    sport_totals = {}
    for a in rides:
        cat = sport_category(a)
        sport_totals[cat] = sport_totals.get(cat, 0) + a.get("distance", 0) / 1000
    sport_split = [
        {"name": name, "km": round(km, 1)}
        for name, km in sorted(sport_totals.items(), key=lambda kv: -kv[1])
        if km > 0
    ]

    recent = []
    for a in sorted(rides, key=lambda x: x.get("start_date_local", ""), reverse=True)[:5]:
        recent.append(
            {
                "id": a.get("id"),
                "name": a.get("name"),
                "date": a.get("start_date_local"),
                "distance_km": round(a.get("distance", 0) / 1000, 1),
                "elevation_gain_m": round(a.get("total_elevation_gain", 0)),
                "moving_time_min": round(a.get("moving_time", 0) / 60),
                "average_watts": a.get("average_watts") if a.get("device_watts") else None,
            }
        )

    return {
        "rolling_28_days": {
            "ride_count": ride_count,
            "distance_km": round(distance_km, 1),
            "elevation_gain_m": round(elevation_m),
            "moving_time_hours": round(moving_time_h, 1),
            "average_watts": avg_watts,
        },
        "monthly": monthly,
        "sport_split": sport_split,
        "recent_activities": recent,
    }


def _parse(iso):
    if not iso:
        return datetime.min.replace(tzinfo=timezone.utc)
    try:
        # Strava liefert Zeitstempel mit trailing "Z" (z. B.
        # "2026-09-05T09:14:44Z"). datetime.fromisoformat() akzeptiert das
        # erst ab Python 3.11 - GitHub Actions' ubuntu-latest kann aber auch
        # mit Python 3.10 laufen, wo das mit ValueError knallt. "Z" hier
        # explizit gegen "+00:00" tauschen, damit es auf jeder 3.x-Version
        # funktioniert.
        return datetime.fromisoformat(iso.replace("Z", "+00:00")).replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)


def main():
    access_token = get_access_token()
    after_epoch = int((datetime.now(timezone.utc) - timedelta(days=HISTORY_DAYS)).timestamp())
    activities = fetch_all_activities(access_token, after_epoch)
    summary = summarize(activities)
    summary["generated_at"] = datetime.now(timezone.utc).isoformat()

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Geschrieben: {OUTPUT_PATH}")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
