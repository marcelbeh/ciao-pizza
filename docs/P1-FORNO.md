# FORNO. P1 — Umsetzung und Prüfung

## Umfang

Dashboard, Floating Dock mit Teig/Zeitplan/Pizzaabend, validierter Sofortrechner, lokale Speicherung, Sicherung bisheriger Daten, Midnight-Rock-Tokens und typografisches Branding. Keine TM5-Chargen, detaillierte Zeitplanung, Belagverwaltung, KI, Accounts oder Cloud-Synchronisierung. Das Original-Logo wurde nicht gefunden; es wird ausschließlich eine typografische Ersatzwortmarke verwendet.

Das Dashboard verwendet nur gespeicherte Daten. Es erfindet keinen Abend aus dem standardmäßig erzeugten Backdatum eines alten aktiven Teigplans. Alte Backtermine erscheinen in der gespeicherten Zeitzone. Ein nächster Arbeitsschritt wird ohne belastbare Zeitplanung nicht angezeigt.

## Datenübergang

Die Datenbank `ciao-pizza`, Version 1, und sämtliche alten Schlüssel bleiben bestehen. Nur `forno:calculator:v1` wird bei einer gültigen Benutzereingabe geschrieben. Der Übergang ist additiv und wiederholbar; beim Laden gibt es keine Schreiboperation. Passende alte Rezepturen werden kopiert, andere unverändert aufbewahrt. Persönliche Rezepte und bisherige Cloud-Caches sind im vollständigen lokalen Export enthalten. Zugangstokens aus anderen Browserspeichern werden nicht exportiert. Backend, SQL-Schema und Remote-Daten werden nicht angefasst.

Die bestehenden Funktionen `calculateDough`, `validatePlan` und `convertYeast` bilden die Berechnungs-/Kompatibilitätsgrundlage. `forno.ts` begrenzt die aktive P1-Rezeptur auf die vier gewünschten Zutaten. Die Originaldaten behalten auch frühere Öl-/Zuckerwerte, Profile und unbekannte Zusatzfelder.

## Gezielte Checks

- `npm test`: 21 Tests in zwei Dateien; Massenbilanz, Skalierung, kleine Hefemengen, Grenzen und ungültige Werte; Wiederherstellung, additive Übernahme, Frischhefekonvertierung, unveränderte Originale einschließlich persönlicher Rezepte/Fotos/Cloud-Caches, unbekannte Versionen und letzter gültiger Abend.
- `npm run typecheck`: TypeScript-Prüfung.
- `npm run build`: Produktionsbuild und Service Worker mit lokalen Schriften und Seiten; Pages-Basispfad `/ciao-pizza/` unverändert.

Der lokale Vorschauversuch mit `npm run preview -- --host 127.0.0.1 --port 4173` scheitert in dieser Umgebung mit `listen EPERM: operation not permitted 127.0.0.1:4173`. Daher keine interaktive Browser-, iPhone- oder echte Offline-Abnahme in dieser Sitzung. Der Vorschauversuch wird nicht wiederholt. Mobile Layouts, Safe-Area, Touch-Größen und reduzierte Bewegung sind implementiert; die visuelle Geräteprüfung bleibt offen.

Kein Merge, kein Deployment und kein gestarteter Pages-Workflow.
