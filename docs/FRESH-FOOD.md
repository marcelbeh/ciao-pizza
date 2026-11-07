# FORNO. Fresh Food — Hell, Dunkel, System

## Oberfläche

Die Referenz dient als Orientierung für Creme, Olivgrün, freundliche Begrüßung, klare Zahlen, grüne Hauptaktion, zwei Food-Karten und vier Schnellzugriffe. Beide Themes verwenden dieselben Komponenten, Routen, Formulare und Funktionen. Ab 800 px stehen Rechner/Zutaten und Einstellungen in Spalten; ab 1040 px zeigt das Dashboard die Planung und beide Bildkarten nebeneinander. Untere Navigation, Safe-Areas und Touch-Ziele bleiben erhalten. Alle Farben für Text, Karten, Felder, Fokus, Warnungen und Buttons sind semantische CSS-Tokens.

Das originale Holzofen-Headerlogo und die freigegebenen Ofen-App-Icons bleiben unverändert. Eine dunkle Logo-Fläche erhält die Lesbarkeit des hellen Original-Schriftzugs auch im Light Mode. Food-Bilder unter `public/food/` sind eigens generierte, lokal optimierte WebP-Dateien (zusammen ca. 250 KB), keine eingebundenen Fremdfotos oder externen Laufzeitabrufe. Die alten Cinematic-Fotos und Texturen sind entfernt. Reife-Monitor und Journal haben erreichbare, ausdrücklich als vorbereitet gekennzeichnete Ansichten; es wird keine neue Modul-Funktion vorgetäuscht.

## Theme

Der gut erreichbare Umschalter im Header und unter Einstellungen bietet Hell, Dunkel und System. Erstnutzung folgt dem Betriebssystem. `forno:theme:v1` ist ein separater LocalStorage-Eintrag; es werden keine bestehenden IndexedDB-Schlüssel, Rezepte, Zeitpläne oder Sicherungsformate verändert.

`public/theme-init.js` wird von Vite direkt vor CSS/React in den HTML-Head eingefügt. Es wählt das gespeicherte bzw. System-Theme synchron aus, setzt Hintergrund und native Farbschemata vor dem ersten App-Paint und aktualisiert `theme-color` sowie die iPhone-Statusleisten-Metadaten. Kein zusätzlicher Netzwerkabruf ist für diesen Start nötig. Betriebssystemänderungen wirken nur im Systemmodus. Andere Tabs übernehmen eine geänderte Auswahl. Bei gesperrtem Browserspeicher funktioniert die Auswahl für die Sitzung; die fehlende dauerhafte Speicherung wird angezeigt.

Ein Wechsel ändert nur Root-Tokens und den Umschalter, nicht den React-Arbeitsbereich. Dadurch bleiben auch unvollständige Rechner-Eingaben und ungespeicherte Zeitplanentwürfe erhalten. Die früher fest dunkel gestalteten iPhone-Startbilder sind entfernt. Der native OS-/Installations-Splashscreen und bereits installierte Icons werden von iOS/Android verwaltet; deren Darstellung lässt sich nicht in jeder Installation sofort an eine manuelle Web-Theme-Wahl anpassen. Die Web-App selbst löst ihr Theme vor dem Paint auf.

## Prüfung

- 68 relevante Tests erfolgreich: bestehender Rechner, Zeitplan, Zeitstrahl, Datenerhalt und Navigation; zusätzlich Theme-Erststart, persistente Auswahl, Systemwechsel, tabübergreifende Storage-Events, Speicherausfall und Erhalt laufender Eingaben.
- Automatisierte Prüfung der CSS-Paletten: Standardtext, Sekundärtext, Akzent, Fehlertext und Buttonbeschriftungen mindestens 4,5:1, Feldrahmen mindestens 3:1.
- Typecheck, Produktionsbuild und bestehender Offline-Precache. Logo, Icons, Berechnungskern, Speichermodelle und Abhängigkeiten bleiben unverändert.
- Lokale Produktionsvorschau startet. Chromium scheitert in dieser Umgebung mit Prozess-/Zertifikatsfehlern, ohne verlässliche Bildschirmbilder zu erzeugen. Keine behauptete visuelle iPhone-/Desktop- oder physische Offline-Abnahme. Eine separat öffentlich testbare PR-Vorschau ist hier nicht eingerichtet; dafür wurde kein zusätzlicher Hosting-Dienst aktiviert. Lokale Vorschau: `npm run preview -- --host 127.0.0.1` unter `/ciao-pizza/`.

Gemäß abschließender Nutzeranweisung wird genau ein PR erstellt und nach grüner CI gemergt sowie über den vorhandenen manuellen Pages-Workflow veröffentlicht.

## Visuelle Nachbesserung nach Referenz

Die frühere Browserblockade wurde für die Nachbesserung durch die freigegebene Browserausführung außerhalb der Dateisandbox überwunden. Echte Vorher-/Nachher-Aufnahmen und die aktuellen Messwerte stehen unter [visual/README.md](visual/README.md). Dort sind auch die verbleibenden Unterschiede und die weiterhin fehlende physische Safari-/iPhone-Abnahme aufgeführt.
