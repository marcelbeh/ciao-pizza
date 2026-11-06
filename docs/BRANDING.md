# Aktueller Stand: Fresh Food

Die aktuelle Oberfläche und Theme-Funktion sind in [FRESH-FOOD.md](FRESH-FOOD.md) dokumentiert. Die folgenden Abschnitte dokumentieren frühere Branding-Schritte und die weiterhin verwendeten Ofen-Icons.

# FORNO. — Premium Cinematic UI

## Verbindliche Referenz und Logo

Die vom Nutzer bereitgestellte Dashboard-Referenz bestimmt Hierarchie, Farben und Oberflächen: schwarzer Stein, warmes Orange/Kupfer, Creme, Teigfotografie, Serifentitel, drei Rezepturwerte, zwei Hauptkarten und eine schwebende Fünfernavigation.

**Die Original-Logodatei aus Variante 1 fehlt weiterhin.** Der Nutzer hat ein hochauflösendes Bild angekündigt; es lag bei Erstellung dieses Standes noch nicht vor. Deshalb bleibt die bisherige schlichte Textwortmarke erhalten. Es wurde kein Ersatz-Ofenlogo erfunden. Handschriftlicher Schriftzug, gemauerter Ofen und Original-Logo im Header sind noch nicht abgenommen. Die bestehenden PWA-Icons und Startbilder bleiben bis zur Lieferung des Originals erhalten.

## Gemeinsames Design

`src/styles.css` enthält die gemeinsamen Tokens für Hintergrund `#090908`, Oberflächen `#191713`/`#24201b`, Creme `#f5efdf`, Sekundärtext `#c2baaa`, Orange `#ffa04f` und Kupfer `#a96c3d`. Lokales Inter dient als UI-Schrift; Serifentitel und Mengen verwenden vorhandene Systemschriften (Iowan/Palatino/Georgia). Keine zusätzlichen Schriftdateien oder UI-Abhängigkeiten.

Karten, Buttons, Eingaben, Fokusmarkierungen und Statusanzeigen werden seitenübergreifend verwendet. Karten erhalten zurückhaltende Lichtkanten und warme Schatten. Die Navigation enthält Home, Teig, Zeitplan, Pizzaabend und Rezepte; Einstellungen sind im Header erreichbar. Safe-Areas und Platz unter dem Inhalt schützen die untere Navigation. Animiert werden nur kurze Hover-/Druckzustände; `prefers-reduced-motion` deaktiviert diese.

## Lokale Bilddateien

- `src/assets/dough-scene.webp`: 1400 × 933, ca. 129 KB.
- `src/assets/timer-scene.webp`: 800 × 533, ca. 34 KB.

Beide Motive wurden für diese Oberfläche generiert und anschließend als WebP optimiert. Sie sind Annäherungen an die Bildwelt, keine Originalausschnitte des Mockups und keine Logodateien. Es gibt keine Bildabrufe bei Drittanbietern zur Laufzeit. Vite erzeugt versionierte Asset-URLs; der bestehende Service Worker nimmt WebP bereits in den Offline-Cache auf.

## Daten und Funktionsumfang

Berechnungskern, Repository, IndexedDB-Daten, Speicher-Keys und Sicherungsformat sind unverändert. Dashboard-Werte stammen aus den gespeicherten Einstellungen. Bearbeiten und Zutaten führen in den bestehenden Rechner; gültige Eingaben werden weiterhin automatisch gespeichert. Ein vorhandener Pizzaabend wird nur lesend angezeigt.

Zeitplan, Pizzaabend-Verwaltung und Rezeptansicht waren bisher nicht implementiert und bleiben ausdrücklich „In Vorbereitung“. Reife-Monitor und Journal sind nicht anklickbare, entsprechend beschriftete Vorschaufelder. Es werden keine Zeitpunkte, Erinnerungen oder Rezepte erfunden. Die Einstellungen bündeln die vorhandene vollständige JSON-Sicherung und Offline-/Installationsinformationen; sie behaupten keine Wiederherstellungsfunktion.

App-ID, GitHub-Pages-Basispfad, Update-Bestätigung und Offline-Verhalten bleiben erhalten. Browser- und Manifestfarbe sind an das neue Schwarz angepasst. Keine Änderungen an Supabase, Cloud-Diensten oder Nutzerdaten.

Prüfungen und verbleibende visuelle Abnahmen: [CINEMATIC-UI-CHECK.md](CINEMATIC-UI-CHECK.md).

## Aktuelles App-Symbol: Pizzaofen

Die App-Icons verwenden jetzt eine aus dem freigegebenen Header-Logo abgeleitete Ofen-Grafik (`docs/brand/forno-app-icon.png`) statt des früheren F.-Monogramms. Das Header-Logo selbst bleibt unverändert. Die Auslieferungsdateien sind deckende 8-Bit-RGB-PNGs ohne Transparenz oder eingebauten weißen Rahmen; die Maskable-Datei besitzt zusätzliche Sicherheitsränder. Dateien tragen neue `oven-v1`-URLs. Zusätzlich liegt eine identische 180-px-Datei unter dem konventionellen Safari-Pfad `apple-touch-icon.png`.

Reproduktion nur der Icons: `node scripts/build-brand-assets.mjs --icons-only`. Startbilder und sonstige UI werden dabei nicht geändert. Manifest-ID, Pages-Pfad, Berechnungen und Datenspeicherung bleiben unverändert.

Ein weißer äußerer Rand war im bisherigen Icon-Bitmap nicht enthalten. Die alte Datei war ein 16-Bit-PNG; die neue Auslieferung verwendet kompatible 8-Bit-PNGs. Ob Safari/Shortcuts ein altes oder abgeleitetes Icon benutzt, lässt sich aus dem Screenshot allein nicht sicher bestimmen. Bereits installierte Icons werden von iOS verwaltet; neue URLs können deren sofortige Aktualisierung nicht erzwingen. Vor einem eventuellen Entfernen und erneuten Hinzufügen der installierten App zuerst die lokale Datensicherung herunterladen. Keine Safari-/Website-Daten löschen.

Prüfung: Typecheck, Produktionsbuild, Abmessungen, PNG-IHDR (8 Bit/RGB), deckende dunkle Ecken, Maskable-Sicherheitskreis sowie Manifest-/HTML-/Precache-Verweise. Kein physischer iPhone-Test.
