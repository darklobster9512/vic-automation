# Ausweisdaten-Sammel-Extraktion pro Tag auf /admin/erster-arbeitstag

## Ziel
Neben jedem Tagesabschnitt (Heute, Morgen, Dienstag …) in der Tabelle von `/admin/erster-arbeitstag` erscheint ein kleiner klickbarer Text „Ausweisdaten extrahieren". Klick öffnet ein Popup, das für alle Mitarbeiter dieses Tages die Ausweisdaten per KI extrahiert und gesammelt anzeigt.

## Umsetzung

### 1. Tages-Header erweitern (`AdminErsterArbeitstag.tsx`)
- Im Day-Header (`showDayHeader`-Zeile) rechts neben dem Datum ein kleiner Text-Button „Ausweisdaten extrahieren" (IdCard-Icon, `text-xs`, muted).
- Klick öffnet einen neuen Dialog und übergibt alle `filteredItems` des jeweiligen Tages (gleiches `appointment_date`).

### 2. Extraktions-Dialog (neue Komponente `ExtractDayIdsDialog.tsx` unter `src/components/admin/`)
- Beim Öffnen: Für jeden Mitarbeiter des Tages sequentiell (mit kurzer Pause, um Rate-Limits zu schonen) die bestehende Edge Function `extract-id-data` aufrufen — gleiche Payload-Logik wie im KYC-Tab:
  - `front_url`, `back_url` (null bei Reisepass), `id_type`, `proof_of_address_url`
- Ergebnisformatierung identisch zum KYC-Tab (Name, Geburtsdatum/-ort, Adresse, Familienstand, Steuer-ID, Aktuelle Bank, Abweichungsblock).
- Anzeige im Dialog:
  - Fortschrittsanzeige („3 von 8 extrahiert …") mit Spinner pro Eintrag.
  - Pro Mitarbeiter eine Sektion mit Name als Überschrift und dem extrahierten Textblock (whitespace-pre-wrap).
  - Fehler pro Mitarbeiter werden angezeigt, blockieren aber nicht die anderen.
- Buttons: „Alle kopieren" (gesamter Text in Zwischenablage) und „Schließen".

### 3. Datengrundlage
- Die `employment_contracts`-Select im bestehenden Query um die KYC-Felder erweitern: `id_front_url, id_back_url, id_type, proof_of_address_url, marital_status, tax_id, bank_name, birth_date, birth_place, street, zip_code, city` (für die Abweichungsprüfung bereits vorhandene Felder wiederverwenden).
- Mitarbeiter ohne `id_front_url` werden im Dialog als „Kein Ausweis hinterlegt" markiert und übersprungen.

### 4. Wiederverwendung
- Extraktions- und Abweichungslogik aus `AdminMitarbeiterDetail.tsx` in eine kleine Shared-Helferfunktion (z. B. `src/lib/extractIdData.ts`) auslagern, damit KYC-Tab und Tages-Dialog denselben Code nutzen (kein Verhaltensunterschied).

## Technische Hinweise
- Keine DB-Änderungen nötig.
- Sequentielle Aufrufe (nicht parallel), um Gemini-Rate-Limits zu vermeiden; Abbruch beim Schließen des Dialogs.
- Typecheck nach Umsetzung ausführen.
