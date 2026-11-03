# P4 – Backcoach, Teig-Doc und Pizza-Tagebuch

## Ausgangsstand und Freigabe

Basis ist `main` nach P3 einschließlich Mehlmodus-Korrektur (Commit `e66b5178f2b935d9223ce05cb38588970505bf2a`). P0/P1 und P3 sind vorhanden; ein eigenständiger P2-Reife-Monitor war nicht implementiert und bleibt unverändert ein Platzhalter. P4 implementiert keine Reifeprognose.

**P4 bleibt bis zur ausdrücklichen Freigabe als offener Pull Request. Kein Merge, kein Deployment.** Der bestehende manuelle Pages-Workflow bleibt unverändert.

## Backcoach

1. Einen Standardplan, aktiven Teigplan, gespeicherten Pizzaabend oder vorhandenen Backlauf als Quelle auswählen und einen neuen Lauf vorbereiten. Die Quelle wird kopiert, nie überschrieben.
2. Gerät und Sollwerte einstellen. Back-/Steintemperatur, optional getrennt regelbare Oberhitze, Vorheizzeit, Backdauer und Drehintervall sind manuell anpassbar. Separate Oberhitze ist standardmäßig aus; beim Grill gibt es keine solche Regelung.
3. Vorheiztimer starten, pausieren, fortsetzen oder auf Anfang setzen. Ein Neustart setzt den Timer zurück und pausiert; anschließend ausdrücklich wieder starten. Die Einstellungen sind ab dem Timerstart geschützt. Im Vorheizschritt gibt ein Neustart sie wieder frei.
4. Stein und Teig beurteilen, Vorheizen ausdrücklich bestätigen, Pizza vorbereiten und einschieben. Der Backtimer startet beim Einschieben. Ein Zeitablauf schaltet niemals selbst auf „fertig“.
5. Nach dem Anbacken bei Bedarf drehen, Drehung vermerken und Pizza herausnehmen/prüfen. Bei Bedarf weiterbacken; erst nach manueller Bestätigung zählt die Pizza als fertig. Zwischen Pizzen den Stein wieder auf Temperatur kommen lassen.
6. Abgeschlossenen Lauf ins Tagebuch übernehmen. Der Belag muss bei mehreren Sorten ausdrücklich ausgewählt werden. Einzelzeiten sind im Lauf gespeichert; ins Tagebuch wird eine mittlere Timerzeit pro Pizza übernommen, sofern sie im Messbereich liegt.

Die Richtwerte verwenden die bestehenden P1-Planwerte. Als Ausgangspunkt für neapolitanische Pizza im Pizzaofen: Stein 420 °C, Drehhinweis nach 25 s; weitere Stile/Geräte nutzen moderatere Steinvorgaben (Haushalt 250 °C, sonst 300 °C) und längere Drehintervalle. Keine Aussage, dass jedes Gerät diese Temperaturen unterstützt. Geräteanleitung, Belastbarkeit des Steins und Sichtkontrolle haben Vorrang. Die Grenzen der Eingaben sind keine Leistungsversprechen für ein bestimmtes Gerät.

Fachliche Orientierung: [Ooni: erstes Backen](https://ooni.com/blogs/ooni-insights/how-to-make-your-first-ooni-pizza) beschreibt kurze Backzeiten und regelmäßiges Drehen im heißen Pizzaofen. [Ooni Pro: Steintemperatur prüfen](https://uk.ooni.com/pages/getting-started-cook/ooni-pro) betont das Messen des Steins. Die konkreten App-Ausgangswerte sind anpassbare redaktionelle Richtwerte.

### Timer und Vollbild

Timer persistieren Startzeitpunkt und bereits verstrichene aktive Zeit; ein Intervall aktualisiert nur die Anzeige, nicht IndexedDB. Nach Neuladen/Tabwechsel wird die Zeit aus diesen Werten neu berechnet. Pausen zählen nicht mit, ein abgelaufener Timer zeigt null und weiterlaufende aktive Zeit kann weiterhin zur Ist-Backdauer gehören. Nach einer bestätigten Drehung richtet sich der nächste Hinweis nach dieser Drehung.

Keine Hintergrundalarme, Push-Nachrichten oder verlässlichen Signale bei gesperrtem Bildschirm. Browser dürfen die Anzeige im Hintergrund anhalten. Änderungen der Geräteuhr können die berechnete Laufzeit beeinflussen. Der Coach darf nicht als unbeaufsichtigte Ofensteuerung verstanden werden.

Vollbild nutzt die Browser-Fullscreen-API und bleibt optional. Auf unterstützten Geräten kann der Fokusbereich geöffnet und wieder verlassen werden. iOS/Safari-Unterstützung hängt von Version und Betriebsmodus ab; bei fehlender Unterstützung bleibt der normale Backmodus nutzbar.

## Teig-Doc: überprüfbare Regeln

Drei Schritte: Problem auswählen, Beobachtungen/Messwerte ergänzen, Regeln auswerten. Zehn Problemgruppen: klebrig, trocken, Rückzug, Reißen, fehlendes Aufgehen, vermutete Übergare/Untergare, zu dunkel, zu hell und unzureichend gebackener Boden. Jede Auswertung zeigt mögliche Ursache, verwendeten Kontext, Sofortmaßnahme, nächsten Versuch und Parametererklärung. Diagnosen können lokal gespeichert und wieder geöffnet werden.

`DiagnosisEngine` ist ein unabhängiger Port; der ausgelieferte Adapter arbeitet vollständig lokal und deterministisch. Es gibt keine KI-Anfrage, keinen Schlüssel, kein kostenpflichtiges SDK und keine automatische Übermittlung von Notizen oder Bildern. Eine spätere KI-Erweiterung benötigt eine eigene bewusste Aktivierung und ein Datenschutz-/Kostenkonzept.

| Prüfhinweis | Bedingung | Bedeutung |
| --- | --- | --- |
| Hohe Hydration | mindestens 70 %, klebrig/reißend | Mehlwasseraufnahme und Stabilität prüfen; kein Nachweis eines Rezeptfehlers |
| Kalt | beobachtet kalt oder Ist-/Plan-Teigtemperatur unter 20 °C | bei Rückzug/fehlendem Aufgehen/Untergare Temperierung prüfen |
| Entspannung | ausdrücklich kurz nach Rundwirken geformt | bei Rückzug/Reißen Ruhephase prüfen |
| Strukturverlust | kollabiert, als warm/lang beschrieben, Raum mindestens 26 °C oder Raumgare über 16 h | bei klebrig/reißend/Übergare behutsam verarbeiten und Zeit/Wärme getrennt vergleichen |
| Bräunung | Zucker oder Öl im Plan und zu dunkle Pizza | Rezeptur und Hitze gemeinsam prüfen |
| Wärmeverteilung | dunkel/hell/feuchter Boden | Ober-/Unterseite, Stein und gemessene Backdauer getrennt betrachten |

Schwellenwerte sind redaktionelle Prüfregeln für Weizen-Pizzateige, keine wissenschaftlich kalibrierte Gärkurve, Wahrscheinlichkeit oder Erfolgsprognose. Mehlstärke wird nicht aus einem frei eingegebenen Namen erraten. Messwerte haben vor Planwerten Vorrang; unbekannte Werte bleiben unbekannt. Bei fehlender Steintemperatur behauptet die App kein gemessenes Wärmedefizit.

[King Arthur: Pizza-Grundlagen](https://www.kingarthurbaking.com/learn/pizza) stützt die Hinweise zu Entspannung vor dem Formen und dem Wärmeeintrag über Stein/Stahl. Die zusätzlichen Verknüpfungen mit Planparametern sind ausdrücklich redaktionelle Regeln.

## Tagebuch und Lernen

Jeder Eintrag enthält eine unabhängige Teigrezeptur, optional einen Belagsnapshot, Zeitpunkt, tatsächliche Zeiten/Temperaturen, drei optionale Bewertungen (1–5), markierte Probleme, Notizen und bis zu drei Fotos. Planwerte werden nicht als Messungen ausgegeben. Sollrezeptur und tatsächliche Messwerte sind getrennt korrigierbar. Kaltgare wird zusätzlich zur Raum-Stock-/Stückgare erfasst, ohne Doppelzählung.

„Gelungen“ bedeutet ausschließlich: alle drei eigenen Bewertungen mindestens 4/5 und kein markiertes Problem. Ein gespeicherter solcher Versuch kann als neues eigenes Bibliotheksrezept kopiert werden. Ohne erfassten Belag entsteht eine ausdrücklich belagfreie Teigrezeptur. Das optionale `Recipe.dough` erhält den Teigplan; Messwerte und Notizen stehen in der Zubereitung, Fotos bleiben im Tagebuch. In der Bibliothek lässt sich die Formel ausdrücklich im Teigstudio öffnen. Der aktive Plan wird nur bei diesem beschrifteten Übergabeschritt ersetzt.

Die Auswertung zählt ein Problem erst ab zwei ausdrücklich so markierten Versuchen. Notizen werden nicht automatisch als Symptome interpretiert. Der Vergleich zeigt Rezepturparameter, erfasste Messwerte und Bewertungsdifferenzen zweiter minus erster Versuch. Fehlende Werte werden nicht durch Planwerte ersetzt; verschiedene Mehle, Geräte, Stile und Hefearten sind als mögliche Vergleichshindernisse erkennbar. Hefe-Differenzen verschiedener Hefearten werden nicht als direkt vergleichbar ausgegeben. Keine behaupteten Kausalitäten, kein Erfolgsprozentsatz.

## Local First, Fotos und Sicherungen

P3-Workspace und Schlüssel `ciao-workspace:v2` bleiben erhalten. Der neue optionale Bereich `baking` besitzt eine eigene Version 1 mit `sessions`, `entries` und `diagnoses`. Fehlt er in alten Daten, wird nichts gelöscht oder beim bloßen Öffnen umgeschrieben. Neue Änderungen verwenden dieselbe atomare IndexedDB-Transaktion. Revisionen verhindern, dass alte Backlauf-/Eintragsentwürfe fremde Änderungen überschreiben.

Grenzen: 200 Tagebucheinträge, 30 Backläufe, 100 gespeicherte Diagnosen. Keine automatische Löschung älterer Daten; Verwaltungsaktionen sind ausdrücklich beschriftet. Bei Konflikt bleibt der Entwurf sichtbar und der gespeicherte Stand erhalten.

Fotos werden im Browser dekodiert, auf maximal 1280 Pixel längste Seite verkleinert und als JPEG neu kodiert. Metadaten werden nicht aus dem Original übernommen. Original maximal 10 MB und 50 Megapixel, verarbeitete Datei maximal 350 KB; bis zu drei Bilder pro Eintrag, insgesamt 20 Bilder und 5 MB JPEG-Bilddaten. Eingaben: JPEG, PNG, WebP. HEIC/HEIF bitte als JPEG exportieren. Transparenz wird auf Weiß gesetzt; es wird keine professionelle Bildbearbeitung angeboten.

Die Bilder liegen als begrenzte JPEG-Data-URLs mit Größen-/Formatprüfung im lokalen Datensatz; die Base64-Repräsentation benötigt zusätzlich Platz. Vorbereitete Entwurfsfotos werden erst mit dem Eintrag dauerhaft gespeichert. Wird ein Limit oder die Browserquote überschritten, schlägt die gesamte Speicherung fehl; bestehende Daten bleiben unverändert. Fotoentwürfe lassen sich verkleinern/entfernen. Keine Foto-Uploads.

Die bestehende Sicherung enthält auch Fotos, Läufe und Diagnosen. P4-Import fügt neue IDs hinzu, remappt die übernommenen Abend-/Lauf-Verweise und behält das volle Importoriginal im Archiv. Bestehende aktive Teigpläne werden weiterhin nicht ersetzt. Import und Gesamtworkspace sind auf 50 MB begrenzt; importierte Archive zählen mit. Bei Überschreiten eines Limits kein Teilimport. Wiederholter Import kann Kopien erzeugen und Speichergrenzen erreichen. Browserdaten regelmäßig extern sichern.

## Optionale spätere Supabase-Synchronisierung – nur Konzept

SDK, Auth-/RLS-/Sync-Vorbereitung bleiben unverändert deaktiviert. Keine Cloud-Abhängigkeit für P4, kein SMTP, keine anonymen Konten und kein erzwungenes Login. Der ältere Cloud-Dough-Adapter ist noch kein P4-Sync-Adapter.

Vor einer bewussten optionalen Aktivierung sind nötig:

1. Vollständige Metadatenübertragung des P4-Formats inklusive Revisionen, nicht nur des bisherigen Dough-Dokuments. Lokale Originale beim ersten Verbinden additiv erhalten und Konflikte ausdrücklich zusammenführen.
2. Fotos separat in einen **privaten** Storage-Bucket übertragen, mit Pfaden je Benutzer-ID und Foto-ID. Metadatenmanifest erst nach erfolgreicher Bildübertragung bestätigen; bei Abbruch lokale Bilder und Uploadstatus behalten. Bild-IDs/Inhaltsprüfsummen für idempotente Wiederholung vorsehen.
3. RLS für Datenbank und Storage mit Eigentümerprüfung bei jedem erlaubten Zugriff, kein öffentlicher Bucket und keine Secret-/Service-Role-Keys im Frontend. Löschungen über synchronisierte Markierungen behandeln, bevor endgültig aufgeräumt wird.
4. Echten Zwei-Konten-Test für Lese-/Schreibisolation, Abbruch/Wiederholung, konfliktbehafteten Erstimport, Offline-Warteschlange und Fotos durchführen. Erst danach Auth-/Sync-Oberfläche freischalten.

Grundlage: [Supabase Storage-Zugriffskontrolle](https://supabase.com/docs/guides/storage/security/access-control); Dokumentation/Changelog am 03.11.2026 geprüft. Es wurden für P4 keine Servereinstellungen, Tabellen oder Buckets verändert.

## Prüfung

`npm test`, `npm run typecheck`, `npm run build` bzw. `npm run check`. Gezielte neue Prüfungen betreffen Zeitstempel, Pausen/Neustart, manuelle Zustandsübergänge, Mengenfortschritt, Gerätevorgaben, Diagnoseregeln und fehlende Messwerte, Rezeptkopien, Vergleich und Erfolgskriterien, P3-Kompatibilität, Fotoformat/-grenzen, Persistenz, atomare Konflikte, Importverknüpfungen und Speicherfehler. UI-Tests decken Backcoach → Tagebuch, lokale Diagnose ohne Netzaufruf und erfolgreiche Rezeptübernahme ab.

Browserprüfung mit Produktionsbuild und schmaler Darstellung; physisches iPhone, gesperrter Bildschirm und iOS-Vollbild benötigen ergänzenden Gerätetest vor einer entsprechenden Zusage. Offline-Erstnutzung braucht einen vorangegangenen vollständigen Online-Aufruf mit aktiviertem Service Worker. Es wird nichts produktiv veröffentlicht, bevor der Auftraggeber freigibt.
