# Finaler Marken- und Referenzabgleich

Echte Chromium-Aufnahmen des Produktionsbuilds, keine Mockups. Frische Browserprofile;
vorher und nachher jeweils 390 × 780 CSS-Pixel, Geräteskalierung 1.

| Ansicht | Vorher | Nachher |
| --- | --- | --- |
| Hell | [Vorher](before-light.png) | [Nachher](after-light-390x780.png) |
| Dunkel | [Vorher](before-dark.png) | [Nachher](after-dark-390x780.png) |

Zusätzlich: [kurzes iPhone Hell](after-light-390x664.png),
[kurzes iPhone Dunkel](after-dark-390x664.png),
[Desktop Hell](after-light-desktop.png), [Desktop Dunkel](after-dark-desktop.png).

## Sichtbarer Abgleich mit der gelieferten Referenz

- Originalmarke: illustrierter Terrakottaofen, Flamme, unveränderte Wortmarke und Signatur;
  transparenter Hintergrund, aufgehellte Schrift in Dunkel. Exportartefakte im Alpha-Kanal entfernt.
- Pizza, Tomaten und Basilikum angeschnitten oben rechts, hinter den Bedienelementen.
  Transparente lokale WebP-Datei; sie nimmt keine Klicks entgegen.
- Elegant kursive Begrüßung, kompakter und leichterer Titel, kleiner Beschreibungstext und Trikolore.
- Warme cremefarbene Karten, feine Rahmen, subtile Schatten; drei gleichmäßige Zahlenspalten.
- Grüner Button mit dezentem Verlauf; zwei nebeneinanderliegende Bildkarten und vier Schnellzugriffe.
- Ruhige Navigation mit grüner aktiver Beschriftung ohne großen aktiven Hintergrund.

Die Browseraufnahmen wurden in beiden Modi tatsächlich geöffnet und geprüft. Logo, Header,
Typografie, Bildkomposition, Kartenhöhen, Abstände und Navigation wurden mit der gelieferten
Referenz verglichen. Auf 390 × 664 und 390 × 780 bleiben alle vier Schnellzugriffe über dem Dock.
Gleiche Geometrie in Hell/Dunkel; Touchziele mindestens 44 × 44 Pixel.

## Prüfungen

`browser-report.json` enthält Messwerte für 320, 390, 430 und 1280 Pixel Breite.
Der Browsercheck prüft zusätzlich alle Routen auf horizontalen Überlauf, erhaltene ungültige
Rechnereingaben und Zeitplanentwürfe beim Theme-Wechsel sowie den tatsächlichen nächsten
Zeitplanschritt. Offline-Neustart lädt Logo, Food-Bilder und Header-Dekoration aus dem PWA-Cache.

Reproduktion: `npm run build`, `npm run preview -- --host 127.0.0.1 --port 4175`,
anschließend `FORNO_VISUAL_OUTPUT=docs/visual-brand NODE_PATH=<separates Playwright-Verzeichnis>/node_modules node scripts/check-compact-ui.cjs`.
Playwright ist nur externes Prüfwerkzeug, keine neue App-Abhängigkeit.

## Bewusste verbleibende Unterschiede

- Food-Fotos sind lokale, für FORNO erzeugte Motive; keine pixelgleichen Ausschnitte des Mockups.
- Die kursive Begrüßung nutzt Georgia bzw. eine lokale System-Serifenschrift. Die genaue
  Mockup-Schrift wurde nicht geliefert; die UI verwendet weiterhin lokales Inter.
- Funktionierende Einstellungen und Hell/Dunkel/System ersetzen die im Mockup gezeigten
  Glocken-/Menüaktionen. Ehrliche Vorbereitungskennzeichen bleiben sichtbar.
- Screenshot-Tests verwenden Chromium mit iPhone-ähnlichen Viewports, kein physisches iPhone/Safari.
- Ein bestehender gespeicherter Zeitplan darf die Zeitplankarte für seinen nächsten Schritt vergrößern.

Kein Deployment und kein Merge. Berechnungskern, Zeitplanlogik, Datenmodell, Speicher-Keys,
App-ID und Theme-Bootstrap bleiben unverändert. Bereits installierte iPhone-Icons können nach
späterer Veröffentlichung eine erneute Installation benötigen, da iOS Homescreen-Icons zwischenspeichert.
