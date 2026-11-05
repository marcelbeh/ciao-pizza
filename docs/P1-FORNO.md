# FORNO. P1 — Umsetzung und Prüfung

## Umfang

Dashboard, Floating Dock mit Teig/Zeitplan/Pizzaabend, validierter Sofortrechner, lokale Speicherung, Sicherung bisheriger Daten, gemeinsame Design-Tokens und typografisches Branding. Keine TM5-Chargen, detaillierte Zeitplanung, Belagverwaltung, KI, Accounts oder Cloud-Synchronisierung. Der aktuelle visuelle Stand verwendet bewusst eine reine Inter-Wortmarke; siehe [Designsystem](BRANDING.md).

Das Dashboard verwendet nur gespeicherte Daten. Es erfindet keinen Abend aus dem standardmäßig erzeugten Backdatum eines alten aktiven Teigplans. Alte Backtermine erscheinen in der gespeicherten Zeitzone. Ein nächster Arbeitsschritt wird ohne belastbare Zeitplanung nicht angezeigt.

## Datenübergang

Die Datenbank `ciao-pizza`, Version 1, und sämtliche alten Schlüssel bleiben bestehen. Nur `forno:calculator:v1` wird bei einer gültigen Benutzereingabe geschrieben. Der Übergang ist additiv und wiederholbar; beim Laden gibt es keine Schreiboperation. Passende alte Rezepturen werden kopiert, andere unverändert aufbewahrt. Persönliche Rezepte und bisherige Cloud-Caches sind im vollständigen lokalen Export enthalten. Zugangstokens aus anderen Browserspeichern werden nicht exportiert. Backend, SQL-Schema und Remote-Daten werden nicht angefasst.

Die bestehenden Funktionen `calculateDough`, `validatePlan` und `convertYeast` bilden die Berechnungs-/Kompatibilitätsgrundlage. `forno.ts` begrenzt die aktive P1-Rezeptur auf die vier gewünschten Zutaten. Die Originaldaten behalten auch frühere Öl-/Zuckerwerte, Profile und unbekannte Zusatzfelder.

## Gezielte Checks

- `npm test`: 21 Tests in zwei Dateien; Massenbilanz, Skalierung, kleine Hefemengen, Grenzen und ungültige Werte; Wiederherstellung, additive Übernahme, Frischhefekonvertierung, unveränderte Originale einschließlich persönlicher Rezepte/Fotos/Cloud-Caches, unbekannte Versionen und letzter gültiger Abend.
- `npm run typecheck`: TypeScript-Prüfung.
- `npm run build`: Produktionsbuild und Service Worker mit lokalen Schriften und Seiten; Pages-Basispfad `/ciao-pizza/` unverändert.

Der aktuelle UI-Relaunch startet die lokale Vorschau erfolgreich. Die visuelle Browserprüfung bleibt wegen Umgebungsfehlern offen; Details stehen im [Designsystem](BRANDING.md).

Kein Merge, kein Deployment und kein gestarteter Pages-Workflow.
