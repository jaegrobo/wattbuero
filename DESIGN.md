---
name: Wattbüro
description: Rennrad-Logbuch mit Trainingsdaten, Ausrüstung und Streckenberichten. Designsystem „Weiterentwicklung" (Stand 2026-11-07); Regeln im Detail in design-system/wattbuero/MASTER.md.
colors:
  ground: "#0d0d0d"
  panel: "#131313"
  line: "#2a2a2a"
  line-soft: "#1e1e1e"
  ghost: "#1c1c1c"
  ink: "#ecebe6"
  ink-dim: "#a3a29c"
  ink-faint: "#8a8984"
  marker: "#f2c230"
  ink-on-ink: "#0d0d0d"
typography:
  display:
    fontFamily: "Science Gothic, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(40px, 7.4vw, 104px)"
    fontWeight: 800
  number:
    fontFamily: "Science Gothic, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(52px, 8vw, 104px)"
    fontWeight: 200
  headline:
    fontFamily: "Science Gothic, Arial Narrow, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
  hero-title:
    fontFamily: "Science Gothic, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(30px, 6vw, 84px)"
    fontWeight: 800
  page-title:
    fontFamily: "Science Gothic, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(28px, 4vw, 54px)"
    fontWeight: 800
  key-figure:
    fontFamily: "Science Gothic, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(40px, 5.4vw, 68px)"
    fontWeight: 200
  lead:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "18px"
    lineHeight: 1.6
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "16px"
    lineHeight: 1.6
  dimension:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "11px"
    letterSpacing: "0.12em"
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    letterSpacing: "0.08em"
  data:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "20px"
    fontWeight: 600
rounded:
  none: "0px"
  small: "2px"
spacing:
  scale: "4 8 12 16 24 32 48 64 96"
  max-width: "1180px"
---

# Design System: Wattbüro

> Die Werte oben gelten seit dem Redesign (Branch `redesign`). Die verbindlichen Regeln stehen in `design-system/wattbuero/MASTER.md`, die Seiten-Ausnahmen in `design-system/wattbuero/pages/`. Der Text unten beschreibt noch den alten Stand „Rennlogbuch" und bleibt nur als Archiv stehen.

## Archiv: alter Stand „Rennlogbuch"

### Overview

Arbeitstitel „Rennlogbuch": dunkle, kontrastreiche Oberfläche, ein einziger Signalakzent, alle Zahlen in Monospace. Die Seite wirkt wie ein technisches Protokoll, nicht wie ein Magazin. Headlines stehen in Versalien, Labels sind klein, gesperrt und monospaced.

## Colors

### Primary
- **Signal-Lime** (`#c8ff4d`): Akzent für aktive Navigation, Tags, aktive Tabs, alle Kennzahlen und die Unterstreichung von Abschnittstiteln. Text auf Lime-Flächen in **Lime-Ink** (`#2c3d0a`).

### Neutral
- **Seiten-Graphit** (`#121212`) als Grund, **Flächen-Graphit** (`#1a1a1a`) für Karten und Panels, **Schwarz** (`#000`) für Header, Hero und Kennzahl-Kacheln.
- **Haarlinie** (`#2c2c2c`) und **Haarlinie stark** (`#444`) für Rahmen.
- **Papierweiß** (`#f2f2ee`) für Text, **Mittelgrau** (`#9a9a9a`) für Nebentext und Labels.

### Named Rules
- **Ein-Akzent-Regel:** Außer Lime gibt es keine Markenfarbe. Weitere Farben tauchen nur im Dashboard für Sportarten auf (Gravel `#4fa8a0`, Virtual `#7c7fd1`, MTB `#e0a458`, E-Bike `#d17a7a`).

## Typography

- **Display/Headlines:** Space Grotesk 700, Versalien, leichte Sperrung.
- **Fließtext:** System-Schriftstapel, 1rem, Zeilenhöhe 1,6.
- **Labels und Daten:** JetBrains Mono, Labels 0,68–0,82rem in Versalien, Kennzahlen 1,3–1,5rem fett in Lime.

### Hierarchy
Die Größenschritte sind flach: Seiten-h1 auf Kategorieseiten liegt bei rund 16px und ist damit kaum größer als der Fließtext (Detektor: „flat type hierarchy"). Nur die Startseiten-h1 (2rem) setzt sich deutlich ab.

## Layout

Eine Spalte, maximal 960px breit, Seitenrand 1,25rem. Abschnitte im Abstand von 2,5rem. Beitragskarten im Auto-Grid ab 260px Spaltenbreite. Das Dashboard ist ein Panel innerhalb dieser Spalte; die Kennzahl-Kacheln umbrechen ab 130px.

## Elevation & Depth

Flach. Tiefe entsteht nur durch Tonstufen (Schwarz → Graphit → Flächen-Graphit) und 1px-Haarlinien. Keine Schatten.

## Shapes

Kleine Radien: 3px für Tags und Tabs, 4px für Karten, Panels und Kacheln. Einzige Ausnahme sind die Zeitraum-Schalter im Dashboard als Pillen (999px).

## Components

### Cards / Containers
Flächen-Graphit mit Haarlinie und 4px Radius. Hover: Rahmen wird Lime, Karte hebt sich um 2px.

### Chips
Kategorie-Tags: Lime-Fläche, Lime-Ink-Text, Mono-Versalien, 3px Radius.

### Navigation
Logo „Watt**büro**" mit Lime-Silbe, Navigation in kleinen gesperrten Versalien, aktiver Punkt in Lime. Auf dem Handy bricht die Navigation in zwei Zeilen um, ohne Menü.

### Trainingsdashboard (Signature Component)
Panel mit Titel, Tab-Leiste (Volumen, Sportart, Cadence, Bestleistungen), fünf Kennzahl-Kacheln (schwarz, Mono-Werte in Lime), Zeitraum-Pillen und einem Chart.js-Diagramm von 240px Höhe. Daten aus `data/strava-stats.json`.

## Do's and Don'ts

### Do:
- Zahlen immer in JetBrains Mono setzen.
- Lime sparsam und nur für Status, Daten und Navigation einsetzen.

### Don't:
- Keine zweite Markenfarbe einführen.
- Keine Schatten oder Verläufe.
