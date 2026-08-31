# Strava-Sync einrichten (einmalig)

Ziel: Ein GitHub Action läuft wöchentlich (Montag 06:00 UTC) und manuell auf
Knopfdruck, holt deine Strava-Aktivitäten der letzten 28 Tage, schreibt eine
Zusammenfassung nach `data/strava-stats.json`, committet und pusht das –
Netlify deployt danach automatisch neu (bestehende Pipeline).

**Diese Automatisierung ist ungetestet in dem Sinne, dass ich sie hier nicht
mit echten Zugangsdaten ausführen konnte** (meine Sandbox hat keinen
Strava-/GitHub-Zugriff). Python-Syntax und die Workflow-YAML sind lokal
geprüft und valide, aber der erste echte Lauf zeigt, ob z. B. Strava-Feldnamen
noch stimmen. Deshalb unbedingt zuerst über "Run workflow" manuell testen,
bevor du dich auf den wöchentlichen Automatismus verlässt.

## 1. Strava-API-App anlegen

1. Eingeloggt auf strava.com → https://www.strava.com/settings/api
2. Neue Anwendung anlegen. "Website" kann `https://wattbuero.de` sein,
   "Authorization Callback Domain" auf `localhost` setzen (reicht für den
   einmaligen manuellen Autorisierungsschritt unten).
3. Notiere **Client ID** und **Client Secret**.

## 2. Einmalige Autorisierung (OAuth) durchführen

1. Diese URL im Browser öffnen, `CLIENT_ID` durch deine echte Client-ID ersetzen:
   ```
   https://www.strava.com/oauth/authorize?client_id=CLIENT_ID&response_type=code&redirect_uri=http://localhost&approval_prompt=force&scope=read,activity:read
   ```
   Für private Aktivitäten (falls du welche hast und die auch einbeziehen willst) `activity:read` durch `activity:read_all` ersetzen.
2. Bei Strava einloggen, Zugriff autorisieren. Der Browser leitet danach auf
   `http://localhost/?state=&code=XXXXXXXX&scope=...` weiter – die Seite lädt
   nicht (kein Server da), das ist normal. Aus der Adresszeile den Wert von
   `code=` kopieren.
3. Im Terminal (mit dem `code` aus Schritt 2, sowie Client ID/Secret aus Schritt 1):
   ```bash
   curl -X POST https://www.strava.com/oauth/token \
     -d client_id=CLIENT_ID \
     -d client_secret=CLIENT_SECRET \
     -d code=CODE_AUS_SCHRITT_2 \
     -d grant_type=authorization_code
   ```
4. Die Antwort enthält u. a. `"refresh_token": "..."`. Diesen Wert notieren –
   er wird für den dauerhaften Zugriff gebraucht, nicht der `access_token`
   (der läuft nach 6 Std. ab, der Sync-Skript holt sich bei jedem Lauf selbst
   einen frischen).

## 3. Secrets in GitHub hinterlegen

Im Repo (github.com/jaegrobo/wattbuero) → Settings → Secrets and variables →
Actions → "New repository secret", drei Einträge anlegen:

| Name | Wert |
|---|---|
| `STRAVA_CLIENT_ID` | aus Schritt 1 |
| `STRAVA_CLIENT_SECRET` | aus Schritt 1 |
| `STRAVA_REFRESH_TOKEN` | aus Schritt 2.4 |

**Wichtig:** Diese Werte niemals in eine Datei im Repo schreiben (das Repo ist
Public) – nur als Secrets, die verschlüsselt sind und nie im Klartext im Code
oder in Logs auftauchen.

## 4. Testen

1. Im Repo → Tab "Actions" → Workflow "Strava Sync" auswählen → "Run workflow"
   → Branch `main` → "Run workflow".
2. Nach ca. 30–60 Sekunden sollte der Lauf grün sein. Falls rot: Log öffnen,
   meistens liegt es an falsch kopierten Secrets oder einem inzwischen
   abgelaufenen Autorisierungscode aus Schritt 2 (der Code ist nur einmal
   und kurz gültig – ggf. Schritt 2 wiederholen, der Refresh-Token selbst
   verfällt dagegen nicht durch einmaliges Benutzen).
3. Bei Erfolg: neuer Commit "Automatischer Strava-Sync ..." im Repo, Netlify
   deployt automatisch, `data/strava-stats.json` ist aktualisiert.

## Bekannte Stolperfalle

Strava rotiert Refresh-Tokens gelegentlich. Falls ein Sync-Lauf plötzlich mit
`invalid_grant` fehlschlägt, obwohl vorher alles lief: Schritt 2 einmal
wiederholen und das GitHub-Secret `STRAVA_REFRESH_TOKEN` mit dem neuen Wert
überschreiben. Das Sync-Skript gibt einen neuen Refresh-Token im Actions-Log
aus, falls Strava einen ausstellt – Log nach dem Hinweis "HINWEIS: Strava hat
einen neuen Refresh-Token ausgegeben" durchsuchen.

## Nächster Schritt

Die Datenpipeline steht jetzt, aber es gibt noch keine `dashboard.html`, die
`data/strava-stats.json` anzeigt – das besprechen wir als nächstes (Inhalte
und Design des Dashboards).
