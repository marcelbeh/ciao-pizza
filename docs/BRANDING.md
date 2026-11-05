# FORNO. — Original-Logo

`brand/forno-original.jpg` ist die unveränderte, von Marcel bereitgestellte Vorlage (1254 × 1254). Das komplette Motiv einschließlich Schriftzug wird im Dashboard verwendet. Zwei WebP-Auslieferungsgrößen reduzieren das Datenvolumen. Seitenverhältnis 1:1 und `object-fit: contain` erhalten das ganze Bild; die mobile Breite ist zusätzlich durch die Bildschirmhöhe begrenzt. Ab 600 px stehen Logo und bestehender Hero-Text nebeneinander. Unterseiten behalten die kompakte Wortmarke.

`brand/forno-icon-source.png` ist eine aus der Vorlage generierte, vereinfachte Icon-Variante: Gitarre, brennender Steinofen und Gasgrill als kontrastreiche Formen. Kleinschrift, Essen und Textur entfallen. Sie ersetzt ausschließlich die bisherigen Platzhalter-Icons, nicht das Original-Logo. Motiv und freie Ränder bleiben in allen Rastergrößen erhalten; das Maskable-Icon behält die Sicherheitsränder.

Dateien unter `public/` sind fertig generierte Auslieferungs-Assets. Optional reproduzierbar mit `node scripts/build-brand-assets.mjs` (ImageMagick 7 erforderlich; keine zusätzliche App-/Build-Abhängigkeit). Das Skript skaliert/komponiert nur die beiden bestehenden Quelldateien.

- PWA: 192/512 px sowie separates 512-px-Maskable-Icon, bisherige App-ID und `/ciao-pizza/` unverändert.
- iPhone: 180-px-Touch-Icon und neun Portrait-Startbildgrößen mit vollständigem Logo auf `#101820`; Zuordnung über Displaygröße und Pixeldichte. Andere Größen/Ausrichtungen verwenden den nativen Startbildschirm. Android verwendet Manifest-Icon und Midnight-Hintergrund.
- Favicon: 32/64 px. Neue Dateinamen verhindern die Wiederverwendung alter Icon-URLs; bei bereits installierten iPhone-Apps bestimmt iOS den Zeitpunkt der Icon-Aktualisierung.
- Offline: Logo, Icons und Startbilder im vorhandenen Service-Worker-Precache. Unveränderte Midnight-Tokens und unverändertes Floating Dock.

Prüfung: Typecheck und Produktionsbuild, Abmessungen und referenzierte Assets sowie Precache-Einträge. Kein physischer iPhone-/Splashscreen-Test. Keine Änderungen an Berechnungen, Datenspeicherung oder anderen Funktionen. Kein automatischer Merge oder Deploy.
