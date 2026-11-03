# Ciao! Classico – Branding-Assets

Gestalterische Grundlage: vom Auftraggeber am 03.11.2026 bereitgestellte Ciao!-Bildreferenz. Die Oberfläche besteht aus echten React-Komponenten; die Referenz ist nicht als Bildschirmhintergrund eingebunden.

## Vektoren

- `public/brand/ciao-logo.svg`: vollständiges, transparentes Logo in Basilikumgrün, rotes Kochmützenmotiv, Tricolore und „Der Pizzateig-Assistent“.
- `ciao-logo-dark.svg`: cremefarbener Schriftzug/Untertitel für dunkle Flächen.
- `ciao-wordmark.svg` und `ciao-wordmark-dark.svg`: kompakte Variante ohne Untertitel für den App-Kopf.
- `ciao-app-icon.svg`: rotes App-Zeichen mit hellem C!, kleinem Pizza-Motiv und gerundeter Vorschauform.
- `ciao-app-icon-maskable.svg`: Zeichen innerhalb einer zusätzlichen Sicherheitszone, vollflächiger Hintergrund.
- `public/favicon.svg`: vereinfachtes C! für sehr kleine Darstellung.

Sämtliche Schriftzüge sind echte SVG-Pfade, keine eingebetteten Rasterbilder und keine von installierten Systemschriften abhängigen SVG-Texte. Farben: Basilico `#1B5E20`, Pomodoro `#D32F2F`, Crema `#F9F5EA`, Oro `#D4A038`, Carbone `#1F1F1F`. Das rote App-Zeichen verwendet eine dezente dunklere Rotabstufung.

Die Schriftkonturen basieren auf **Playball** (Schriftzug) und **Lato** (Untertitel), jeweils SIL Open Font License 1.1. Quellen: [Google Fonts Playball](https://github.com/google/fonts/tree/main/ofl/playball), [Google Fonts Lato](https://github.com/google/fonts/tree/main/ofl/lato). Lizenztexte liegen unverändert neben dieser Datei. Das geometrische Mützen-/Pizza-Motiv und die Unterstreichung sind projektspezifische Vektoren.

## PNG-Varianten

| Datei | Größe | Zweck |
| --- | --- | --- |
| `public/favicon-32.png` | 32 × 32 | PNG-Favicon-Fallback |
| `public/apple-touch-icon.png` | 180 × 180 | Apple-Touch-Icon |
| `public/icons/icon-192.png` | 192 × 192 | PWA „any“ |
| `public/icons/icon-512.png` | 512 × 512 | PWA „any“ |
| `public/icons/icon-maskable-512.png` | 512 × 512 | PWA „maskable“ |

Apple-/PWA-PNGs haben einen vollflächigen roten Hintergrund. Die Plattform kann ihre eigene Eckenmaske anwenden. Die maskierbare Variante rückt das Zeichen zusätzlich nach innen. SVGs sind die skalierbaren Master; alle PNGs wurden aus diesen Vektoren abgeleitet.

## Bildmotiv und Schrift

`dough-hero.webp` (1200 × 720) und `dough-hero-small.webp` (640 × 384) sind für dieses Projekt generierte, eigenständige Teigaufnahmen. Keine Fotos aus fremden Websites, keine Personen und keine Abhängigkeit von einem externen Bilddienst. Das Original wurde über die integrierte Bildgenerierung erstellt, anschließend lokal komprimiert. Die App nutzt responsives `<picture>` statt das Referenzbild nachzubauen oder als Screenshot einzubinden.

`public/fonts/playball-latin.woff2` ist die lokal eingebundene lateinische Playball-Schrift für „Benvenuto!“. Die übrige Oberfläche nutzt native Systemschriften. Es gibt keine Google-Fonts-Netzwerkanfrage zur Laufzeit. Schriftdatei, Bilder und die zusätzlich unter `public/fonts/Playball-OFL.txt` ausgelieferte Schriftlizenz werden im Service Worker vorgehalten.

## Prüfung und Pflege

`npm run verify:branding` prüft PNG-Signaturen/Abmessungen, SVG-Pfade ohne eingebettete Fremdinhalte, Bild-/Schriftbudgets, Lizenzen sowie die Einbindung in HTML, Manifest und Cache-Konfiguration. Der Produktionsbuild führt diese Prüfung automatisch aus. Eine visuelle Kontrolle der Originale und der kleinen Icongrößen gehört zusätzlich zur Freigabe.

Die vorhandenen generischen Modul-Icons bleiben leichte projektspezifische Linien-SVGs. Sie erhalten eine einheitliche Strichstärke und grüne Grundfarbe; das neue Kochmützen-Icon kennzeichnet den Pizza-Piloten.

Manuelle Rasterprüfung: Apple-/PWA-PNGs sind vollständig deckend; das helle Zeichen des maskierbaren Icons liegt innerhalb der kreisförmigen Sicherheitszone (gemessener Radius etwa 178 px bei 205 px sicherem Radius auf 512 × 512). Helle und dunkle Logo-Variante wurden auf ihren vorgesehenen Flächen visuell kontrolliert.
