# Thermomix-Chargen

Im Teigrechner erscheint bei gültigen Eingaben automatisch die Chargenübersicht. Keine zusätzliche
Einstellung und kein Berechnen-Button. Sie verwendet die vorhandenen ungerundeten Zutatenmengen:

- Anzahl = aufgerundete Gesamtmehlmenge / 400 g (`ceil(Mehl / 400)`).
- Mehl je Charge = Gesamtmehl / Anzahl; Wasser je Charge = Gesamtwasser / Anzahl.
- Alle Chargen sind gleich groß; keine überschreitet 400 g Mehl. Die Hydration bleibt gleich.
- Bei genau 400 g genügt eine Charge, bei 400,01 g werden zwei benötigt.
- Anzeige auf 0,01 g gerundet, die Zutatenberechnung wird nicht verändert.
- Mit den Standardwerten (8 × 280 g, 66 % Hydration) entstehen **4 Chargen**.

## Ablauf

1. **Autolyse: Mehl + Wasser.** Die angegebenen Mengen je Charge in den Thermomix geben,
   **30 Sekunden Teigstufe**, anschließend herausnehmen. Für jede Charge wiederholen.
2. **Von Hand fertigstellen.** Die angezeigten **Gesamtmengen** Salz und Trockenhefe per Hand
   einarbeiten und die Teige mehrerer Chargen zusammenführen. Salz/Hefe nicht in jede Charge
   nochmals als Gesamtmenge geben. Bei nur einer Charge entfällt das Zusammenführen.

Keine zusätzliche Ruhezeit wird erfunden. Die 30 Sekunden sind die Maschinenlaufzeit **je Charge**,
nicht die gesamte Vorbereitung. Für Handarbeit und Zusammenführen bleibt die Vorbereitungsdauer
im Zeitplan separat einstellbar; sie wird nicht automatisch durch Maschinenlaufzeit ersetzt.

Ungültige Rechnereingaben blenden die Chargenberechnung aus. Große Rezepturen zeigen nur Anzahl
und Mengen je Charge statt einer langen Liste. Keine neuen Speicher-Keys, keine Änderung an
Rezepturformel, Zeitplanberechnung, gespeicherten Daten oder P3. Die vorhandene Offline-PWA und
beide Themes werden verwendet.

## Prüfung

`npm run check` erfolgreich: **137 Tests in 11 Dateien**, Typecheck und Produktionsbuild.
Gezielter Chromium-Test: 390/1280 px, Hell/Dunkel, sofortige Umstellung von vier Chargen auf eine,
kein horizontaler Überlauf, nur Teichner für neue Zeitpläne sowie Wiederherstellung/Navigation
offline. Altpläne bleiben lesbar; Umstellung weiterhin erst durch Klick und Speichern.
Kein physischer iPhone-/Thermomix-Gerätetest. Keine automatische Veröffentlichung.
