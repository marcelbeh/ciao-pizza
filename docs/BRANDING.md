# FORNO. — Modern Italian Premium

Das Design verwendet ausschließlich Inter, eine reduzierte Wortmarke und typografische F.-Icons. Alte Bildmotive, Sprüche, Industrial-Schriften, Verläufe, Schatten und ungenutzte Stilvarianten wurden entfernt. Es gibt keine zusätzliche UI-Bibliothek oder neue App-Abhängigkeit.

## Gemeinsame Tokens

`src/styles.css` definiert die sieben Farben zentral: Hintergrund `#151A1B`, Karten `#22292A`, erhöhte Flächen `#2C3435`, Text `#F5F1E9`, Sekundärtext `#A8B0AC`, Terrakotta `#D97952`, Rahmen `#394140`. Fehler werden durch Text, ARIA-Zustand und Terrakotta hervorgehoben, ohne eine weitere Farbpalette einzuführen.

Abstände folgen einem 8-Pixel-Raster. Karten verwenden 16 px Radius und 24 px Innenabstand (16 px bei sehr kleinen Displays). Inter mit tabellarischen Ziffern stellt Eingaben und Mengen dar. Touch-Ziele sind mindestens 48 px hoch. Safe-Areas, sichtbare Fokuszustände und reduzierte Bewegung bleiben berücksichtigt.

Alle vorhandenen Seiten nutzen `PageHeading`, dieselbe Karte, Buttons und Eingabefelder. Auf größeren Displays stehen Rezeptur und Zutaten nebeneinander. Die einzige Hauptnavigation ist die dezente untere Navigation; das Wortzeichen führt zur Übersicht.

## Vorhandene Daten, unveränderte Funktionen

Das Dashboard zeigt die bereits geladenen Teigeinstellungen und einen vorhandenen Pizzaabend. Der Rechner bleibt unverändert bedienbar, einschließlich Validierung, Hefegenauigkeit und automatischer Speicherung. Zeitplan und Pizzaabend bleiben vorbereitete Seiten; ohne Zeitplandaten wird kein nächster Zeitpunkt berechnet oder vorgetäuscht. Keine Änderung an Berechnungskern, Repository, Datenmodell, gespeicherten Schlüsseln oder bisherigen Nutzerdaten.

## PWA und Assets

Inter bleibt lokal unter SIL OFL eingebunden. App-/Touch-/Maskable-Icons und neun iPhone-Portrait-Startbilder verwenden die neue Wortmarke und Farbpalette. Neue Dateinamen vermeiden alte Motiv-URLs. App-ID, Pages-Basispfad und Offline-Verhalten bleiben gleich.

`node scripts/build-brand-assets.mjs` erzeugt die bereits eingecheckten Assets optional neu (ImageMagick 7 erforderlich). Farben werden direkt aus den CSS-Tokens gelesen; das Skript ist keine zusätzliche Build-Abhängigkeit. Andere Startbildgrößen und Ausrichtungen verwenden den nativen PWA-Startbildschirm. Bereits installierte iPhone-Icons werden nach iOS-Regeln aktualisiert.

Prüfung: vorhandene gezielte Berechnungs-/Speichertests, Typecheck und Produktionsbuild. Kein automatischer Merge oder Deployment.

Die lokale Produktionsvorschau startet. Der zusätzliche Chromium-Versuch endet in dieser Umgebung ohne Screenshot (nicht schreibbarer Font-Cache und Zertifikatsfehler im Browser-Log). Daher keine behauptete visuelle iPhone-/Desktop-Abnahme; diese bleibt im Review offen. Der Versuch wird nicht wiederholt.
