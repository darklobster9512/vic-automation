# Julia Roxana Einloft: Account "verschwunden" – Ursache und Fix

## Was tatsächlich passiert ist

Der Account existiert noch. Nichts wurde gelöscht.

Bestätigt per Datenbank-Abfrage:
- Auth-User `de8b9b4c…` (juliar.einloft@gmail.com) existiert, erstellt 05.08.2026 08:08, letzter Login 05.08.2026 12:27. Metadaten enthalten korrekt "Julia Roxana Einloft" und Telefon.
- Ihr Vertrag `9d8e4447…` (Branding LIMEX Solutions) existiert ebenfalls, Status `offen` – aber `first_name`, `last_name`, `email`, `phone` sind **NULL**.
- Genau deshalb erscheint sie nicht in `/admin/mitarbeiter`: Die Liste filtert dort hart mit `.not("first_name", "is", null)`.
- Und deshalb stehen ihre beiden genehmigten Bewertungen unter "Unbekannt".

Bei der Registrierung wurden die Namen mitgeschrieben (der Code in `Auth.tsx` schreibt sie, und die Auth-Metadaten belegen, dass die Felder ausgefüllt waren). Die Felder wurden also **nachträglich geleert**.

Die einzige Stelle im Code, die diese Felder auf `null` setzen kann, ist der Auto-Save im Arbeitsvertrag-Formular (`MitarbeiterArbeitsvertrag.tsx`, Zeile ~147-182): Er schreibt bei jeder Formularänderung `first_name: formData.first_name || null` usw. Der Schutz `initialLoadDone` wird auf `true` gesetzt, **auch wenn das Laden des Vertrags keine Daten geliefert hat** (z. B. kurzzeitig fehlgeschlagene/leere Abfrage direkt nach dem Login). In dem Fall ist das Formular leer, der Auto-Save feuert und überschreibt die vorhandenen Namen mit NULL. Das passt exakt zum Zeitpunkt ihres Logins um 12:27.

Es ist bisher ein Einzelfall – projektweit gibt es genau diesen einen Vertrag mit User-Account und leeren Namen.

## Fix

1. **Daten reparieren**: Vertrag `9d8e4447…` wieder mit Name, E-Mail und Telefon aus Auth-Metadaten/Profil befüllen. Damit taucht sie sofort wieder in `/admin/mitarbeiter` auf und die Bewertungen zeigen ihren Namen.

2. **Auto-Save absichern** (`src/pages/mitarbeiter/MitarbeiterArbeitsvertrag.tsx`):
   - `initialLoadDone` nur setzen, wenn der Vertrag tatsächlich geladen wurde (`cd` vorhanden).
   - Im Update-Payload leere Felder nicht mehr auf `null` schreiben: nur Felder senden, die einen Wert haben, damit ein leeres Formular nie bestehende Daten löschen kann.

3. **Anzeige robuster machen**:
   - `/admin/mitarbeiter`: Filter `first_name is not null` entfernen und stattdessen als Fallback Profil-/Bewerbungsname bzw. E-Mail anzeigen, damit kein Mitarbeiter mehr unsichtbar wird.
   - `/admin/bewertungen`: Name-Fallback-Kette Vertrag → Profil → Bewerbung → E-Mail statt "Unbekannt".

## Technische Details

- Datenreparatur per SQL-Update auf `employment_contracts` (nur diese eine Zeile).
- Keine Schemaänderung nötig.
