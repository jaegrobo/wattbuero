#!/usr/bin/env python3
"""
Holt Trainingsdaten von der Strava-API und schreibt eine Zusammenfassung nach
data/strava-stats.json. Gedacht zum Aufruf aus dem GitHub-Actions-Workflow
.github/workflows/strava-sync.yml (wöchentlich per Cron + manuell auslösbar).

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


def fetch_activities(access_token, after_epoch):
    params = urllib.parse.urlencode({"after": after_epoch, "per_page": 100})
    req = urllib.request.Request(
        f"{ACTIVITIES_URL}?{params}",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"FEHLER beim Abruf der Aktivitäten: {e.code} {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


def summarize(activities):
    rides = [a for a in activities if a.get("type") in ("Ride", "VirtualRide")]

    ride_count = len(rides)
    distance_km = sum(a.get("distance", 0) for a in rides) / 1000
    elevation_m = sum(a.get("total_elevation_gain", 0) for a in rides)
    moving_time_h = sum(a.get("moving_time", 0) for a in rides) / 3600

    watts = [a["average_watts"] for a in rides if a.get("average_watts") and a.get("device_watts")]
    avg_watts = round(sum(watts) / len(watts)) if watts else None

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
        "recent_activities": recent,
    }


def main():
    access_token = get_access_token()
    after_epoch = int((datetime.now(timezone.utc) - timedelta(days=ROLLING_WINDOW_DAYS)).timestamp())
    activities = fetch_activities(access_token, after_epoch)
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
