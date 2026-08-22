# Wattbüro – Setup-Anleitung

## Was das hier ist

Eine handgeschriebene statische Website (reines HTML/CSS, kein Generator, kein Server, keine Abhängigkeiten). Ich konnte in meiner Sandbox keinen Hugo/Node-Build testen (kein Internetzugriff für Paketinstallation) – deshalb bewusst der einfachste, risikoärmste Weg: fertige Dateien, kein Build-Schritt, kein Wartungsaufwand.

Struktur:
```
index.html              Startseite
ausruestung.html         Kategorie: Ausrüstung
training.html            Kategorie: Training
strecken.html            Kategorie: Strecken
ueber.html                Über-Seite (Platzhaltertext ersetzen!)
style.css                 Gemeinsames Stylesheet
posts/                    Einzelne Beiträge
templates/_post-vorlage.html   Vorlage zum Duplizieren für neue Beiträge
netlify.toml               Redirect-Konfiguration für die 3 Zweit-Domains
```

## Schritt 1: GitHub-Repository anlegen

1. Auf github.com ein neues, privates oder öffentliches Repository anlegen, z. B. `wattbuero`.
2. Alle Dateien aus diesem Ordner in das Repository hochladen (per Drag & Drop im Browser über "Add file → Upload files", kein Git-Client nötig).

## Schritt 2: Mit Netlify verbinden

1. Auf netlify.com kostenlos registrieren, "Add new site → Import an existing project" wählen, GitHub-Repo verbinden.
2. Build-Einstellungen: **kein Build-Kommando**, Publish-Verzeichnis `/` (Root) – ist bereits in `netlify.toml` hinterlegt.
3. Deploy auslösen – die Seite ist danach unter einer `*.netlify.app`-Adresse erreichbar (zum Testen).

## Schritt 3: Domain wattbuero.de anbinden

1. In Netlify unter "Domain settings" → "Add custom domain" → `wattbuero.de` eintragen.
2. Bei deinem Domain-Registrar (wo du wattbuero.de registriert hast) die DNS-Einträge setzen, die Netlify dir nach Schritt 1 konkret anzeigt. Stand meines Wissens typischerweise:
   - Für die nackte Domain (`wattbuero.de`): A-Record auf die von Netlify angezeigte IP, oder – falls dein Registrar das unterstützt – ALIAS/ANAME-Record auf die von Netlify angegebene Zieladresse.
   - Für `www.wattbuero.de`: CNAME auf die von Netlify angezeigte `*.netlify.app`-Adresse.
   - **[Wahrscheinlich, bitte gegenchecken]:** Diese Records können sich ändern – nimm die Werte, die dir Netlify beim Einrichten live anzeigt, nicht diese Anleitung als exakte Quelle.
3. Netlify aktiviert automatisch ein kostenloses HTTPS-Zertifikat, sobald die DNS-Einträge propagiert sind (kann bis zu 24 Std. dauern).

## Schritt 4: wattbuero.com / .global / .store als Redirects einrichten

Diese drei Domains dienen nur dem Markenschutz und leiten auf wattbuero.de um (bereits in `netlify.toml` konfiguriert):

1. In Netlify unter "Domain settings" alle drei zusätzlich als "Domain alias" zur selben Site hinzufügen.
2. Bei jedem der drei Registrare dieselben DNS-Einträge setzen wie in Schritt 3 (auf dieselbe Netlify-Site zeigend).
3. Die Redirects in `netlify.toml` sorgen dafür, dass Besucher automatisch auf wattbuero.de landen (301 = dauerhafte Weiterleitung, gut für SEO, kein Duplicate-Content-Problem).

## Schritt 5: Neuen Beitrag anlegen (ohne lokale Tools)

1. Auf GitHub.com im Ordner `posts/` auf "Add file → Create new file" klicken.
2. Inhalt von `templates/_post-vorlage.html` hineinkopieren, Dateinamen vergeben (z. B. `posts/ausruestung-zweiter-test.html`).
3. Alle `[Platzhalter]`-Texte ersetzen.
4. In der passenden Kategorie-Seite (`ausruestung.html` etc.) eine neue Karte im `card-grid` ergänzen, die auf den neuen Beitrag verlinkt.
5. Commit klicken – Netlify deployt automatisch neu, meist innerhalb 1 Minute.

Kein Code-Editor, kein Terminal, kein Build nötig – nur Text im Browser ersetzen.

## Rechtliches (vor dem Livegang prüfen)

- **Impressumspflicht:** Auch private/nebenberufliche Websites mit geschäftlichem Zweck (Affiliate-Links) unterliegen in Deutschland i. d. R. der Impressumspflicht nach § 5 TMG – noch nicht auf dieser Seite enthalten, unbedingt ergänzen.
- **Affiliate-Kennzeichnung:** "Werbung"-Hinweis ist in den Beitrags-Vorlagen vorbereitet, muss aber pro Beitrag aktiv befüllt werden, sobald echte Affiliate-Links eingebaut sind.
- **[Prüfhinweis]:** Der genaue Rechtsstand (TMG/UWG, Kennzeichnungspflichten) kann sich seit meinem Wissensstand geändert haben – vor dem Livegang kurz mit aktueller Quelle oder einem Anwalt/einer Anwältin für IT-/Wettbewerbsrecht abgleichen, insbesondere weil du auch beruflich in einem regulierten Umfeld unterwegs bist und dir Sorgfalt hier wahrscheinlich wichtig ist.
