# Wattbüro – Setup-Anleitung

## Was das hier ist

Eine handgeschriebene statische Website (reines HTML/CSS, kein Generator, kein Server, keine Abhängigkeiten). Bewusst der einfachste, risikoärmste Weg: fertige Dateien, kein Build-Schritt.

```
index.html                Startseite
ausruestung.html           Kategorie: Ausrüstung
training.html              Kategorie: Training
strecken.html              Kategorie: Strecken
ueber.html                  Über-Seite (Platzhaltertext ersetzen!)
style.css                   Gemeinsames Stylesheet
posts/                      Einzelne Beiträge
templates/_post-vorlage.html    Vorlage zum Duplizieren für neue Beiträge
scripts/serve.sh             Lokaler Vorschau-Server
scripts/check.py             Prüft Tag-Struktur + interne Links
netlify.toml                 Redirect-Konfiguration für die 3 Zweit-Domains
```

Ein lokales Git-Repository mit erstem Commit ist bereits enthalten (`git log` zeigt den Stand). Wenn du das Zip entpackst, hast du sofort eine Versionshistorie zum Weiterarbeiten – kein `git init` mehr nötig.

## Zwei Arbeitsumgebungen, eine Quelle der Wahrheit

Du hast zwei Orte, an denen du an der Seite arbeiten kannst: hier in Cowork, oder lokal über Claude Code am Terminal. Wichtig, um Chaos zu vermeiden: **behandle nicht beide als unabhängige Kopien.** Wenn du abwechselnd hier und lokal Änderungen machst, ohne dazwischen zu synchronisieren, laufen die Stände auseinander und du bekommst Merge-Konflikte. Die Lösung: sobald du ein GitHub-Repo angelegt hast (siehe unten), ist **das GitHub-Repo die alleinige Quelle der Wahrheit** – beide Umgebungen pullen von dort und pushen dorthin, keine arbeitet isoliert über mehrere Sitzungen hinweg.

**Technische Einschränkung dieser Cowork-Sandbox:** Sie hat keinen Zugriff auf github.com oder api.netlify.com direkt (von der Umgebung blockiert, geprüft). Ich kann hier also nicht selbst `git push` machen oder direkt mit der Netlify-API sprechen – außer über einen verbundenen Connector (siehe Schritt 3). Von deinem lokalen Rechner über Claude Code aus hast du dagegen normalen Internetzugriff, dort funktioniert alles direkt.

## Schritt 1: Lokal testen

Funktioniert identisch hier in Cowork (ich kann es für dich ausführen und prüfen) und auf deinem Rechner über Claude Code:

```bash
bash scripts/serve.sh        # startet Server auf http://localhost:8000
python3 scripts/check.py     # prüft HTML-Struktur und interne Links, ohne Server nötig
```

Kein npm, kein Hugo, keine Installation – nur Python 3, das auf macOS/Linux vorinstalliert ist. Ich habe beide Skripte gerade in der Sandbox getestet: Server startet, alle Seiten liefern HTTP 200, `check.py` meldet keine Fehler.

## Schritt 2: GitHub-Repository als gemeinsame Quelle anlegen

1. Auf github.com ein neues Repository anlegen, z. B. `wattbuero`.
2. Lokal (über Claude Code auf deinem Rechner, da von dort aus Netzwerkzugriff besteht):
   ```bash
   cd wattbuero-site
   git remote add origin <deine-repo-url>
   git push -u origin master
   ```
3. Ab jetzt: in Cowork erarbeitete Änderungen bekommst du als Zip von mir, entpackst sie lokal in denselben Ordner, committest und pushst. Umgekehrt: lokale Änderungen einfach pushen, dann sag mir Bescheid, damit ich hier vom aktuellen Stand ausgehe.

## Schritt 3: Direkt publizieren

Zwei Wege, je nachdem wie viel Automatisierung du willst:

**Weg A – über Netlify, automatisch bei jedem Push (empfohlen):**
1. Auf netlify.com registrieren, "Add new site → Import an existing project", GitHub-Repo verbinden.
2. Kein Build-Kommando nötig, Publish-Verzeichnis `/` (bereits in `netlify.toml` hinterlegt).
3. Jeder `git push` auf das Repo deployed automatisch neu – egal ob der Push von deinem Rechner oder (nach Zip-Import) von dir nach einer Cowork-Sitzung kommt.

**Weg B – Netlify direkt aus dieser Cowork-Sitzung heraus:**
Es gibt einen Netlify-Connector, den ich gerade vorgeschlagen habe (Connect-Button oben in der Konversation). Verbindest du ihn, kann ich Deployments direkt aus dem Chat auslösen, ohne den Umweg über Zip-Export und lokalen Push – dann wäre Cowork nicht mehr nur "hier testen", sondern auch "hier publizieren". Das ist deine Entscheidung, nicht meine: es bedeutet, dass ich Schreibzugriff auf dein Netlify-Konto bekomme. Für GitHub selbst gibt es aktuell keinen entsprechenden Connector in der Registry – Versionierung/Push bleibt also so oder so Aufgabe der lokalen Claude-Code-Umgebung.

## Netlify-Projekt (bereits angelegt)

Über den verbundenen Netlify-Connector habe ich ein leeres Projekt angelegt:
- Name: `wattbuero`, Site-ID: `6d79bfd1-cf80-4c30-9830-da3eaf40f635`
- Verwaltung: https://app.netlify.com/projects/wattbuero
- Vorläufige URL (noch ohne Inhalt): http://wattbuero.netlify.app

**Wichtig, bevor es öffentlich live geht:** Bei der Anlage stand `requiresSSOTeamLogin: true` für alle Projekte des Teams – das kann bedeuten, dass Zugriff auf Team-Login beschränkt ist. Vor dem Livegang in den Projekteinstellungen prüfen und ggf. deaktivieren, sonst ist die Seite für Besucher nicht erreichbar.

Der Connector kann Projekte anlegen/verwalten (Name, Env-Variablen, Formulare, Zugriffskontrolle) und Deploy-Status abfragen bzw. Redeploys eines bereits verknüpften Projekts auslösen – er kann aber keine Dateien/Ordner direkt hochladen. Für den eigentlichen Inhalt bleiben zwei Wege:

1. **Sofort live testen (ohne GitHub):** Auf https://app.netlify.com/projects/wattbuero/deploys den entpackten `wattbuero-site`-Ordner per Drag & Drop hochladen – manueller Deploy, in Sekunden live.
2. **Dauerhafte Pipeline (empfohlen):** GitHub-Repo anlegen und pushen (siehe Schritt 2 oben), danach in den Projekteinstellungen unter "Build & deploy" das Repo verknüpfen ("Link repository") – da dein Netlify-Konto schon mit GitHub verbunden ist, nur wenige Klicks. Danach deployt Netlify bei jedem Push automatisch, und ich kann von hier aus über den Connector Redeploys auslösen und den Status prüfen.

## Domain-Anbindung (wattbuero.de + Redirects)

1. In Netlify unter "Domain settings" → "Add custom domain" → `wattbuero.de`.
2. Bei deinem Registrar die DNS-Einträge setzen, die Netlify dir dabei konkret anzeigt (A-Record bzw. ALIAS/ANAME für die nackte Domain, CNAME für www) – nimm die Live-Werte aus dem Netlify-UI, nicht diese Anleitung als exakte Quelle, das kann sich ändern.
3. wattbuero.com / .global / .store zusätzlich als Domain-Alias hinzufügen; die 301-Redirects auf wattbuero.de sind in `netlify.toml` bereits vorbereitet.

## Rechtliches (vor dem Livegang prüfen)

- **Impressumspflicht** nach § 5 TMG greift i. d. R. auch bei nebenberuflichen Seiten mit Affiliate-Links – noch nicht enthalten, ergänzen.
- **Affiliate-Kennzeichnung** ist in den Post-Vorlagen vorbereitet, muss pro Beitrag aktiv befüllt werden.
- **[Prüfhinweis]:** Rechtsstand (TMG/UWG) kann sich seit meinem Wissensstand geändert haben – vor Livegang kurz gegenchecken, gerade weil du beruflich in einem regulierten Umfeld unterwegs bist.

## Nächster Schritt

Aufbau/Design (Dashboard, weitere Infoseiten zu Strecken etc.) bewusst noch nicht begonnen – laut Absprache erst, wenn die Test-/Publish-Pipeline steht.
