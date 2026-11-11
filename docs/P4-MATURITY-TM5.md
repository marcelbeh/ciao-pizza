# P4 – Reifemonitor und TM5-Rezeptansicht

## Bedienung

- **Dashboard:** kompakte Reifeanzeige mit Status und Prognosesicherheit. Ohne aktiven Monitor
  gibt es bei vorhandenem P2-Plan eine ausdrücklich bezeichnete Planvorschau.
- **Reife-Monitor:** über die Anzeige oder den bisherigen Schnellzugriff erreichbar; keine neue
  Hauptnavigation. „Reifemonitor starten“ übernimmt aktuelle Rezeptur und gespeicherten Zeitplan
  als feste Kopie. Ohne gültigen gespeicherten Zeitplan ist kein Start möglich.
- **Teigrechner:** „TM5-Rezeptansicht (optional)“ aufklappen. Mengen folgen dem bestehenden Rechner.
  Die Autolyse ist mit 30 Minuten vorbelegt und ausdrücklich anpassbar.
- **Teigtemperatur:** in der TM5-Karte oder im Monitor einmal erfassen. Beide nutzen denselben
  Datensatz; es gibt keine doppelte Eingabe. Raum-/Kühlschrankbasis ist optional und korrigierbar.
  Ein leeres Feld bedeutet unbekannt, nicht den angezeigten Planwert.
- Tatsächliche spätere Änderungen als Raum-, Kühlschrank- oder Teigtemperatur mit Zeitpunkt
  erfassen. Alle Messungen und Beobachtungen lassen sich korrigieren.
- Drei freiwillige Checks können geöffnet, gespeichert oder übersprungen werden. Volumen,
  Oberfläche und Elastizität sind einfache Auswahlfelder; keine Bilder oder KI-Auswertung.
- Speichern erfolgt ausdrücklich, Erfolg erst nach Commit. Fehler behalten den Entwurf.
  Ungespeicherte Formulare schützen Link-/Zurücknavigation und Tab-Schließen nach Browserregeln;
  während Bearbeitung/Speichern bleibt das PWA-Update gesperrt. Theme-Wechsel erhält Eingaben.

Änderungen im Rechner oder P2 verändern den Monitor **nicht** unbemerkt. Ein Hinweis zeigt den
Unterschied. „Aktuelle Planung übernehmen“ verlangt eine ausdrückliche Bestätigung. Der bisherige
Monitor bleibt einschließlich Beobachtungen im Sicherungsdatensatz erhalten. Es gibt einen aktiven
Monitor; keine neue Archiv-/Journal-Oberfläche. Alte Monitoraufzeichnungen sind im Export enthalten.

## Prognosemodell 1 – bewusst qualitativ

Es wird **keine wissenschaftliche Fermentationsrate**, kein Temperatur-Zeit-Äquivalent, keine
Reife-Prozentzahl und keine exakte Restzeit berechnet. Die Begriffe sind nachvollziehbare
Orientierung anhand des gewählten Zeitplans und aktueller Beobachtungen, keine Messung der Reife.
Es gibt keine automatische Hefeanpassung und keinerlei automatische Änderung des Zeitplans.

Die bestehenden P2-Schritte liefern unverändert Anfang, Ende und Temperatur jeder Phase.
Stockgare und Stückgare bleiben getrennt; Version 2 unterscheidet kalte Stockgare, kalte Stückgare
und Akklimatisierung. Version 1 wird mit ihrer bisherigen Bedeutung gelesen.

| Anzeige | Regel |
| --- | --- |
| Frühe Reife | Vor geplantem Gärbeginn oder während Stockgare ohne mehrere unterstützende Beobachtungen |
| Reife entwickelt sich | Stückgare; auch unklare/abweichende Bedingungen ohne ausreichende aktuelle Hinweise |
| Voraussichtlich backbereit | Im geplanten Schlussabschnitt ab dem Vorheiz-/Vorbackcheck bis zum Backtermin, ohne widersprechende Hinweise; nur Plan = geringe Sicherheit. Bei Temperaturabweichungen sind zusätzlich mindestens zwei unterstützende Merkmale nötig. Nach dem Backtermin nur mit mehreren Beobachtungen, die danach erfasst wurden. |
| Möglicherweise überreif | Schlaffe/eingefallene Oberfläche **und** sehr weiche/klebrige Konsistenz zusammen; auch das kann andere Ursachen haben |

Deutliche/etwa doppelte Volumenzunahme, sichtbare Bläschen und langsames Zurückfedern gelten als
unterstützende Merkmale. Mindestens zwei stützen eine fortgeschrittene Entwicklung. Ein einzelnes
Merkmal ist niemals Beweis für Unter-/Übergare. Ein auffälliges Einzelmerkmal verhindert, dass eine
rein planbasierte Backbereitschaft ohne weitere Prüfung behauptet wird. Kaum Volumenzunahme plus
schnelles Zurückfedern werden gemeinsam als Hinweis auf geringe Entwicklung beschrieben.

Nur tatsächlich erfasste, nicht übersprungene Beobachtungen bis zur aktuellen Zeit zählen.
Stockgare-Beobachtungen gelten nicht als aktueller Beleg für die Stückgare. Nach dem Backtermin
wird der Plan allein nicht unbegrenzt als „backbereit“ fortgeschrieben; ein neuer Check ist nötig.

**Sicherheit:** ausschließlich „Gering“ oder „Eingeschränkt gestützt“. Letzteres verlangt mehrere
passende Merkmale, eine Teigtemperatur, gemessene relevante Umgebungen und keine bekannte
Temperaturabweichung innerhalb des geplanten Fensters. Fehlende Messungen, ein überschrittener
Backtermin oder Abweichungen bleiben gering. Es gibt keine behauptete hohe Sicherheit.

### Rezept und Temperaturen

- Mehlmenge/-name, Hydration, Salz, Hefe, Teiglingszahl/-gewicht kommen aus der unveränderten
  Rechnerlogik. Der Mehlname liefert ohne weitere Angaben keinen verlässlichen Mehlstärke-Wert.
- Die aktuelle P1-Quelle liefert Trockenhefe. Das Modell unterstützt außerdem Frischhefe für
  passende gespeicherte Quelldaten; die vorhandene 3:1-Konvention dient nur dem Mengenvergleich,
  **nicht** einer zeitlichen Gärprognose. Eine neue Hefeartenwahl wird dem Rechner nicht aufgezwungen.
- Persönliche Referenz: 64 % Hydration, 3 % Salz, 0,1 % Trockenhefe. Andere Werte liefern Hinweise
  (etwa mehr Hefe möglicherweise schneller, höhere Hydration auch ohne Übergare weicher), keine
  zahlenmäßige Zeitkorrektur. Null Hefe erlaubt kein planbasiertes Backbereit-Urteil.
- Gemessene Raum-/Kühlschrankbasis gilt als angenommene Umgebung der jeweiligen Phasen. Spätere
  Änderungen gelten ab ihrem erfassten Zeitpunkt. Warme/kalte Abweichungen erzeugen verständliche
  Empfehlungen zum Prüfen, gegebenenfalls Kühlerstellen oder bewusstem Anpassen im Zeitplan.
- Teigtemperatur nach dem Kneten und spätere Teigmessungen bleiben echte Messwerte. Ein warmer
  Teig nimmt die Kühlschranktemperatur nicht sofort an. Ohne Messreihe wird keine Abkühlkurve
  simuliert. Knetwärme ist ein Unsicherheitsgrund, keine berechnete Zeitverschiebung.

Die Kontrollpunkte sind organisatorische Vorschläge: bis zu 30 Minuten vor Ende der Stockgare
(bei kurzen Phasen innerhalb der Phase), Mitte der Stückgare und der gespeicherte Vorheizbeginn
innerhalb der Stückgare. Diese Zeitpunkte sind keine biologischen Reifegrenzen. Überspringen
bleibt neutral; es fehlen dann lediglich Beobachtungen.

## TM5: acht kompakte Phasen

1. Vorbereitung/Wassertemperatur: kühlschrankkaltes Wasser ist möglich; Ausgangstemperaturen und
   Knetwärme beachten. Keine berechnete Wassertemperatur ohne Mess-/Erfahrungsdaten.
2. Mehl + **gesamtes Wasser der jeweiligen Charge** zu Beginn verbinden, kein Wasser zurückhalten.
3. Autolyse standardmäßig 30 Minuten (persönliche Rezeptvorgabe, anpassbar).
4. Trockenhefe gleichmäßig einarbeiten.
5. Salz einarbeiten, kein zusätzliches Wasser.
6. Kontrolliert fertigkneten, Konsistenz/Temperatur prüfen; bei Erwärmung pausieren. Keine pauschale
   5–7-Minuten-Dauer und keine erfundenen Geräteintervalle. Zusammenführen mehrerer Chargen.
7. Teigtemperatur messen und einmal im aktiven Monitor speichern.
8. Stockgare gemäß Zeitplan starten. Tatsächlich späterer Beginn erfordert manuelle Anpassung.

Die bisherige persönliche 400-g-Mehl-Aufteilung wird über `thermomixBatches` wiederverwendet;
alle Mengen einschließlich Salz/Hefe werden proportional angezeigt. Sie ist **keine** validierte
Hersteller-Maximalmenge. 500 g Gesamtmehl ergeben damit zwei Chargen. Die Referenz 500 g Mehl,
320 g Wasser, 0,5 g Trockenhefe, 15 g Salz wird mit dem bestehenden Rechner geprüft; aktuelle
Rezepte werden nicht automatisch darauf umgestellt. Die gesamte Vorbereitungszeit umfasst auch
Autolyse und Handarbeit. Bei einem kürzeren P2-Vorbereitungsblock steht ein Hinweis zur manuellen
Prüfung; der Zeitplan wird nicht geändert.

### Tatsächlich geprüfte Herstellerangaben

Primärquelle, geprüft am 11.11.2026:
[Vorwerk UK/Ireland – TM5 dough mode and quantities](https://support-gb.vorwerk.com/hc/en-gb/articles/18202346542236-How-do-I-activate-the-knead-mode-on-my-Thermomix-TM5-and-what-is-the-maximum-amount-of-dough-I-can-prepare-at-a-time).
Bestätigt ist die Bedienung des Teigmodus mit Ährensymbol und Drehregler. Vorwerk verweist bei
Mengen auf geprüfte Rezepte und auf Mengenreduktion bei Überlastung. Daraus folgt **keine allgemeine
Mehlgrenze oder konkrete Drehzahl/Zeitvorgabe** für dieses eigene Rezept.

Die über die [offizielle Vorwerk-Anleitungsübersicht](https://vorwerk.co.uk/pages/thermomix%C2%AE-instruction-manuals)
verlinkte [TM5-Anleitung (UK V4)](https://cdn.shopify.com/s/files/1/0998/4730/7608/files/Thermomix_TM5.pdf?v=1787196129)
wurde ebenfalls geprüft: maximale Füllmarkierung **2,2 Liter**; Teigmodus auf gedruckter Seite 44
mit Ährensymbol/Drehregler, wechselnder Drehrichtung und deaktivierter Heizfunktion. Die Volumengrenze
ist **keine Mehl- oder Teigmassengrenze**; die Chargenrechnung kann das tatsächliche Volumen nicht prüfen.
Die nach vorherigem Kochen genannte Gerätesperre oberhalb 60 °C ist keine Zieltemperatur für Pizzateig
und wird nicht als solche angeboten.

Rezeptbezogene maximale TM5-Charge, Drehzahlen und Misch-/Knetintervalle bleiben zur manuellen
Prüfung mit einem geprüften Rezept offen. Bis dahin nennt die Karte für Hefe/Salz die Handarbeit
und macht keine konkrete Gerätezeitvorgabe.
Die alte unvalidierte 30-Sekunden-Anweisung wird in der TM5-Karte nicht mehr ausgegeben.

## Daten und Bestandsschutz

Nur neuer Schlüssel **`forno:maturity:v1`**, gleiche DB `ciao-pizza`, Version 1, Store `key-value`:

```ts
{ version: 1, modelVersion: 1, activeId: string | null,
  plans: MonitorPlan[], autolyseMinutes: 30 }
// MonitorPlan: id, createdAt, updatedAt, modelVersion,
// formula/schedule snapshots, yeastKind/yeastGrams,
// conditions { doughC, doughAt, roomC, fridgeC }, temperatures[], checks[]
```

Strikt validiert beim Lesen und innerhalb jedes atomaren `store.update`: Version/Modellversion,
IDs, ISO-Zeitstempel, Temperaturen, Rezeptur, Zeitplan und Beobachtungswerte. Unbekannte/beschädigte
P4-Daten bleiben schreibgeschützt, andere Bereiche und die vollständige Sicherung erreichbar.
Fehlender Schlüssel bleibt ohne Schreibvorgang leer. Keine Schema-Migration und kein automatisches
Umschreiben älterer Daten. Alte/aktuelle Rezeptbestände, P1/P2/P3 und unbekannte Archive bleiben erhalten.
Vollständiger Export enthält auch P4 und unlesbare Datensätze, auch im Fallback der bekannten Keys.

Ein aktiver Monitor, bis zu 50 erhaltene Plan-Snapshots, je 300 Temperaturänderungen und drei
korrigierbare Checks. Grenzen verhindern unbegrenztes Wachstum; Überschreitung bricht atomar ab.
Die App fragt tatsächliche Messungen zwischen −10 und 60 °C ab; das ist eine Eingabegrenze, keine
empfohlene Teigtemperatur. Autolyse 0–240 ganze Minuten, ebenfalls Benutzervorgabe statt Gerätegrenze.
Konflikte zwischen Tabs werden abgewiesen, statt fremde Änderungen zu verlieren. Keine Cloud,
Accounts, KI, zusätzliche Pakete, neuen Hauptmenüpunkte oder Änderung des Deployments.

## Prüfung

`npm run check`: Modell-/Rezept-/Temperatur-/Beobachtungsregeln, fehlende Angaben, Trocken-/Frischhefe,
übersprungene Checks, deterministische Prognose, keine automatischen Planänderungen, TM5-Mengen und
persönliche Chargengrenze, gemeinsame Teigtemperatur, korrigierbare Daten, Fehlerspeicherung,
Schema-/Bestandsschutz, vollständige Sicherung und neue Snapshots nach Rezeptänderungen.

Browserprüfung und echte Aufnahmen: [P4-Prüfbericht](p4-visual/README.md).
Kein physischer iPhone-/Safari- oder TM5-Gerätetest. Kein Merge und kein Deployment ohne Freigabe.
