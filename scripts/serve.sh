#!/usr/bin/env bash
# Lokalen Vorschau-Server starten. Funktioniert überall mit Python 3
# (macOS/Linux vorinstalliert), keine weitere Installation nötig.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${1:-8000}"
echo "Wattbüro läuft lokal auf http://localhost:${PORT}  (Strg+C zum Beenden)"
python3 -m http.server "$PORT"
