---
name: Wattbüro
description: Rennrad-Logbuch mit Ausrüstungstests, Trainingsdaten und Streckenberichten. Bestandsaufnahme vor dem Redesign (Stand 2026-11-01).
colors:
  page-graphite: "#121212"
  surface-graphite: "#1a1a1a"
  hero-black: "#000000"
  hairline: "#2c2c2c"
  hairline-strong: "#444444"
  paper-white: "#f2f2ee"
  muted-grey: "#9a9a9a"
  signal-lime: "#c8ff4d"
  lime-ink: "#2c3d0a"
typography:
  display:
    fontFamily: "Space Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Space Grotesk, -apple-system, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 700
    letterSpacing: "0.03em"
  title:
    fontFamily: "Space Grotesk, -apple-system, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.6
  label:
    fontFamily: "JetBrains Mono, SF Mono, Consolas, monospace"
    fontSize: "0.72rem"
    fontWeight: 500
    letterSpacing: "0.04em"
  data:
    fontFamily: "JetBrains Mono, SF Mono, Consolas, monospace"
    fontSize: "1.5rem"
    fontWeight: 700
rounded:
  tag: "3px"
  card: "4px"
  pill: "999px"
spacing:
  gutter: "1.25rem"
  section: "2.5rem"
  max-width: "960px"
components:
  card:
    backgroundColor: "{colors.surface-graphite}"
    rounded: "{rounded.card}"
    padding: "1.25rem"
  tag:
    backgroundColor: "{colors.signal-lime}"
    textColor: "{colors.lime-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "0.15rem 0.5rem"
  tab-active:
    backgroundColor: "{colors.signal-lime}"
    textColor: "{colors.lime-ink}"
    rounded: "{rounded.tag}"
    padding: "0.35rem 0.7rem"
  stat-gauge:
    backgroundColor: "{colors.hero-black}"
    textColor: "{colors.signal-lime}"
    typography: "{typography.data}"
    rounded: "{rounded.card}"
    padding: "0.7rem 0.9rem"
---

# Design System: Wattbüro (Bestand)

> **Abgelöst:** Das neue Designsystem steht in `design-system/wattbuero/MASTER.md` (E-5 „Weiterentwicklung", 06.11.2026). Diese Datei dokumentiert nur noch den alten Stand.
>
> Bestandsaufnahme vor dem Redesign, per Impeccable `document` im Scan-Modus aus `style.css` extrahiert. Die qualitativen Beschreibungen stammen aus dem bestehenden Stylesheet-Kommentar („Rennlogbuch") und sind noch nicht mit Robert abgestimmt. Ob dieses System behalten oder ersetzt wird, entscheidet E-5.

## Overview

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
