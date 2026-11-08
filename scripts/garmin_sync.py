#!/usr/bin/env python3
"""
garmin_sync.py – Trainingsdaten aus der Garmin Connect Personal API für wattbuero.de

Schreibt data/garmin-stats.json (öffentlich, wird von der Website gelesen) und
data/garmin-cache.json (Rad je Aktivität, damit FIT-Dateien nur einmal geladen werden).

Öffentlich landen ausschließlich Fahrrad-Aktivitätswerte: Distanz, Höhe, Zeit,
Leistung, Trainingsbelastung (TSS) und daraus gerechnete Fitness/Ermüdung/Form.
Keine Gesundheitsdaten (Schlaf, HRV, Gewicht, Puls), keine Koordinaten.
Pendelfahrten zählen in die Summen, erscheinen aber nie einzeln und nur auf 10 km
gerundet.

Nur Python-Standardbibliothek (3.8+).

Aufruf:
  python3 scripts/garmin_sync.py              # fragt den Key verdeckt ab (lokal)
  GARMIN_API_KEY=... python3 scripts/garmin_sync.py   # GitHub Actions
  python3 scripts/garmin_sync.py --discover   # listet Geräte-Seriennummern der
                                              # letzten Fahrten, für die Rad-Zuordnung
  python3 scripts/garmin_sync.py --fixture DATEI.json   # Test ohne API

Umgebungsvariablen (alle optional außer dem Key):
  GARMIN_API_KEY      Personal API Key (GitHub Secret, nie ins Repo)
  WB_PENDEL_ZONEN     "lat,lon;lat,lon" – zwei Orte, zwischen denen eine Fahrt als
                      Pendeln gilt (GitHub Secret, nie ins Repo)
  WB_RAEDER           JSON {"serials": {"<Seriennr>": "aeroscoop", ...}} – überschreibt
                      scripts/garmin_bikes.json (Secret, falls Seriennummern privat
                      bleiben sollen)
"""
import argparse
import base64
import getpass
import io
import json
import math
import os
import re
import struct
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

BASE = os.environ.get("GARMIN_PERSONAL_API_BASE_URL", "https://personal.connectapi.garmin.com")
TOKEN_PATH = "/personalapitoken-service/personal-api/personal-api-key/token"
SEARCH_PATH = "/activitylist-service/activities/search/activities"
FIT_PATH = "/download-service/files/activity/{}"
PAUSE = 0.4            # Sekunden zwischen Aufrufen, Garmin nennt keine Limits
HISTORY_DAYS = 400     # so weit zurück wird jedes Mal gelesen (12 Monate + Lastvorlauf)
FIT_PER_RUN = 40       # höchstens so viele FIT-Dateien je Lauf nachladen
PAGE = 100

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "garmin-stats.json"
CACHE = ROOT / "data" / "garmin-cache.json"
BIKES = ROOT / "scripts" / "garmin_bikes.json"

INDOOR_TYPES = {"virtual_ride", "indoor_cycling"}
CYCLING_TYPES = {"cycling", "road_biking", "gravel_cycling", "mountain_biking",
                 "cyclocross", "virtual_ride", "indoor_cycling", "track_cycling",
                 "recumbent_cycling", "bmx", "e_bike_fitness", "e_bike_mountain"}
COMMUTE_WORDS = re.compile(r"(arbeit|pendel|commute|nach hause|heimweg|b(ü|ue)ro)", re.I)
CURVE_SECONDS = [1, 5, 10, 30, 60, 120, 300, 600, 1200, 1800, 3600, 7200, 18000]


# ---------------------------------------------------------------- HTTP

def http(method, path, headers, params=None, accept="application/json"):
    url = BASE + path + ("?" + urllib.parse.urlencode(params) if params else "")
    req = urllib.request.Request(url, method=method, headers={**headers, "Accept": accept})
    for versuch in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503, 504) and versuch < 2:
                time.sleep(5 * (versuch + 1))
                continue
            return e.code, e.read()
        except urllib.error.URLError as e:
            if versuch < 2:
                time.sleep(5)
                continue
            return 0, str(e.reason).encode()


def get_token(key):
    status, body = http("POST", TOKEN_PATH, {"Authorization": "ApiKey " + key}, accept="*/*")
    if status != 200:
        sys.exit(f"Token-Abruf fehlgeschlagen (HTTP {status}). Key falsch, abgelaufen oder "
                 "gelöscht? In Garmin Connect neu erzeugen und das Secret GARMIN_API_KEY ersetzen.")
    return body.decode().strip()


def fetch_activities(H, since_ms):
    out, start = [], 0
    while True:
        status, body = http("GET", SEARCH_PATH, H, {"start": start, "limit": PAGE})
        if status != 200:
            sys.exit(f"Aktivitätsliste: HTTP {status}")
        page = json.loads(body or b"[]")
        out += page
        time.sleep(PAUSE)
        if len(page) < PAGE or min(a.get("beginTimestamp", 0) for a in page) < since_ms:
            break
        start += PAGE
    return [a for a in out if a.get("beginTimestamp", 0) >= since_ms]


def fetch_fit(H, aid):
    status, body = http("GET", FIT_PATH.format(aid), H,
                        accept="application/zip, application/x-zip-compressed, application/octet-stream")
    time.sleep(PAUSE)
    if status != 200 or not body:
        return None
    if body[:2] == b"PK":
        with zipfile.ZipFile(io.BytesIO(body)) as z:
            names = [n for n in z.namelist() if n.lower().endswith(".fit")]
            return z.read(names[0]) if names else None
    return body


# ---------------------------------------------------------------- FIT: nur device_info

BASE_FMT = {0x00: "B", 0x01: "b", 0x02: "B", 0x83: "h", 0x84: "H", 0x85: "i", 0x86: "I",
            0x07: "s", 0x88: "f", 0x89: "d", 0x0A: "B", 0x8B: "H", 0x8C: "I", 0x0D: "B",
            0x8E: "q", 0x8F: "Q", 0x90: "Q"}
INVALID = {"B": 0xFF, "H": 0xFFFF, "I": 0xFFFFFFFF}


PROFIL_MSG = {6: 0, 12: 3}   # bike_profile.name, sport.name (Name des Rad-/Aktivitätsprofils am Edge)


def fit_devices(data):
    return fit_scan(data)[0]


def fit_scan(data):
    """Liest aus einer FIT-Datei die device_info-Nachrichten (global 23) und die Namen
    von Rad- und Aktivitätsprofil. Rückgabe: (Geräteliste, Profilnamen)."""
    if not data or len(data) < 14 or data[8:12] != b".FIT":
        return [], []
    hsize = data[0]
    end = hsize + struct.unpack_from("<I", data, 4)[0]
    pos, defs, devices, namen = hsize, {}, [], []
    while pos < min(end, len(data)):
        h = data[pos]; pos += 1
        if h & 0x80:                         # komprimierter Zeitstempel
            local, is_def = (h >> 5) & 0x03, False
        else:
            local, is_def = h & 0x0F, bool(h & 0x40)
        if is_def:
            arch = data[pos + 1]
            e = ">" if arch == 1 else "<"
            gnum = struct.unpack_from(e + "H", data, pos + 2)[0]
            n = data[pos + 4]; pos += 5
            fields = []
            for _ in range(n):
                fields.append((data[pos], data[pos + 1], data[pos + 2])); pos += 3
            dev_size = 0
            if h & 0x20:
                nd = data[pos]; pos += 1
                for _ in range(nd):
                    dev_size += data[pos + 1]; pos += 3
            defs[local] = (gnum, e, fields, dev_size)
            continue
        if local not in defs:
            break                               # kaputte Datei, lieber aufhören als raten
        gnum, e, fields, dev_size = defs[local]
        rec = {}
        for num, size, bt in fields:
            raw = data[pos:pos + size]; pos += size
            if gnum != 23 and gnum not in PROFIL_MSG:
                continue
            f = BASE_FMT.get(bt, "B")
            if f == "s":
                rec[num] = raw.split(b"\0")[0].decode("utf-8", "replace")
            elif struct.calcsize(f) == size:
                v = struct.unpack(e + f, raw)[0]
                if bt in (0x8C, 0x0A, 0x8B, 0x90) and v == 0:   # uint*z: 0 = ungültig
                    continue
                if v != INVALID.get(f):
                    rec[num] = v
        pos += dev_size
        if gnum == 23 and rec.get(3):
            devices.append({"serial": str(rec[3]), "manufacturer": rec.get(2),
                            "product": rec.get(4), "device_type": rec.get(1),
                            "name": rec.get(27)})
        if gnum in PROFIL_MSG and isinstance(rec.get(PROFIL_MSG[gnum]), str):
            n = rec[PROFIL_MSG[gnum]].strip()
            if n and n not in namen:
                namen.append(n)
    return devices, namen


# ---------------------------------------------------------------- Einordnung

def type_key(a):
    return (a.get("activityType") or {}).get("typeKey", "")


def is_cycling(a):
    return type_key(a) in CYCLING_TYPES


def is_indoor(a):
    return type_key(a) in INDOOR_TYPES


def _zonen():
    raw = os.environ.get("WB_PENDEL_ZONEN", "").strip()
    zonen = []
    for teil in raw.split(";"):
        try:
            lat, lon = (float(x) for x in teil.split(",")[:2])
            zonen.append((lat, lon))
        except ValueError:
            pass
    return zonen if len(zonen) == 2 else None


def _km(lat1, lon1, lat2, lon2):
    p = math.pi / 180
    a = (math.sin((lat2 - lat1) * p / 2) ** 2 +
         math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lon2 - lon1) * p / 2) ** 2)
    return 12742 * math.asin(math.sqrt(a))


def is_commute(a, zonen, radius_km=0.6):
    if COMMUTE_WORDS.search(a.get("activityName") or ""):
        return True
    if not zonen or is_indoor(a):
        return False
    try:
        s = (a["startLatitude"], a["startLongitude"])
        z = (a["endLatitude"], a["endLongitude"])
    except KeyError:
        return False
    nah = lambda p, q: _km(p[0], p[1], q[0], q[1]) <= radius_km
    A, B = zonen
    return (nah(s, A) and nah(z, B)) or (nah(s, B) and nah(z, A))


def load_bikes():
    cfg = {"serials": {}, "indoor": "rolle", "fallback_outdoor": "gazzetta"}
    if BIKES.exists():
        cfg.update(json.loads(BIKES.read_text()))
    if os.environ.get("WB_RAEDER"):
        cfg.update(json.loads(os.environ["WB_RAEDER"]))
    return cfg


def bike_for(a, devices, cfg, namen=()):
    """Rad einer Fahrt draußen. Gezählt wird, wie viele bekannte Seriennummern je Rad
    in der FIT-Datei stehen. Räder ohne Leistungsmesser scheiden aus, wenn die Fahrt
    Leistungswerte hat. So zieht ein anderes Rad, das zufällig in Funkreichweite
    aufgewacht ist, die Fahrt nicht an sich."""
    if is_indoor(a):
        return cfg["indoor"]
    ohne_pm = set(cfg.get("ohne_leistungsmesser", []))
    stimmen = {}
    for serial in {d["serial"] for d in devices or []}:
        rad = cfg["serials"].get(serial)
        if rad and not (a.get("avgPower") and rad in ohne_pm):
            stimmen[rad] = stimmen.get(rad, 0) + 1
    if stimmen:
        return max(sorted(stimmen), key=lambda r: stimmen[r])
    # Keine bekannte Seriennummer: Radprofil am Edge als zweites Merkmal.
    # Sensoren gehen vor, weil das Profil auch mal falsch gewählt ist.
    profile = {k.lower(): v for k, v in cfg.get("profile", {}).items()}
    for n in namen:
        if n.lower() in profile:
            return profile[n.lower()]
    # Weder Sensor noch bekanntes Profil: das Rad ohne Elektronik (Gazzetta)
    return cfg.get("fallback_outdoor")


# ---------------------------------------------------------------- Auswertung

def local_dt(a):
    s = a.get("startTimeLocal") or a.get("startTimeGMT")
    return datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S")


def r1(x):
    return round(x, 1)


def form_label(tsb):
    # Übliche Lesart der Form (TSB = Fitness − Ermüdung), Schwellen nach TrainingPeaks-Praxis
    if tsb is None:
        return None
    if tsb > 5:
        return "Frisch"
    if tsb >= -10:
        return "Produktiv"
    if tsb >= -30:
        return "Ermüdet"
    return "Überlastet"


def tss(a):
    """TSS einer Fahrt; unplausible Werte (z. B. durch falsche FTP) zählen nicht."""
    t = a.get("trainingStressScore")
    return t if isinstance(t, (int, float)) and 0 < t < 600 else None


def training_load(rides, today):
    """CTL (42 Tage) und ATL (7 Tage) als exponentiell gleitende Mittel der täglichen TSS."""
    tss_day = {}
    for a in rides:
        t = tss(a)
        if t:
            d = local_dt(a).date()
            tss_day[d] = tss_day.get(d, 0.0) + t
    if not tss_day:
        return None
    first = min(tss_day)
    ctl = atl = 0.0
    serie = []
    d = first
    while d <= today:
        tsb = ctl - atl                       # Form am Morgen = Stand des Vortags
        t = tss_day.get(d, 0.0)
        ctl += (t - ctl) / 42
        atl += (t - atl) / 7
        serie.append({"d": d.isoformat(), "ctl": r1(ctl), "atl": r1(atl), "tsb": r1(tsb)})
        d += timedelta(days=1)
    tage_historie = (today - first).days + 1
    heute = serie[-1]
    return {
        "ctl": heute["ctl"], "atl": heute["atl"], "tsb": heute["tsb"],
        "zustand": form_label(heute["tsb"]),
        "eingeschwungen": tage_historie >= 42,   # vorher ist die Fitness systematisch zu niedrig
        "serie_84": serie[-84:],
    }


def summarize(acts, cache, zonen, prev, today=None):
    today = today or date.today()
    rides = [a for a in acts if is_cycling(a)]
    rides.sort(key=lambda a: a.get("beginTimestamp", 0), reverse=True)
    for a in rides:
        a["_pendel"] = is_commute(a, zonen)
        a["_rad"] = cache.get(str(a.get("activityId")))

    km = lambda a: (a.get("distance") or 0) / 1000
    h = lambda a: (a.get("movingDuration") or a.get("duration") or 0) / 3600
    hm = lambda a: a.get("elevationGain") or 0

    # 28 Tage
    grenze = today - timedelta(days=27)
    r28 = [a for a in rides if local_dt(a).date() >= grenze]
    mit_w = [a for a in r28 if a.get("avgPower")]
    w_zeit = sum(h(a) for a in mit_w)
    pend = [a for a in r28 if a["_pendel"]]
    pend_km = sum(km(a) for a in pend)
    rolling = {
        "ride_count": len(r28),
        "distance_km": r1(sum(km(a) for a in r28)),
        "elevation_gain_m": round(sum(hm(a) for a in r28)),
        "moving_time_hours": r1(sum(h(a) for a in r28)),
        "average_watts": round(sum(a["avgPower"] * h(a) for a in mit_w) / w_zeit) if w_zeit else None,
        "tss": round(sum(tss(a) or 0 for a in r28)),
        "commute": {"count": len(pend), "km_rounded": int(round(pend_km / 10) * 10)} if pend else None,
    }

    # Monate (12, ältester zuerst)
    months = {}
    for a in rides:
        ym = local_dt(a).strftime("%Y-%m")
        m = months.setdefault(ym, {"ym": ym, "outdoor_km": 0.0, "indoor_km": 0.0, "commute_km": 0.0,
                                   "elevation_m": 0, "rides": 0, "hours": 0.0, "tss": 0})
        if is_indoor(a):
            m["indoor_km"] += km(a)
        elif a["_pendel"]:
            m["commute_km"] += km(a)
        else:
            m["outdoor_km"] += km(a)
        m["elevation_m"] += round(hm(a)); m["rides"] += 1; m["hours"] += h(a)
        m["tss"] += round(tss(a) or 0)
    monthly = []
    for ym in sorted(months)[-12:]:
        m = months[ym]
        for k in ("outdoor_km", "indoor_km", "hours"):
            m[k] = r1(m[k])
        m["commute_km"] = int(round(m["commute_km"] / 10) * 10)
        monthly.append(m)

    # Jahr
    jahr = [a for a in rides if local_dt(a).year == today.year]
    draussen = [a for a in jahr if not is_indoor(a)]
    laengste = max(draussen, key=km, default=None)
    rad_km = {}
    for a in jahr:
        if a["_rad"]:
            rad_km[a["_rad"]] = rad_km.get(a["_rad"], 0) + km(a)

    # Leistungskurve: Saison aus den geladenen Daten, alle Zeiten mit dem Vorstand verschmolzen
    def kurve(menge):
        k = {}
        for s in CURVE_SECONDS:
            werte = [a.get(f"maxAvgPower_{s}") for a in menge if a.get(f"maxAvgPower_{s}")
                     and not a.get("excludeFromPowerCurveReports")]
            if werte:
                k[str(s)] = max(werte)
        return k
    saison = kurve(jahr)
    alle = dict((prev or {}).get("power_curve", {}).get("all_time", {}))
    for s, w in kurve(rides).items():
        alle[s] = max(w, alle.get(s, 0))

    # letzte Fahrten: Pendeln nie einzeln
    recent = []
    for a in rides:
        if a["_pendel"]:
            continue
        recent.append({
            "id": a.get("activityId"),
            "name": a.get("activityName") or "",
            "date": local_dt(a).strftime("%Y-%m-%d"),
            "distance_km": r1(km(a)),
            "elevation_gain_m": round(hm(a)),
            "moving_time_min": round(h(a) * 60),
            "average_watts": a.get("avgPower"),
            "np": a.get("normPower"),
            "tss": round(tss(a)) if tss(a) else None,
            "indoor": is_indoor(a),
            "rad": a["_rad"],
        })
        if len(recent) == 5:
            break

    # Pendelfahrten bestimmen das Startbild nicht, sonst ließen sich Pendeltage ablesen
    letzte_draussen = next((a for a in rides if not is_indoor(a) and not a["_pendel"] and a["_rad"]), None)
    load = training_load(rides, today)
    if load:
        mit_tss = sum(1 for a in r28 if tss(a))
        load["abdeckung_28"] = {"mit_tss": mit_tss, "fahrten": len(r28)}

    return {
        "source": "garmin",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "rolling_28_days": rolling,
        "monthly": monthly,
        "year": {"jahr": today.year, "distance_km": r1(sum(km(a) for a in jahr)),
                 "rides": len(jahr),
                 "laengste_fahrt": {"distance_km": r1(km(laengste)),
                                    "date": local_dt(laengste).strftime("%Y-%m-%d")} if laengste else None,
                 "rad_km": {k: round(v) for k, v in sorted(rad_km.items())}},
        "load": load,
        "power_curve": {"seconds": CURVE_SECONDS, "season": saison, "all_time": alle},
        "last_bike": {"rad": letzte_draussen["_rad"],
                      "date": local_dt(letzte_draussen).strftime("%Y-%m-%d")} if letzte_draussen else None,
        "recent_activities": recent,
    }


# ---------------------------------------------------------------- Ablauf

def read_json(p, default):
    try:
        return json.loads(p.read_text())
    except (OSError, ValueError):
        return default


def assign_bikes(H, acts, cache, cfg, fit_loader):
    """Ordnet neuen Fahrten ein Rad zu. Drinnen ohne Download, draußen über die FIT-Datei."""
    geladen = 0
    for a in sorted(acts, key=lambda a: a.get("beginTimestamp", 0), reverse=True):
        aid = str(a.get("activityId"))
        if not is_cycling(a) or aid in cache:
            continue
        if is_indoor(a):
            cache[aid] = cfg["indoor"]
            continue
        if geladen >= FIT_PER_RUN:
            continue
        fit = fit_loader(H, a.get("activityId"))
        geladen += 1
        if fit is None:
            continue                       # nächster Lauf versucht es erneut
        devs, namen = fit_scan(fit)
        cache[aid] = bike_for(a, devs, cfg, namen)
    return geladen


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--discover", action="store_true", help="Seriennummern der letzten Fahrten anzeigen")
    ap.add_argument("--anzahl", type=int, default=15, help="mit --discover: so viele Fahrten")
    ap.add_argument("--fixture", help="Aktivitätsliste aus Datei statt API (Test)")
    ap.add_argument("--fit-dir", help="mit --fixture: FIT-Dateien <id>.fit aus diesem Ordner")
    ap.add_argument("--today", help="mit --fixture: Stichtag JJJJ-MM-TT")
    args = ap.parse_args()

    today = date.fromisoformat(args.today) if args.today else date.today()
    since_ms = int(datetime.combine(today - timedelta(days=HISTORY_DAYS),
                                    datetime.min.time()).timestamp() * 1000)

    if args.fixture:
        H = None
        acts = json.loads(Path(args.fixture).read_text())

        def fit_loader(_H, aid):
            p = Path(args.fit_dir or ".") / f"{aid}.fit"
            return p.read_bytes() if p.exists() else None
    else:
        key = os.environ.get("GARMIN_API_KEY") or getpass.getpass("Garmin Personal API Key (verdeckt): ").strip()
        if not key:
            sys.exit("Kein Key angegeben.")
        H = {"Authorization": "Bearer " + get_token(key)}
        acts = fetch_activities(H, since_ms)
        fit_loader = fetch_fit

    if args.discover:
        print("Fahrten draußen, gekoppelte Geräte mit Seriennummer:")
        for a in [x for x in acts if is_cycling(x) and not is_indoor(x)][:args.anzahl]:
            devs, namen = fit_scan(fit_loader(H, a.get("activityId")))
            print(f"\n{local_dt(a):%d.%m.%Y}  {(a.get('distance') or 0)/1000:6.1f} km  "
                  f"{'mit Leistung' if a.get('avgPower') else 'ohne Leistung'}"
                  f"  Profil: {' / '.join(namen) or '–'}")
            gesehen = set()
            for d in devs:
                if (d["serial"], d["manufacturer"]) in gesehen or d["manufacturer"] is None:
                    continue
                gesehen.add((d["serial"], d["manufacturer"]))
                print(f"   Seriennr. {d['serial']:>12}  Hersteller {d['manufacturer']}  "
                      f"Produkt {d['product']}  Typ {d['device_type']}  {d['name'] or ''}")
        print("\nSRAM hat die Herstellernummer 268. Seriennummern je Rad in "
              "scripts/garmin_bikes.json oder im Secret WB_RAEDER eintragen.")
        return

    vorher = read_json(OUT, None)
    if not acts and vorher and (vorher.get("rolling_28_days") or {}).get("ride_count"):
        sys.exit("Garmin liefert keine Aktivitäten, bisher gab es welche. Datei bleibt unverändert.")

    cfg = load_bikes()
    ids = {str(a.get("activityId")) for a in acts}
    cache = {k: v for k, v in read_json(CACHE, {}).items() if k in ids}
    geladen = assign_bikes(H, acts, cache, cfg, fit_loader)
    zonen = _zonen()
    if zonen is None:
        print("::warning::WB_PENDEL_ZONEN fehlt: Pendelfahrten werden nur am Namen erkannt "
              "und können einzeln in der Liste der letzten Fahrten auftauchen.")
    stats = summarize(acts, cache, zonen, vorher, today)

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(stats, ensure_ascii=False, indent=1) + "\n")
    CACHE.write_text(json.dumps(dict(sorted(cache.items())), indent=0) + "\n")
    r = stats["rolling_28_days"]
    print(f"✓ {len(acts)} Aktivitäten gelesen, {geladen} FIT-Dateien neu, "
          f"28 Tage: {r['ride_count']} Fahrten, {r['distance_km']} km. "
          f"Form: {(stats['load'] or {}).get('zustand') or 'noch keine TSS-Werte'}")


if __name__ == "__main__":
    main()
