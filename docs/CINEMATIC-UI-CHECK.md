# FORNO. — Cinematic UI: Prüfstand

Basis: main `96a67b4d2939a02505645b0ce9c37b1804de58bc`.

## Automatisch geprüft

- 25 Tests: vorhandene Rezeptur-/Speichertests und vier gezielte UI-Regressionstests. Navigation, gespeicherte Dashboard-Werte, keinerlei Schreiben beim Seitenwechsel, Bearbeiten, Dezimalkomma, Schutz ungültiger Eingaben, Zutaten-Sprung, Sicherungsdownload und Sicherungszugang bei unlesbaren Daten.
- TypeScript: `npm run typecheck`.
- Produktion/PWA: `npm run build`; Bilddateien werden lokal gebündelt und im Service-Worker-Precache aufgenommen.
- `git diff --check`.
- Keine Änderungen an Berechnungskern, Speicherimplementierung, Modellen, Keys oder vorhandenen Nutzerdaten; keine zusätzlichen Abhängigkeiten.

## Eingeschränkt / Abweichungen

- Original-Ofenlogo noch nicht geliefert. Bestehende Textwortmarke, App-Icons und Startbilder sind erhalten; das ist ausdrücklich noch keine originalgetreue Logo-Abnahme.
- Lokal generierte Teig-/Timerbilder statt Originalfotografien aus dem Referenzbild. Serifenschrift ist eine Systemschrift; genaue Form/Metrik variiert je Betriebssystem.
- Fehlende bestehende Funktionen werden ausdrücklich als „In Vorbereitung“ gezeigt. Keine Benachrichtigungsglocke ohne Funktion. Zusätzliche Statusbeschriftungen und Offline-/Datensicherungszugang erhalten die Bedienbarkeit.
- Keine tatsächlichen Browser-Screenshots oder Pixelvergleiche erstellt. Die bereits dokumentierten Chromium-Probleme der Sandbox erlauben keine belastbare visuelle Abnahme; der gescheiterte Start wird nicht wiederholt. DOM-Tests prüfen keine Layoutgeometrie.

## Offene manuelle Abnahme

1. Originaldatei integrieren und Header/Logo mit der gelieferten hochauflösenden Vorlage vergleichen.
2. iPhone/Safari: 320, 375, 390 und 430 px Breite; Hoch-/Querformat, Safe-Areas, keine horizontalen Überläufe oder überdeckten Inhalte. Eingabetastatur, Fokus, 200-%-Textvergrößerung und letzte Zeile über dem Dock prüfen.
3. Mac/Safari und Chromium: ca. 1280/1440 px, konsistente Oberflächen auf allen fünf Navigationszielen und Einstellungen, lesbare Bildüberlagerungen und Formular-/Fehlerzustände.
4. Alle Dock-Links, Einstellungen, „Bearbeiten“, „Zum Teigrechner“ und Zutaten-Sprung tatsächlich antippen; Tab-Reihenfolge und sichtbaren Fokus prüfen.
5. Mit fiktiver Rezeptur bearbeiten, neu laden, vollständiges JSON herunterladen und Offline-PWA einschließlich beider Bilder prüfen. Update bei unvollständiger Eingabe bleibt gesperrt.
6. Screenshotvergleich erst nach Original-Logo und echtem Browserlauf. Bis dahin ist keine pixelgenaue oder abschließende visuelle Freigabe zugesichert.

Kein Merge und kein Deployment durch diesen Auftrag.
