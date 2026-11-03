# P3 – Planung, Rezepte und Einkauf

## Bedienung

1. In der Rezeptbibliothek ein Original ansehen oder als eigene Kopie bearbeiten. Zutaten beziehen sich auf die angegebene Anzahl Pizzen und enthalten **keinen Teig**. Eigene Rezepte sind nach Stil und Belag filterbar.
2. Im Pizzaabend-Planer Termin, Gäste, Pizzen pro Person und ganze Reserve angeben. Gesamtzahl = aufgerundete Gäste × Pizzen pro Person + Reserve. Die Summe aller Sorten muss exakt passen, bevor gespeichert wird.
3. Der Abend nutzt eine eigene Teigrezeptkopie. „Teigrezept aus aktivem Plan übernehmen“ aktualisiert sie ausdrücklich. „Im Pizza-Piloten öffnen“ ersetzt den aktiven Teigplan mit Mengen und Termin dieses Abends. Änderungen dort beeinflussen einen gespeicherten Abend erst nach erneuter Übernahme und Speicherung.
4. Nach Speicherung Einkaufsliste erstellen. Nach späteren Änderungen erneut berechnen; ein Hinweis in der Liste zeigt veraltete Quellen an. Vorräte, manuelle Mengen, Ausschlüsse und Ergänzungen bleiben erhalten. Entfallene Zutaten bleiben zur Kontrolle als entfallen sichtbar.
5. Bedarf und vorhandene Menge bearbeiten, Artikel abhaken oder „Nicht einkaufen“ wählen. Manuelle Artikel können benannt, kategorisiert und entfernt werden. Vorräte gelten nur für diese Liste, ohne automatische Verbrauchsbuchung.

## Fachannahmen

- Fünf Originalrezepte sind redaktionelle Vorschläge; Belagmengen können durch Kopieren angepasst werden. Teigparameter bleiben die dokumentierten P1-Richtwerte. Gärzeiten sind weiterhin Schätzungen.
- Zutaten werden nach normalisiertem Namen und Einheit zusammengefasst; kleine explizite Aliasliste z. B. Passata → Passierte Tomaten. Keine unsichere allgemeine Erkennung ähnlicher Produkte. Mehlprofile und Hefearten bleiben getrennt.
- kg → g, l → ml; Stück bleibt Stück. **Keine Umrechnung von g nach ml ohne Dichte**; Teigöl aus der Massenbilanz bleibt deshalb von in ml angegebenem Belagöl getrennt. Wasser aus der Teigbilanz ebenfalls in g.
- Intern wird ohne Zwischenrundung gerechnet, Einkaufsanzeige maximal zwei Nachkommastellen. P1-Zutatenanzeige und kleine Hefemengen behalten ihre bisherige Präzision.
- Rezepte in Pizzaabenden sind vollständige Snapshots. Das Löschen oder Bearbeiten eines Bibliotheksrezepts verändert bestehende Abende und Listen nicht.
- Grenzen: 100 Gäste, 500 Pizzen, 80 Zutaten pro Rezept; Eingaben müssen endlich, positiv bzw. bei Vorrat/Reserve nicht negativ sein. Teilbare Pizzen pro Person, ganze Sortenmengen.

## Lokale Speicherung und Migration

Native IndexedDB `ciao-pizza`, Store `key-value`; keine neue Abhängigkeit. Schema `ciao-workspace:v2` enthält:

- `dough`: unverändertes P1-Modell mit aktivem Plan und Profilen;
- `recipes`, `evenings`, `shopping`;
- `settings`, `fermentations` als vorbereitete, mitgesicherte Datenplätze.

Beim ersten Öffnen wird `dough-workspace:v1` validiert und übernommen. Alte `mixMinutes` werden durch die bestehende Legacy-Migration ergänzt. Das alte Original bleibt unter dem alten Schlüssel und als `legacyOriginal` erhalten. Ein vorhandener V2-Stand hat Vorrang. Unbekannte Versionen und beschädigte Datensätze werden nicht überschrieben. Kontogetrennte Cloud-Caches bleiben unangetastet; sie werden keinem Gast ungefragt zugeordnet.

Alle Änderungen lesen und schreiben den gemeinsamen Datensatz in einer atomaren Transaktion. Getrennte Tabs können unterschiedliche Module bearbeiten, ohne deren Daten zu verlieren. Veraltete Teigplan-Schreibversuche werden abgewiesen; dann neu laden. Es gibt keine Echtzeit-Aktualisierung zwischen Tabs. Möglichst einen Tab pro Arbeitsablauf verwenden.

Die Sicherung exportiert den **gesamten** lokalen Datensatz. Import unterstützt V2 sowie alte P1-Teigsicherungen. V2-Import fügt Rezepte/Abende/Listen mit neuen IDs hinzu und erhält die Verknüpfung Abend ↔ Liste. Aktiver Importteig wird als Profil abgelegt, nie als Ersatz des aktiven Plans. Bestehende Einstellungen haben Vorrang; das volle Importoriginal wird zusätzlich in `settings.importArchives` erhalten. Wiederholter Import erzeugt bewusst weitere Kopien. Bei verletzten Größen-/Profilgrenzen schlägt der Import vollständig fehl statt teilweise Daten zu verlieren.

Vor Aktivierung späterer Supabase-Synchronisierung muss ein V2-Adapter die vollständigen Abende, Listen, Einstellungen und Reifeprozesse übertragen und Konflikte additiv behandeln. Der ältere Cloud-Dough-Adapter wird in der produktiven App nicht aufgerufen. E-Mail-Anmeldung und SMTP bleiben zurückgestellt.

## Prüfung und Grenzen

Gezielte Tests: Teig-Gesamtmasse, Rezeptskalierung, geschützte Originale, Mengenvalidierung, Einheiten/Aliase, Zutatenaggregation, Vorratsabzug, Neuberechnung mit manuellen Änderungen, IndexedDB-Neustart, Legacy-Migration, atomare parallele Änderungen, Schutz vor veralteten Schreibversuchen, Sicherungsimport und UI-Ablauf im simulierten Offline-Zustand. Bestehende P1-, Cloud-Vertrags- und Navigationstests bleiben aktiv.

Offline-Tests verwenden IndexedDB und `navigator.onLine=false`; zusätzlich wird der Produktions-Service-Worker mit allen App-Chunks erstellt. Ein erstmaliger Offline-Aufruf ohne vorherige Installation kann technisch nicht funktionieren. Ein physischer iPhone-Flugmodus-Test ist in dieser Umgebung nicht erfolgt. Browser-Speicher ist kein Ersatz für externe Sicherungen. Kein Allergen-/Nährwertrechner, keine Warenpreise, keine automatische Produkt-/Dichteerkennung.
