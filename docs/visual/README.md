# Visuelle Abnahme — kompakte Fresh-Food-Oberfläche

Die PNG-Dateien sind echte Aufnahmen der laufenden Produktionsvorschau in Chromium, keine Montagen. Viewports werden in CSS-Pixeln angegeben, DPR 1. Sie enthalten keine Safari-Adressleiste, echte Dynamic Island oder physische iPhone-Systemleisten. Hell und Dunkel wurden separat gestartet und geprüft.

## Vorher / Nachher (gleicher Viewport: 390 × 780)

| | Hell | Dunkel |
| --- | --- | --- |
| Vorher | [Screenshot](before-light-390x780.png) | [Screenshot](before-dark-390x780.png) |
| Nachher | [Screenshot](after-light-390x780.png) | [Screenshot](after-dark-390x780.png) |
| Kürzere Ansicht, 390 × 664 | [Screenshot](after-light-390x664.png) | [Screenshot](after-dark-390x664.png) |
| Desktop, 1280 × 900 | [Screenshot](after-light-desktop.png) | [Screenshot](after-dark-desktop.png) |

Mit den Standardwerten 8 Pizzen, 280 g, 66 % und ohne gespeicherten Zeitplan:

| Element | Vorher, 390 × 780 | Nachher, 390 × 780 |
| --- | ---: | ---: |
| Headerhöhe | 88 px | 68 px |
| Begrüßungsblock | 157 px | 94 px |
| Teigkarte | 296 px | 226 px |
| Hauptkarten | 273 px | 147 px |
| Unterkante Schnellzugriffe | 1078 px | 658 px |
| Höhe Navigation ohne OS-Safe-Area | 73 px | 57 px |

Bei 390 × 664 werden die Hauptkarten auf ca. 129 px und die Teigkarte auf ca. 206 px reduziert. Die Schnellzugriffe enden bei 600 px, die Navigation beginnt bei 607 px: Alle drei Bereiche sind vollständig sichtbar. Die Messwerte bei 390 × 780 sind für Hell und Dunkel identisch.

## Abgleich mit dem Soll

- Keine dunkle Logokachel mehr. Das vorhandene transparente Ofen-Logo wird wiederverwendet; ausschließlich seine vorhandenen Schriftformen erhalten per CSS einen passenden Kontrast. Bilddatei, Ofenmotiv und Markenform bleiben erhalten.
- Kleinere, leicht kursive Begrüßung, kompakte Überschrift, kurzer Beschreibungssatz und geringere vertikale Abstände.
- Kompakte Teigkarte mit drei Zahlenspalten, direkt anschließender Mehlsorte und 44-px-Hauptaktion. Der Bearbeiten-Pfeil behält eine zugängliche Beschriftung und 44 × 44 px Zielfläche.
- Zwei Foto-Karten nebeneinander, vier kleine Schnellzugriffe darunter. Vorhandene lokale Food-Fotos und Offline-Abdeckung bleiben bestehen.
- Ruhigere Theme- und Navigations-Icons. Alle geprüften Header-/Navigations-/Hauptaktionsziele bleiben mindestens 44 × 44 px groß. Bestehende Safe-Area-Regeln bleiben aktiv.
- Ein gespeicherter Zeitplan zeigt weiterhin seinen nächsten Schritt. Nicht verfügbare Module bleiben ausdrücklich als vorbereitet gekennzeichnet.

## Browser- und Funktionstests

[Maschinenlesbarer Bericht](browser-report.json): Chromium 155, 10 Viewport-/Theme-Kombinationen (320 × 700, 390 × 664, 390 × 780, 430 × 932, 1280 × 900). Kein horizontaler Überlauf auf Home; zusätzliche Routenkontrolle bei 390 × 780 in beiden Themes für Rechner, Zeitstrahl, Pizzaabend, Rezepte, Einstellungen, Reife-Monitor und Journal. Theme-Wechsel erhält unvollständige Rechner-Eingaben und ungespeicherte Zeitplanentwürfe. Gespeicherte nächste Schritte bleiben sichtbar.

Zusätzlich: 68 relevante Tests, Typecheck und Produktionsbuild erfolgreich. Berechnungskern, Speicheradapter, bestehende IndexedDB-Schlüssel, Theme-Logik und Original-Logo-Datei sind unverändert.

Reproduktion mit separat installiertem Playwright (keine neue App-Abhängigkeit): Produktionsvorschau auf Port 4175 starten und `scripts/check-compact-ui.cjs` ausführen. Optional `FORNO_PREVIEW_URL`, `FORNO_BROWSER_PATH` und `FORNO_VISUAL_OUTPUT` setzen. Die Vorher-Aufnahmen wurden vor der Codeänderung aufgenommen und werden vom Nachher-Skript nicht überschrieben.

## Verbleibende Abweichungen

- Das freigegebene fotografische Holzofen-/Brush-Logo wird bewahrt; es wird nicht durch das andere flache Ofensymbol aus der Referenz ersetzt.
- Vorhandene Hell/Dunkel/System- und Einstellungsfunktionen bleiben statt der nicht implementierten Glocken-/Menüelemente der Referenz erhalten. Keine erfundenen Benachrichtigungen.
- Keine zusätzliche dekorative Pizza am Header-Rand: Die vorhandenen Bilder konzentrieren sich auf die Hauptkarten.
- Vorbereitungshinweise und echte nächste Zeitplandaten benötigen teils mehr Platz als die rein statische Referenz. Besonders lange eigene Mehlbezeichnungen und zusätzliche Daten können weiterhin Scrollen erfordern.
- Echte Browserprüfung mit mobilen Viewports, keine physische Safari-/iPhone-Abnahme. OS-Browserleisten, Dynamic Island und installierte PWA-Statusleisten sind nicht in den Aufnahmen nachgestellt.
