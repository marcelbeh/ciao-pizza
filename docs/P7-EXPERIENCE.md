# P7 Experience · ein Durchlauf, ein Pizzaabend

Diese Änderung baut auf veröffentlichtem P7 (PR #32/#33, Main `9173f437`) auf. Gerätewahl,
Session-Datensatz, Rechner, Zeitplan, Reifemonitor und Terminlöschung werden wiederverwendet.

## Oberfläche nach der gelieferten Vorlage

- **Start**: lokales Pizzafoto mit tatsächlichem Backtermin, Pizzaanzahl, Reifezeit und Gerät;
  aktuelle Phase mit Zeitbogen, kompakte Kennzahlen und direkt aufrufbarer Backplan.
  Vorbereitungs-/Chargen-Unterzeiten sind ausklappbar, damit die Hauptphasen ruhig bleiben.
- **Sessions**: vorhandene Sessions öffnen/auswählen oder eine neue planen. Die Auswahl speichert
  nur den aktiven Verweis; Rezepturen, Ausführungszeiten und Beobachtungen bleiben bestehen.
- **Rezepte**: bisherige lokale Beläge unverändert.
- **Wissen**: Erklärungen und Zugänge zu Pizzaabend, Zutaten, Zeitplan, Monitor, Gerät, Theme,
  Sicherung und den ausdrücklich separat bezeichneten bisherigen Werkzeugen.
- **Planung**: fünf verbundene horizontale Schritte, deutsch formatierte Terminzeilen mit
  nativem Datum-/Uhrzeit-Picker, optionales Backfenster und feste Hauptaktion am unteren Rand.
  Menge und Zusammenfassung zeigen Chargen und Mengen je Charge. Eingaben werden erst beim
  ausdrücklichen Speichern übernommen.
- **Kochmodus**: eine Bildschirmansicht je Arbeitsschritt, direkt auswählbare horizontale
  Segmente, bestätigte Schritte farbig, aktueller Schritt mit eigener Kontur, vollständige
  ausklappbare Übersicht als kompaktes Raster. Keine vertikale Liste im aktiven Ablauf.
  Eigene detaillierte SVG-Mixtopfzeichnung mit Metall-/Wasser-/Mehloberflächen und Varianten
  für Zugaben, Mischen, Kneten, Ruhe, Messung und Entnahme. Keine Vorwerk-Grafik kopiert.
  Sollwertkarte, konkrete Anleitung, Gerätehinweise und feste Zurück-/Weiter-Aktionen.

Hell nutzt warme, helle Flächen, dunkle Schrift und eine eigenständige helle Sollwertkarte;
Dunkel tiefes Schwarz/Anthrazit, feine Konturen und zurückhaltendes Grün. Beide verwenden dieselben
semantischen Tokens und dieselbe Struktur. `experience.css` liefert die neuen Tokenwerte und
Komponentenstile; vorhandene Komponenten lesen weiterhin dieselben Variablen. Lokales Inter,
vorhandene optimierte/lokal lizenzierte Food-Assets und eigenes SVG, keine neue Abhängigkeit.
Animationsarme Einstellungen und Safe Areas werden berücksichtigt. Während Planung und Kochmodus
entfällt die Bottom-Navigation zugunsten der festen Hauptaktion; Zurück führt kontrolliert heraus.

Die eigentliche Rezeptfolge benötigt standardmäßig **11 kurze Ansichten**, statt der acht
illustrativen Segmente im Entwurf: Vorbereitung, Wasser, Mehl, Verbinden, Autolyse, Hefe, Salz,
Fertigkneten, Entnehmen, gemeinsame Temperatur und gemeinsamer Gärstart. Nicht benötigte Hefe-,
Salz- oder Autolyse-Schritte entfallen. Es werden keine bestehenden Rezepte allein für eine
optisch passende Schrittnummer verändert.

## Chargen: einmalige Anleitung, transparente Mengen

Die Chargenberechnung bleibt `sessionBatches`, die Mengenberechnung bleibt `calculateDough`.
`batchDisplay` erzeugt ausschließlich Anzeige-/Wiegewerte in 0,01-g-Schritten: die abgerundete
Menge für reguläre Chargen und höchstens 0,01 g mehr für die angegebene Restanzahl. Ihre Summe
entspricht exakt der auf 0,01 g gerundeten **Zutaten-Gesamtmenge**. Nicht gerundete Rezeptwerte
bleiben unverändert gespeichert. Einzelne Zutaten werden unabhängig gerundet; die Anzeige ist
keine zusätzliche Rezeptberechnung. Unterhalb der Mengenkarte wird jeder nötige Ausgleich erklärt.
Für kleine Hefemengen ist weiterhin eine geeignete Feinwaage nötig; unterhalb der Anzeigeauflösung
wird nicht fälschlich eine hefelose Rezeptur behauptet.

Die Anleitung wird unabhängig von der Chargenanzahl **einmal** durchlaufen. Dauerhaft sichtbar:
„N Chargen · Mengen je Charge“. Zu Beginn erklärt die App die eigenständige Wiederholung in der
Küche. Keine automatische Chargenschleife, keine Chargenauswahl, keine Pflichtbestätigungen pro Charge.
Der eine freiwillige Timer hilft bei einer Ruhephase; die App taktet nicht automatisch alle Chargen.

Erst **Alle Chargen fertig – Stockgare starten** setzt den tatsächlichen gemeinsamen Gärstart.
Bis dahin wird kein Stockgare-Ist-Zeitpunkt aus einem Schrittwechsel oder Timerende abgeleitet.
Die gemeinsame Temperatur bleibt derselbe Wert im Session-Monitor. Schrittsegmente und Übersicht
speichern nur die Position, bestätigen keine Ausführung. „Weiter“ bestätigt den aktuellen Schritt.

## Planung und kompatible Datenerweiterung

Datenbank `ciao-pizza`, Version 1, Store `key-value`, Schlüssel `forno:sessions:v1` und alle
anderen Schlüssel bleiben erhalten. Neu ist ausschließlich die optionale Angabe
`preparation.workBudget: 'per-batch'` innerhalb einer Session. Neue Sessions verwenden damit
aktive Arbeit **je Charge** plus Autolyse je Charge; alles liegt vor der unveränderten Gare.
Beispiel: drei Chargen mit 20 Minuten Arbeitsbudget und 30 Minuten Autolyse erhalten 150 Minuten
Vorbereitung vor der Stockgare. Das sind Planbudgets, keine verifizierten Motorlaufzeiten.
Vorheizen bleibt parallel; die Standard-Gärphasen ergeben weiterhin genau 48 Stunden.

Bestehende Sessions ohne diese Angabe behalten ihr bisheriges **gesamtes** aktives Arbeitsbudget.
Keine automatische Umdeutung, kein Schreibvorgang beim Lesen. Vor Beginn kann der Nutzer im Planer
bewusst „Aktive Arbeitszeit pro Charge planen“ auswählen und erst ausdrücklich speichern.
Nach Beginn bleibt das Vorbereitungsbudget ebenso wie Rezept und Gerät eingefroren.
Auch die Übernahme aus den bisherigen P1/P2/P4/P5-Werkzeugen bleibt ausdrücklich und verlustfrei;
sie übernimmt zunächst die alte Budgetbedeutung.

Alter `cooking.batch` und sämtliche `done`-Einträge bleiben als Historie unverändert lesbar und
werden nicht gelöscht oder pauschal normalisiert. Die neue Darstellung fasst Bestätigungen nach
Arbeitsschritt zusammen. Fortsetzen startet an der gespeicherten Position; der alte Chargenindex
wird weder weitergezählt noch für neue Pflichtdurchläufe genutzt. Ein laufender Timer behält seine
absolute Endzeit. Alte Messungen, Bestätigungen und Plan-/Ist-Zeiten werden nicht erfunden.

Alle Änderungen laufen atomar über das bestehende Repository mit ID-/Revisionsprüfung und strikter
Validierung. Unbekannte Versionen/Felder/Budgetarten bleiben schreibgeschützt. Sicherung umfasst den
vollständigen alten und neuen Datensatz. Löschen von Termin oder Session, sichere Entwürfe, Fehler-
meldungen und Sperre des PWA-Updates bei Bearbeiten/Speichern bleiben erhalten.

## Verifizierte Geräteinformationen, Stand 28.11.2026

- [Vorwerk TM7 Funktionen/Modi](https://globalsupport.vorwerk.com/hc/de/articles/22779771378076-Was-Sie-%C3%BCber-Funktionen-und-Modi-des-TM7-wissen-sollten): Teigmodus über die Modiübersicht, Timer, temperaturabhängige Modussperre.
- [Vorwerk TM7 technische Daten](https://globalsupport.vorwerk.com/hc/en-us/articles/18535706925724-What-are-the-technical-specifications-of-the-new-Thermomix-TM7): 2,2 Liter Mixtopfvolumen.
- [Vorwerk Kneten TM7/TM6/TM5](https://www.vorwerk.com/de/de/c/home/rezepte-und-ideen/ideenreich/thermomix/tipps/kneten-mit-dem-thermomix): spezieller Knetmodus, wechselnde Drehrichtung. Kein einfach übernommener TM5-Motorbefehl für TM7.
- [Offizielles Cookidoo: TM6 Dough Mode](https://cookidoo.co.uk/foundation/en-GB/pages/tm6-modes-explained-dough): maximal 1 kg Teig.
- TM5-Modusbedienung und zusätzliche Quellen: [bestehende P7-Recherche](P7.md#verifizierte-geräteangaben-recherche-26112026).

**Keine universelle Hersteller-Mehlgrenze für den individuellen TM7-Teig bestätigt.** Die App
behält deshalb die vorhandene persönliche 400-g-Mehl-Aufteilung bei und bezeichnet sie ausdrücklich
so. Die bestätigte Litergrenze ist keine Grammgrenze; Volumen und passende Rezeptfreigabe sind am
Gerät zu beachten. Diese Einschränkung wird nicht als vollständig verifizierte TM7-Massenberechnung
ausgegeben. Individuelle Misch-/Knetdauer und Drehzahl bleiben unverifiziert und werden in den
Geräteanzeigen als „Prüfen“ dargestellt. Keine Geräteverbindung, Telemetrie oder automatische Heizung.

## Qualität und visuelle Abnahme

`npm run check`: **284 erfolgreiche Tests in 22 Dateien**, Typecheck und Produktionsbuild erfolgreich. Bisherige Regressionsprüfungen plus 22 neue Tests zu einmaligem Durchlauf,
Zutaten-/Rundungssummen, Chargengrenzen, neuem und altem Arbeitsbudget, eingefrorenem Rezept,
Schrittauswahl, gemeinsamer Abschlussbestätigung, Speicherausfall, Sessionauswahl und Datenerhalt.
Die historischen P1–P6-UI-Tests testen weiterhin ihre vollständige Funktion über die ausdrücklich
beibehaltenen Legacy-Einstiege; der neue Produktablauf wird zusätzlich separat getestet.

Echte Browseraufnahmen bei 393 × 852 und Desktop in `p7-experience/`, beide Themes:

| Ansicht | Hell | Dunkel |
| --- | --- | --- |
| Start vorher | [Vorher](p7-experience/before-home-light.png) | [Vorher](p7-experience/before-home-dark.png) |
| Start nachher | [Start](p7-experience/home-viewport-light-393.png) | [Start](p7-experience/home-viewport-dark-393.png) |
| Kochmodus vorher | [Vorher](p7-experience/before-cook-light.png) | [Vorher](p7-experience/before-cook-dark.png) |
| Waage nachher | [Wasser](p7-experience/cook-water-light-393.png) | [Wasser](p7-experience/cook-water-dark-393.png) |
| Geräteeinstellungen | [Teigmodus](p7-experience/cook-knead-light-393.png) | [Teigmodus](p7-experience/cook-knead-dark-393.png) |
| Planer Termin | [Termin](p7-experience/planner-1-light-393.png) | [Termin](p7-experience/planner-1-dark-393.png) |
| Planer Menge | [Menge](p7-experience/planner-2-light-393.png) | [Menge](p7-experience/planner-2-dark-393.png) |
| Planer Teig | [Teig](p7-experience/planner-3-light-393.png) | [Teig](p7-experience/planner-3-dark-393.png) |
| Planer Backplan | [Plan](p7-experience/planner-4-light-393.png) | [Plan](p7-experience/planner-4-dark-393.png) |
| Zusammenfassung | [Fertig](p7-experience/planner-5-light-393.png) | [Fertig](p7-experience/planner-5-dark-393.png) |
| Reifemonitor | [Monitor](p7-experience/monitor-light-393.png) | [Monitor](p7-experience/monitor-dark-393.png) |

Der Vergleich mit der gelieferten Vorlage erfolgte anhand von Header, Foto-Hero, Phasenkarte,
Kennzahlen, Navigation, Planerzeilen, horizontalen Segmenten, Gerätezeichnung, Mengenkarte und
festen Aktionen. Dabei wurden zu hohe Karten, unvollständig gezeichnete Schrittbalken und zu lange
Anleitungen korrigiert. Termine und Mengen bleiben echte Session-Daten statt kopierter Beispieldaten.
Die SVG-Zeichnung ist eine eigene Illustration statt einer fotografischen Kopie des Geräts; die
Schrittanzahl folgt dem Rezept. Dies sind bewusste Unterschiede zur Beispielgrafik.

Automatisierte Browsermatrix: 320/375/393/430/1280 × 852, Hell/Dunkel, Offline-Erstaufruf des
Kochmodus, vollständiger einzelner Durchlauf, Timer-Neuladen, gemeinsame Temperatur, Gärstart,
Navigation, Terminlöschung/pausierter Monitor und unveränderte Altbestände.
[Browserbericht](p7-experience/browser-report.json).

Echter lokaler Service-Worker-Upgrade-Test vom vorherigen Produktionsbuild: Update bei geändertem
Session-Entwurf gesperrt, Entwurf bleibt, ausdrückliches Verwerfen, tatsächliche Aktivierung der
neuen UI, unveränderte IndexedDB einschließlich altem Chargenindex/Bestätigungen/Timer und
anschließender Offline-Neustart. [Upgrade-Bericht](p7-experience/update-report.json).
Die Skripte verwenden vorinstalliertes externes Playwright; keine neue Projektabhängigkeit.

WebKit ist hier nicht installiert. Kein echter iPhone-/Safari-/TM7-Hardwaretest; simulierte
393×852-Touch-Viewports sind kein Ersatz. Keine Timer-Weckfunktion bei geschlossener App.
