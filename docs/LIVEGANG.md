# Ciao! · Einrichtung und Freigabe zum Livegang

**Stand: 3. November 2026. Noch nicht veröffentlicht.**
Die Datenbank ist vorbereitet; für einen zuverlässigen öffentlichen Betrieb müssen
E-Mail-Versand, GitHub-Konfiguration und ein echter Konto-Test noch abgeschlossen werden.
Keine Passwörter oder geheimen Schlüssel in den Chat oder ins Repository kopieren.

## 1. Was schon erledigt ist

- Bestehendes Supabase-Projekt **ciao-pizza** gefunden und verbunden.
- Projekt-ID: **jhweepsclnottxqgppqf**.
- Projekt-URL: **https://jhweepsclnottxqgppqf.supabase.co**.
- Drei private Tabellen und die transaktionale Speicherfunktion angelegt.
- Migration `20261103112111_private_workspaces.sql` im Projekt angewendet und versioniert.
- RLS, fremde Konten, unangemeldete Zugriffe, Konflikte und Wiederholungen geprüft.
- Lokale öffentliche Build-Konfiguration vorbereitet; kein Secret Key verwendet.
- GitHub-Pages-Workflow vorbereitet, aber **nicht gestartet**.

## 2. Supabase: Anmeldung per E-Mail-Code aktivieren

Öffne [dein Supabase-Projekt](https://supabase.com/dashboard/project/jhweepsclnottxqgppqf).
Die folgenden Einstellungen sind über den vorhandenen Connector nicht les-/änderbar;
sie müssen im Dashboard geprüft werden.

### A. E-Mail-Anmeldung

1. Links **Authentication** öffnen.
2. **Sign In / Providers** bzw. **Providers** wählen, dann **Email**.
3. E-Mail-Anmeldung aktivieren und neue E-Mail-Registrierungen erlauben.
4. Anonyme Anmeldung nicht aktivieren. Die Datenbank lässt sie ohnehin nicht zu.

### B. Produktiven Mailversand eintragen

1. Unter **Authentication → Email → SMTP Settings** bzw. **Custom SMTP** öffnen.
2. Einen eigenen E-Mail-Dienst verwenden. Er liefert dir **Host**, **Port**,
   **Benutzername** und **SMTP-Passwort**.
3. Diese vier Werte ausschließlich hier eintragen. Als Absender eine beim Dienst
   verifizierte Adresse deiner Domain, als Absendername **Ciao!** wählen.
4. SMTP aktivieren und speichern. Den Domain-Verifizierungsanweisungen des
   gewählten Maildienstes folgen.

Der Supabase-Standardversand ist laut Anbieter nicht für öffentlichen Produktivbetrieb
vorgesehen und kann nur vorab erlaubte Adressen beliefern. Bei neuen Free-Projekten
sind angepasste Vorlagen ohne eigenen SMTP-Dienst zusätzlich gesperrt.
Es wurden keine kostenpflichtigen Dienste oder Tarife für dich gebucht.

### C. Code statt Anmeldelink senden

1. **Authentication → Email Templates** öffnen.
2. **Magic Link** auswählen. Den Inhalt durch Folgendes ersetzen und speichern:

```html
<h2>Dein Ciao!-Anmeldecode</h2>
<p>{{ .Token }}</p>
<p>Gib diesen Code in Ciao! ein. Wenn du ihn nicht angefordert hast, ignoriere diese E-Mail.</p>
```

3. Dasselbe für **Confirm signup** einstellen, damit auch das erste Anmelden einen
   Code enthält. Betreff z. B. **Dein Ciao!-Anmeldecode**.
4. Die App erwartet einen Code in der geöffneten App, keinen Klick auf einen
   Magic Link. Die Platzhalterklammern `{{ .Token }}` genau so stehen lassen.

### D. Projektadresse vorbereiten

1. **Authentication → URL Configuration** öffnen.
2. **Site URL** auf `https://marcelbeh.github.io/ciao-pizza/` setzen.
3. Dieselbe Adresse bei **Redirect URLs** ergänzen.
4. Für einen lokalen Abnahmetest zusätzlich dessen tatsächliche Adresse erlauben,
   z. B. `http://localhost:4173/ciao-pizza/`. Host und Port müssen passen.

Die Code-Anmeldung verwendet keine URL-Tokens. Damit kollidieren Auth-Links nicht
mit dem vorhandenen Hash-Routing. Die URL-Einstellungen bereiten auch die übrigen
Supabase-E-Mails korrekt vor.

## 3. GitHub: öffentliche Konfiguration eintragen

Öffne [marcelbeh/ciao-pizza](https://github.com/marcelbeh/ciao-pizza).

1. **Settings → Secrets and variables → Actions → Variables** öffnen.
2. **New repository variable** anklicken.
3. Name **VITE_SUPABASE_URL**, Wert **https://jhweepsclnottxqgppqf.supabase.co**, speichern.
4. Nochmals **New repository variable**.
5. Name **VITE_SUPABASE_PUBLISHABLE_KEY**.
6. In Supabase **Project Settings → API Keys** öffnen. Den aktiven **Publishable**
   Key namens **default** kopieren. Er beginnt mit **sb_publishable_**.
7. Diesen öffentlichen Key als Wert der GitHub-Variable speichern.

Alternativ sind gleichnamige Actions-Secrets möglich. Es sind hier **nur öffentliche
Frontend-Werte** vorgesehen. Niemals `service_role`, `sb_secret_…`, ein
Datenbankpasswort oder SMTP-Passwort eintragen. Der Build lehnt andere Key-Arten ab.
Die gespeicherten GitHub-Variables/Secrets können mit dem vorhandenen Connector
nicht geprüft oder gesetzt werden; ihr Status ist daher noch offen.

## 4. GitHub Pages vorbereiten – noch nicht veröffentlichen

1. **Settings → Pages** öffnen.
2. Bei **Build and deployment → Source** **GitHub Actions** auswählen.
3. **Settings → Environments → github-pages** öffnen/anlegen.
4. Wenn verfügbar, **Required reviewers** aktivieren und eine freigebende Person
   auswählen. Deployment-Branches auf **main** beschränken.
5. **Noch keinen Workflow ausführen.** Die Source-Einstellung allein veröffentlicht
   den vorbereiteten Feature-Branch nicht.

Der Workflow hat keinen Push-/Merge-Auslöser. Er akzeptiert ausschließlich den
Branch `main` und den manuell eingegebenen Freigabetext **FREIGEGEBEN**.

## 5. Daten übernehmen und einen echten Konto-Test machen

1. Die aktualisierte App zunächst lokal als Produktionsvorschau öffnen.
2. Mit deiner eigenen E-Mail-Adresse anmelden, Code aus dem Postfach eingeben.
3. Falls lokale Daten gefunden werden, prüfen, ob sie dir gehören. Dann
   **Lokale Daten in dieses Konto übernehmen** anklicken.
4. Warten, bis oben **Mit Supabase synchronisiert** erscheint. Die bisherigen
   lokalen Daten werden nicht gelöscht. Beim Import liegt zusätzlich eine private
   Originalkopie in `ciao_import_backups`.
5. Im Teigstudio ein Profil speichern, Hydration ändern und die Seite neu laden.
   Prüfen, ob Plan und Profil erhalten bleiben. Pilot und Rechner wie gewohnt testen.
6. Auf einem zweiten Browser/Gerät mit demselben Konto anmelden: der Cloud-Stand
   muss erscheinen. Mit einem anderen Konto dürfen diese Daten nicht erscheinen.
7. Nach dem ersten Online-Abruf offline gehen, einen Wert ändern und die Verbindung
   wiederherstellen. Der Sync-Status muss erst „offline“, später „synchronisiert“ anzeigen.
8. Über **Sicherung herunterladen** eine zusätzliche JSON-Kopie speichern.

**Wichtig bei alten lokalen Daten:** IndexedDB gehört zu einer exakten Browseradresse
(Host und Port). GitHub Pages kann Daten von `localhost` oder einer früheren Vorschau
nicht direkt lesen. Die aktualisierte Vorschau deshalb zuerst unter genau der alten
Adresse öffnen, dort importieren und synchronisieren. Alternativ eine dort erzeugte
Ciao!-JSON-Sicherung auf dem neuen Gerät über **Sicherung importieren** einlesen.
Ein anderer Port allein macht vorhandene Daten bereits unsichtbar; sie sind damit
nicht gelöscht. Keine Browserdaten löschen, bevor Übernahme/Sicherung bestätigt ist.

**Bei Konflikten:** „Beide Stände sicher zusammenführen“ behält den lokalen aktiven
Plan und sichert den Cloud-Plan als zusätzliches Profil. Kollisionen werden als
Kopien erhalten; komplette Originale liegen zusätzlich im privaten Datenbankarchiv.
Gelöschte Profile können dabei zur Sicherheit erneut auftauchen. Beim P1-Limit von
100 Profilen wird abgebrochen statt gekürzt – vorher eine Sicherung herunterladen.

## 6. Erst nach ausdrücklicher Freigabe live schalten

Diese Schritte wurden bewusst **nicht** durchgeführt:

1. P0-PR #1 prüfen und freigeben/mergen.
2. P1-PR #2 auf `main` umstellen, prüfen und freigeben/mergen.
3. Den Supabase-/Pages-Folge-PR auf `main` umstellen, nach grünem CI prüfen und mergen.
4. Sicherstellen, dass die Punkte 2–5 dieser Anleitung abgeschlossen sind.
5. **Actions → GitHub Pages — manuell freigegebener Livegang → Run workflow** öffnen.
6. Branch **main** wählen, **FREIGEGEBEN** eingeben, **Run workflow** anklicken.
7. Falls eingerichtet, die zusätzliche Environment-Freigabe bestätigen.
8. Erst nach erfolgreichem Deployment die Zieladresse
   `https://marcelbeh.github.io/ciao-pizza/` prüfen: Anmeldung, Plan, Profile,
   direkter Hash-Link, Reload, Installation auf iPhone/Safari und Offline-Neustart.

Ein erfolgreicher lokaler Build ersetzt diese Abnahme nicht. Die App gilt erst nach
konfiguriertem Mailversand, echtem Konto-Test und freigegebenem Deployment als live.

## Quellen

[Supabase E-Mail-Codes](https://supabase.com/docs/guides/auth/auth-email-passwordless),
[Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp),
[Free-Tier-Vorlagen](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier),
[GitHub Pages mit Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
