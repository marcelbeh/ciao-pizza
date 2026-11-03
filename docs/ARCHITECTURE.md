# Architekturentscheidungen P0

1. **Modularer Monolith:** Elf eigene Verzeichnisse und Route-Einstiege, gemeinsame
   Komponenten nur für wiederkehrende Darstellung. Modulmetadaten stehen zentral
   in der Registry. Keine fachliche Logik in P0. Spätere Anwendungsfälle und
   Domänenmodelle bleiben unabhängig von React und Infrastruktur.
2. **Abhängigkeiten nach innen:** Die IndexedDB-Infrastruktur implementiert den
   `KeyValueStore`-Port aus `core`. Fachliche Repository-Verträge erst ergänzen,
   wenn ihre Anforderungen bekannt sind. Keine vorsorglichen Services und keine
   leeren Domain-Klassen.
3. **Statisches Hosting:** HashRouter vermeidet 404 bei direkten Modul-Links auf
   GitHub Pages. Alle Assets liegen unter `/ciao-pizza/`; keine Root-URL-Annahmen.
4. **Offline-Shell:** Workbox precacht den Produktionsbuild samt lazy geladenen
   Routen. Noch keine Remote-Daten oder Laufzeit-API-Caches. Updates erst auf
   Nutzeraktion aktivieren, um spätere Eingaben nicht ungefragt zu verlieren.
5. **Persistenz:** Native IndexedDB vermeidet eine weitere Laufzeitabhängigkeit.
   Schemaänderungen müssen die Datenbankversion erhöhen und bestehende Daten
   explizit migrieren. Lokale Daten sind geräte- und originabhängig. Cloud-Sync,
   Konfliktlösung, Export, Auth und RLS sind ausdrücklich spätere Arbeiten.
6. **Design:** CSS/Tailwind-Tokens als gemeinsame Sprache; keine externe UI-Suite,
   Fonts, Bilderdienste oder Analytics. Native Links und Buttons, ausreichend
   große Touch-Ziele, Landmarken, Skip-Link und `prefers-reduced-motion`.
7. **Fehler:** Route-Fehler führen zu einer verständlichen Neu-laden-Ansicht,
   unbekannte Routen zu einer 404 mit Rückweg. Speicherfehler werden weitergereicht;
   spätere fachliche UI muss diese sichtbar behandeln und darf keine erfolgreiche
   Speicherung vortäuschen.

## Ein neues Modul erweitern

Die vorhandene `Page.tsx` durch die modulbezogene Darstellung ersetzen. Fachliche
Hooks/Anwendungsfälle neben dem Modul oder bei geteilter Verwendung in `core`
ergänzen. Datenzugriff über Ports und Adapter bereitstellen, nicht direkt aus
UI-Komponenten auf IndexedDB oder Supabase zugreifen. Neue fachliche Tests auf
Verhalten und relevante Fehlerfälle begrenzen.
