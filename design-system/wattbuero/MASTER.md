# wattbüro – Designsystem (MASTER)

Stand: 2026-11-06 · Richtung „Weiterentwicklung" (E-5) · Ablauf nach UI UX Pro Max (Master + Seiten-Ausnahmen)

Dieses Dokument ist die verbindliche Quelle für das Redesign. Seiten-Ausnahmen liegen unter `pages/` und gehen bei Konflikten vor. `DESIGN.md` im Projektstamm beschreibt den **alten** Stand („Rennlogbuch") und dient nur als Referenz.

Herkunft der Entscheidungen: Robert, Referenzbilder-Durchgang 02.11., Entscheidungen 05.–06.11.2026. Die automatischen Gesamtvorschläge von UI UX Pro Max (Orange, Serifenschrift, Kundenstimmen) wurden verworfen. Genutzt wurden die Schrift-, Diagramm- und UX-Datenbanken des Skills.

---

## 1. Leitplanken

1. **Dunkel bleibt.** Kein heller Modus.
2. **Zahlen in Mono**, Protokoll-Charakter, **ein** Akzent.
3. **Fotos immer schwarz-weiß bzw. entsättigt**, gedämpft, Streiflicht, angeschnitten.
4. **Wenig Kontrast nur im Bild.** Text ist immer voll lesbar; auf Fotos liegt dahinter ein dunkler Verlauf.
5. **Wenige Kennzahlen, groß inszeniert.** Eine Hauptzahl je Abschnitt, Details aufklappbar.
6. **Kennzahlen zeigen ihre Herleitung**: Kette 01 Training → 02 Zustand → 03 Leistung → 04 Ziel.
7. **Große, angeschnittene Zahlen** nur für echte Werte oder echte Abfolgen, nie als Deko.
8. **Bemaßungsraster** als Markenelement (Messtechnik × Rennrad).
9. **Akzent nur als Linie oder Markierung**, nie als Fläche. Der Farbton folgt dem Rennkalender (entschieden 08.11.2026): Rosa `#f07fa8` bis zum Ende des Giro, Giallo `#f2c230` bis zum Ende der Tour, Rosso `#e8402f` bis zum Ende der Vuelta, danach wieder Rosa. Wechsel am Tag nach der Schlussetappe über `scripts/akzent.js`; ohne JavaScript Giallo. Einzige Fläche in Akzentfarbe ist „buero“ in der Wortmarke. Rosso (4,8:1) nur für Linien und Markierungen, nie für Text unter 18 px. (Vorher: Giallo fest, abgestimmt am 07.11.2026 mit 3:1 gegen Rosa.)
10. **Statisches HTML/CSS/Vanilla-JS**, kein Build-Tool, keine erfundenen Zahlen.

---

## 2. Farben

| Token | Wert | Rolle | Kontrast zu `--ground` |
|---|---|---|---|
| `--ground` | `#0d0d0d` | Seitengrund | – |
| `--panel` | `#131313` | Flächen, Abschnitte | – |
| `--line` | `#2a2a2a` | Haarlinien, Raster, Rahmen | 1,35:1 (nur Grafik) |
| `--line-soft` | `#1e1e1e` | Diagramm-Gitter, ruhige Trennung | – |
| `--ghost` | `#1c1c1c` | angeschnittene Hintergrundzahlen | – (Deko, `aria-hidden`) |
| `--ink` | `#ecebe6` | Text, Hauptzahlen | 16,3:1 |
| `--ink-dim` | `#a3a29c` | Nebentext, Labels, dünne Überschriftenzeile | 7,6:1 |
| `--ink-faint` | `#8a8984` | kleinste Hinweise (≥ 12 px) | 5,6:1 |
| `--marker` | wechselt: Rosa `#f07fa8` · Giallo `#f2c230` · Rosso `#e8402f` (Standard Giallo) | aktive Station, aktueller Wert, Bestmarke, aktive Navigation, Form-Linie | Rosa 7,7:1 · Giallo 11,6:1 · Rosso 4,8:1 |

Regeln:
- Keine weiteren Farben. Zustände (frisch, produktiv, ermüdet, überlastet) werden **in Worten und Form** gezeigt (Text, Position auf einer Skala), nicht über Ampelfarben.
- Der Marker erscheint als 1–2 px Linie, Unterstrich, Skalenmarke oder Ziffernfarbe, nie als gefüllte Fläche oder Button-Hintergrund.
- Text unter 4,5:1 ist verboten. `--line` und `--ghost` nie für Text.

---

## 3. Typografie

Schriften (Google Fonts, OFL), eingebunden per `<link>` im `<head>` jeder Seite:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Science+Gothic:wdth,wght@50..200,100..900&family=IBM+Plex+Sans:wdth,wght@75..100,300..600&family=IBM+Plex+Mono:wght@400;600&display=swap">
```

| Rolle | Schrift | Schnitt | Breite (Desktop → Handy) | Größe | Einsatz |
|---|---|---|---|---|---|
| Display fett | Science Gothic | 800 | 150 % → 118 % | clamp(40px, 7.4vw, 96px) | erste Zeile großer Überschriften |
| Display dünn | Science Gothic | 200 | 150 % → 118 % | wie oben | zweite Zeile, in `--ink-dim` |
| Hauptzahl | Science Gothic | 200 | 130 % → 112 % | clamp(52px, 8vw, 104px) | eine Kennzahl je Abschnitt |
| Hintergrundzahl | Science Gothic | 200 | 130 % | clamp(160px, 30vw, 380px) | angeschnitten, `--ghost`, `aria-hidden` |
| Abschnittstitel | Science Gothic | 700 | 130 % → 112 % | 22–28 px | h2 |
| Fließtext | IBM Plex Sans | 400 | 100 % | 16 px, Zeilenhöhe 1,6, max. 65 Zeichen | Beiträge, Erklärungen |
| Label/Daten | IBM Plex Mono | 400/600 | – | 12–14 px, Versalien +0,08–0,12 em | Labels, Einheiten, Navigation, Kettenstationen, Tabellen |

Regeln:
- **Science Gothic nie unter 18 px.** Darunter übernimmt IBM Plex Mono.
- Alle Zahlen `font-variant-numeric: tabular-nums`. Dezimalkomma deutsch („480,7").
- Überschriften `text-wrap: balance`, `line-height: 1.04` (Platz für Umlaut-Punkte).
- Breite über `font-stretch` steuern, per Media-Query an der Bildschirmbreite (Handy ≤ 600 px).

---

## 4. Abstände, Raster, Formen

- Abstandsskala (Dichte 4/10): 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 px.
- Inhalt max. 1180 px, Seitenrand `max(16px, env(safe-area-inset-left))`.
- Radien: **0–2 px**. Keine Pillen, keine runden Karten, keine Schatten.
- Tiefe nur über Tonstufen (`--ground` → `--panel`) und Haarlinien.

### Bemaßungsraster

Das Markenelement. Es **bemaßt echte Größen**, sonst erscheint es nicht.

| Baustein | Aufbau | Beispiel |
|---|---|---|
| Maßlinie waagerecht | 1 px `--line`, an beiden Enden 10 px Endstrich in `--ink-dim`, Beschriftung mittig in Plex Mono 10 px Versalien, Hintergrund ausgespart | über einem Abschnitt: „28 Tage" |
| Maßlinie senkrecht | wie oben, links am Abschnitt | Höhe eines Abschnitts / Skala |
| Skalenleiste | 1 px Striche alle 24 px am unteren Rand, Endwert rechts | „0 — 480,7 km" |
| Skalenmarke | Marker-Linie auf der Skala | aktueller Wert, Formstand auf der Skala |

Regeln: höchstens **eine** waagerechte und eine senkrechte Maßlinie je Abschnitt. Beschriftung muss eine echte Einheit oder Spanne nennen. Rein dekorativ (`aria-hidden="true"`), die Information steht immer auch im Text.

---

## 5. Bilder

- Schwarz-weiß, Belichtung gedrückt, Schwarztöne leicht angehoben (kein reines Schwarz), Streiflicht von der Seite.
- Hauptbild mit **dunkler Freifläche** (ca. ein Drittel) für Überschrift und Kerninfos.
- Text auf Bildern: dunkler Verlauf von 85 % auf 0 % hinter dem Text (`linear-gradient`), Text in `--ink`.
- Formate: quer 16:9 (Desktop) und hoch 4:5 (Handy) je Motiv, `<picture>` mit WebP + JPEG, max. ~1600 px, < 300 KB.
- Bildwelten: **Ausrüstung** = Rad-Details; **Strecken** = Landschaft, bedeckter Himmel; **Training** = keine Fotos, die Zahlen sind das Bild.
- Keine fremden Herstellerfotos ohne Lizenz.

---

## 6. Komponenten

### Kerninfo-Leiste
2–4 Werte nebeneinander, Wert in Plex Mono 600 bzw. Hauptzahl in Science Gothic, Einheit in `--ink-dim`. Liegt auf oder neben dem Hauptbild. Bei Beiträgen immer die Werte **dieses** Beitrags, nie Zeitraum-Summen.

### Kettenstation (01–04)
Kopfzeile mit Nummer (Plex Mono 12 px) und Titel (Plex Mono 14 px Versalien), 1 px Linie darüber. Aktive Station: Linie und Text im Marker. Je Station eine große, angeschnittene Abschnittsnummer im Hintergrund.

### Herleitung (aufklappbar)
`<details>`/`<summary>` (funktioniert ohne JavaScript, mit Tastatur und auf dem Handy). Summary nennt das Ergebnis in Worten („Form heute: produktiv"). Inhalt zeigt **Eingang → Berechnung → Ergebnis** mit Mini-Verlaufskurve je Eingang. Kein Hover als einziger Weg.

### Seitliche Navigation
Desktop ≥ 1024 px: senkrechte Leiste links mit den vier Stationen, aktive markiert, `position: sticky`. Handy: schmale Fortschrittsleiste oben (4 Segmente). Sprungziele mit `id`, scroll-margin für den Kopf.

### Teaser-Leiste
Am Ende des Startbildes: „Neuester Test · Letzte Strecke · Form heute", je ein Link mit Mono-Label und Titel.

### Beitragsliste
Zeilen statt Karten: Datum (Mono) · Kategorie (Mono, Versalien) · Titel · Kernwert. Hover: Linie unten im Marker.

### Diagramme (Chart.js, bestehend)
- Reihen über **Linienart** (durchgezogen, gestrichelt, gepunktet) und **direkte Beschriftung** am Linienende unterscheiden, nicht über Farbe.
- Gitter `--line-soft`, Achsen-Labels Plex Mono 11 px `--ink-dim`, keine Legenden-Kästchen.
- Balken: `--ink` gefüllt bzw. `--ink-dim`/Schraffur für zweite Reihe.
- Endpunkt der aktuellen Reihe betont (Punkt im Marker).
- Linie für Zeitverläufe, Heatmap mit Wert-Tooltip und Beschriftung für Kalender, Donut höchstens für ≤ 5 Anteile.

### Buttons/Links
Konturiert, 1 px `--ink`, Plex Mono Versalien, eckig, Pfeil „→". Fokus: 2 px Kontur mit 2 px Abstand.

---

## 7. Bewegung

Zurückhaltend (Motion 3/10): Übergänge 150–250 ms, `ease-out`, nur `opacity` und `transform`. Keine Zählwerk-Animationen beim Laden. Alles mit `prefers-reduced-motion: reduce` abschaltbar. Details zu Animationen in D4 (Emil Kowalski).

---

## 8. Nicht verwenden

Glas-Karten und Unschärfe-Effekte · Icons in Kästchen über Überschriften · Karten in Karten · Ring-/Halbkreis-Anzeigen · vollflächige Akzent-Tags · Pillen-Buttons · Schatten und Verläufe außer dem Text-Verlauf auf Fotos · Emojis · Markierungen am Rad · Video-Einstieg · Shop-Elemente · Space Grotesk · zweite Akzentfarbe.

---

## 9. Prüfliste vor Auslieferung

- [ ] Kontrast Text ≥ 4,5:1, auch auf Fotos
- [ ] Science Gothic nicht unter 18 px, Breite auf dem Handy reduziert
- [ ] Kein horizontales Scrollen bei 375, 768, 1024, 1440 px
- [ ] Aufklapp-Bereiche per Tastatur und Tippen bedienbar
- [ ] Bemaßung nur an echten Größen, `aria-hidden`
- [ ] Beitragszahlen gehören zum Beitrag
- [ ] `prefers-reduced-motion` respektiert
- [ ] `python3 scripts/check.py` meldet „Alles sauber"
