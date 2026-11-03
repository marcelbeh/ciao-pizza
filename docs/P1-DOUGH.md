# P1 · Teigmodell, Fachannahmen und Prüfung

## Umfang und Architektur

P1 erweitert ausschließlich Pizza-Pilot, Teigstudio und deren notwendige gemeinsame
UI-/Speicherschnittstellen. P0 bleibt Grundlage. P0-PR #1 ist noch offen; deshalb
basiert der P1-Branch `feat/p1-pizza-pilot-teigstudio` auf
`feat/ciao-2-p0-foundation`, ebenso das Ziel des Folge-PRs. Kein Merge und kein Deployment.

- `core/dough/model.ts`: vollständiger versionierter Teigplan, Stilvorlagen und
  `PlannedPhase` als Vertrag für spätere Monitor-/Zeitplan-Module.
- `core/dough/calculations.ts`: reine Berechnung, Validierung, Hefe-Richtwerte,
  Rundung und rückwärts abgeleitete Zeitphasen; unabhängig von React/IndexedDB.
- `infrastructure/storage/doughRepository.ts`: validierte Speicherung mit dem
  vorhandenen P0-`KeyValueStore` und IndexedDB-Adapter. Ein Datensatz
  `dough-workspace:v1` enthält aktiven Plan und Profil-Snapshots atomar.
- `app/DoughProvider.tsx`: gemeinsame Planinstanz, initiales Laden, serialisierte
  Schreibvorgänge, Speicherstatus und Wiederholung nach Fehlern. Keine neuen Pakete.
- `components/dough/`: Felder, Editor und gemeinsame Rezeptübersicht.

Pilot-Entwürfe werden erst bei der abschließenden Übernahme aktiv. Das Teigstudio
speichert jede vollständig gültige Änderung automatisch. Unvollständige/ungültige
Eingaben bleiben im Formular, ohne den letzten gültigen Plan zu überschreiben.
Profile sind unabhängige Snapshots; Laden ersetzt den aktiven Plan, Aktualisieren
schreibt die geänderte Rezeptur und den Profilnamen zurück. Löschen betrifft das
ausgewählte Profil, nicht den aktiven Plan. Maximal 100 Profile, Namen 1–80 Zeichen.
Unbekannte Versionen oder beschädigte Daten werden nicht stillschweigend ersetzt.

## Mathematik

Alle Prozente sind Bäckerprozente, bezogen auf Mehl = 100 %.

```text
N = ceil(Personen × Pizzen pro Person) + Reserve (ganze zusätzliche Pizzen)
M = N × Teiglingsgewicht
F = M / (1 + (Hydration + Salz + Hefe + Öl + Zucker) / 100)
Wasser = F × Hydration / 100; weitere Zutaten entsprechend
```

Im Mehlmodus ist F vorgegeben; M ist die Summe sämtlicher Zutaten und das
Teiglingsgewicht wird aus M / N berechnet. Der Profi-Modus verwendet seine explizite
Anzahl; die ursprünglichen Personen-/Reservewerte bleiben Planungsmetadaten.
Ein erneuter Pilot-Durchlauf berechnet die Anzahl wieder aus der Personenplanung.

Es wird intern ohne Zwischenrundung gerechnet. Mengen erscheinen mit 0,1 g;
Hefe unter 10 g mit 0,01 g und unter 1 g mit 0,001 g. Positive Werte kleiner als
0,001 g erscheinen als `<0,001`, niemals als scheinbar null. Diese Stellen dienen
der Dosierung, nicht der Genauigkeit einer Gärprognose. Die Summe gerundeter
Anzeigezeilen kann um einige Zehntelgramm abweichen. Keine Verluste, Bestäubung,
Toppings, Vorteige oder Sauerteige in der Massenbilanz.

## Stil-Startwerte

| Stil | Wasser | Salz | Öl | Zucker | Teigling | Mehlprofil |
| --- | --- | --- | --- | --- | --- | --- |
| Neapolitanisch | 60 % | 2,8 % | 0 % | 0 % | 250 g | Pizzageeignetes Weizen Tipo 00 |
| New York | 62 % | 2,5 % | 2 % | 1 % | 300 g | Backstarkes Weizenmehl |
| Römisch: Tonda Romana | 57 % | 2,5 % | 3 % | 0 % | 200 g | Weizen Tipo 0/00, mittlere Stärke |
| Eigener Stil | 65 % | 2,5 % | 0 % | 0 % | 260 g | Frei benanntes Weizenmehl |

Dies sind bewusst anpassbare Ciao!-Ausgangsrezepturen, keine Zertifizierung und
keine Behauptung eines einzigen verbindlichen Rezeptes pro Stil. Die Mehlprofile
sind Beschreibungen, keine rheologischen Modelle; hohe Hydration braucht geeignetes
Mehl und Erfahrung. Glutenfreie Rezepturen werden nicht modelliert.

Grundlagen, geprüft am 3. November 2026:

- [AVPN](https://www.pizzanapoletana.org/en/ricetta_pizza_napoletana): Wasser-/Mehlrelation
  für klassische neapolitanische Teige, vier Hauptzutaten, temperaturabhängige
  Hefe und ungefähr 1:3 Trocken-/Frischhefe. Der 60-%-Startwert liegt in der dort
  beschriebenen Hydrationsspanne. Heißes Pizzaofen-Backen ist die Stilreferenz.
- [King Arthur Baking](https://www.kingarthurbaking.com/recipes/new-york-style-pizza-recipe):
  backstarkes Weizenmehl sowie Öl und Zucker als Beispiele für einen faltbaren
  New-York-Teig. Die Ciao!-Prozente sind eine eigene, weniger angereicherte Vorlage.
- [Mattia’s Pizza, eBook](https://www.mattiaspizza.com/wp-content/uploads/eBook-The-Art-of-Neapolitan-Roman-Pizza-05-Feb-2024.pdf):
  Tonda Romana als dünne, knusprige runde Pizza und rund 57 % Wasser als
  traditionelle Ausgangsgröße. Nicht mit hoch hydratisierter Teglia oder Pinsa verwechseln.

## Hefe und Gärschätzung

**Keine validierte Reifekurve.** P1 nutzt eine offen ausgewiesene, grobe
Ciao!-Dosiertabelle für Frischhefe, bezogen auf Mehl:

| Führung | Annahme | Frischhefe |
| --- | --- | --- |
| Direkt, warme Gesamtgare bis 6 h | Raum 20–25 °C | 0,6 % |
| Direkt, über 6 bis 12 h | Raum 20–25 °C | 0,2 % |
| Direkt, über 12 bis 24 h | Raum 20–25 °C | 0,1 % |
| Kalt, 12 bis 36 h kalte Stockgare | ca. 4 °C + 3–6 h warme Gare | 0,3 % |
| Kalt, über 36 bis 72 h kalte Stockgare | ca. 4 °C + 3–6 h warme Gare | 0,15 % |

Unter 20 °C Raumtemperatur wird mit Faktor 1,5, über 25 °C mit 0,65 angepasst.
Diese groben Stufen vermeiden den Eindruck eines präzisen physikalischen Modells.
Ein Orientierungsband von 50–150 % der angezeigten Dosis verdeutlicht die Unsicherheit;
es ist kein statistisches Konfidenzintervall. Die Tabelle ist eine Produktheuristik,
nicht eine von den oben genannten Quellen validierte allgemeine Formel.

Trockenhefe bedeutet **Instant-Trockenhefe**, als Näherung Frischhefe / 3.
Aktive Trockenhefe und Herstellerprodukte können andere Faktoren benötigen.
Beim Wechsel der Hefeart wird eine manuelle Dosis umgerechnet; die Mengenbilanz
verwendet immer nur die tatsächlich ausgewählte Hefe, niemals beide zugleich.
Jede Empfehlung lässt sich durch eine manuelle Prozentdosis ersetzen.

Warnungen zeigen unter anderem Raumtemperaturen außerhalb 16–28 °C, Kühlschrank
unter 3 oder über 6 °C, zu lange Raumgare, ungewöhnliche warme Anteile bei
Kaltführung, sehr kleine Hefedosen und Zucker bei hoher Backtemperatur an.
Die Anwendung verlängert oder verkürzt eingegebene Zeiten nicht ungefragt.
Mehl, Hefezustand, Salz, Zucker, Teigkern-Abkühlung und Knetwärme beeinflussen die
Gare; sie werden nicht durch vermeintlich präzise Korrekturfaktoren vorgetäuscht.

## Temperaturen und Zeitplanung

Raum-, Wasser-, Zielteig- und Kühlschranktemperatur bleiben editierbare Sollwerte.
Wassertemperatur wird ohne Mehltemperatur und gemessene Knetwärme nicht automatisch
errechnet. Die Zielteigtemperatur ist keine vorgetäuschte Vorhersage aus Wassertemperatur.

Die Planung läuft rückwärts vom Backzeitpunkt: standardmäßig 20 Minuten editierbares Mischen/Kneten, warme
Stockgare, optional kalte Stockgare, dann Teilen und warme Stückgare.
Vorheizen ist eine parallele Phase. Sämtliche Phasen tragen `estimated: true`.
Vergangener Backtermin oder Startzeitpunkt erzeugen deutliche Hinweise; bereits
begonnene Pläne bleiben bearbeitbar. Keine Benachrichtigungen oder Reife-Monitor-UI.

Datumseingaben verwenden die Geräte-Ortszeit, Speicherung einen UTC-ISO-Zeitpunkt
plus IANA-Zeitzone. Nicht existierende lokale Zeitpunkte werden abgewiesen; bei
doppelten Stunden im Herbst verwendet JavaScript das frühere Vorkommen.
Die Rezeptübersicht zeigt die gespeicherte Planzeitzone. Eine Terminbearbeitung in
einer anderen Gerätezeitzone übernimmt deren Zeitzone ausdrücklich im Feldhinweis.

## Qualitätsprüfung und Grenzen

- 40 Tests: bestehende Navigation plus Massenbilanz aller sechs Zutaten,
  Mehlmodus, vier Stilvorlagen über mehrere Mengen/Hefearten, ungültige Werte und
  Null-Division, Rundung, Mengenauswahl, Hefeumrechnung/-stufen, Zeitphasen,
  Warnungen, Pilot→Studio, Profil-CRUD und Reload, Speicherausfall und Wiederholung.
- TypeScript-Prüfung und Produktionsbuild erfolgreich; PWA enthält weiterhin
  alle Routen. Paketmanifest und Lockdatei unverändert, keine neue Abhängigkeit.
- Produktionsbuild im Browser bei 390 × 844 geprüft: kompletter Pilot mit New York,
  Haushaltsbackofen, drei Personen und Kaltführung bis zur Studio-Übergabe.
  Hydration auf 66 % geändert und per Reload aus IndexedDB wiederhergestellt.
  Mobile Rezeptansicht ohne horizontalen Überlauf; Desktop-Layout separat geprüft.
- Kein Mehrgeräte-Sync, Export/Backup oder tabübergreifendes Konfliktmanagement:
  bei paralleler Bearbeitung gilt der zuletzt geschriebene Workspace. Für P1
  bitte einen bearbeitenden Tab verwenden. IndexedDB ist kein Backup.
- Ein noch nicht übernommener Pilot-Entwurf und ungültige Formularzwischenstände
  überleben Navigation/Reload nicht; der aktive gültige Plan dagegen schon.
- Grenzen des P0-Audits und die ausstehende echte iPhone-/Safari-Abnahme bleiben
  bestehen; sie werden in P1 nicht durch Toolchain-Refaktorierungen erweitert.

**Bewertung:** P1 ist funktional implementiert und für die fachliche und visuelle
Freigabe vorbereitet. Hefe-/Gare-Richtwerte müssen anhand realer Backversuche
kalibriert werden; die App verspricht keine automatisch erkannte Teigreife.
