# P6 · Pizza-Academy

14 redaktionelle Kurzartikel decken Zutaten, Teigführung, Handwerk und Backen ab. Inhalte und Quellenmetadaten sind lokal gebündelt; externe Quellen werden nicht vorab geladen. Nach erfolgreicher PWA-Installation/Cache-Befüllung sind alle Artikel ohne Anmeldung offline verfügbar. Eine Erstinstallation benötigt Internet. Keine Datenmigration, neuen Pakete, Cloud-/Gemini-Aufrufe oder Nutzerdatenübertragung.

## Redaktion und Grenzen

Die Artikel sind eigenständig formulierte Zusammenfassungen mit Primärquellen pro Artikel, Inhaltsstand und ausdrücklicher Einordnung von Richtwerten. Herstellerangaben und tatsächlicher Teigzustand gehen vor. Fokus: Weizen-Hefeteige; keine universellen Fermentationsprognosen. Römische Tonda und Teglia werden unterschieden. Der Reife-Monitor bleibt ein Platzhalter; bestehende Regelhinweise werden nicht verändert.

## P7-Schnittstelle

`src/core/academy/library.ts` exportiert reine Daten, `contentVersion`, `searchArticles` und `getArticleSection(articleId, sectionId)`. Artikel und Abschnitte haben stabile, sprachunabhängig verwendbare IDs. Der Lookup liefert Version, IDs, Titel, Absatztexte und Quellen-IDs. `sources` enthält die zugehörigen Original-URLs. Das ist eine Datenschnittstelle, keine Empfehlungs-/Retrieval-Engine. P7 kann daraus gezielt Kontext zusammensetzen; jeder externe KI-Aufruf und jede Übertragung von Nutzerdaten benötigt eine eigene Produkt-/Datenschutzentscheidung. Kein HTML oder Markdown muss ausgewertet werden.

Links: `#/pizza-academy?artikel=gare&abschnitt=stueckgare`. Unbekannte Artikel zeigen einen Rückweg; unbekannte Abschnitte öffnen den Artikelanfang. Suche und Kategorie liegen nur in der URL, ohne neuen Speichermechanismus. Der Bestand wird lazy mit der Academy geladen und vom bestehenden Service Worker precached. Kontextlinks importieren nur den kleinen Link-Helper, nicht den Artikelbestand.

## Zugang und Prüfung

Mobil über „Mehr“, am Desktop im eingeklappten Untermenü „Wissen & Hilfe“. Kein Dashboard-Einstieg. Je ein Kontextlink aus Teigstudio, Reife-Monitor, Teig-Doc und Backcoach. Vorhandene Formulare, Panels, Typografie und Buttons bleiben erhalten.

Gezielte Tests: Corpus-Integrität und Quellenreferenzen, Suche/Filter, direkte Abschnittslinks und Fokus, ungültige Links, vorhandene App-Navigation. Produktionsbuild führt Branding- und TypeScript-Prüfung mit aus. Offline-Abdeckung wird am erzeugten Service Worker und in der Browser-Vorschau geprüft.

Ergebnis am 03.11.2026: 23 gezielte Tests in vier Dateien erfolgreich (Academy-Corpus/-UI, App-Routen und dauerhafte Teigpläne/Profile). Produktionsbuild inklusive TypeScript und Branding-Prüfung erfolgreich, einmal nach den Änderungen ausgeführt. 49 Precache-Einträge. Browserprüfung bei 390 px: Suche und Artikel ohne horizontalen Überlauf. Offline-Nachweis: Vorschau-Server beendet, Nichterreichbarkeit per HTTP bestätigt; neuer Browser-Tab öffnet einen zuvor nicht angesehenen Artikel samt direktem Abschnittslink aus dem Service-Worker-Cache. Keine physischen iPhone-/Safari-Gerätetests. Nicht veröffentlicht.
