# Blacklist-Sperre für den öffentlichen Buchungslink

## Ziel
Auf `/bewerbungsgespraech/buchen` sollen Bewerber, die bereits bei einem anderen Branding in der Datenbank stehen (Blacklist), keinen Termin mehr buchen können. Das gilt ausschließlich für diesen öffentlichen Link — Bewerber, die über ihren persönlichen Link (`/bewerbungsgespraech/:id`) buchen, sind nie betroffen.

## Verhalten
- Pro Branding gibt es einen Schalter „Blacklist-Sperre für öffentliche Buchung“ — standardmäßig **aus**.
- Ist er aus: alles wie bisher.
- Ist er an: beim Absenden des Formulars wird geprüft, ob die E-Mail **oder** die Telefonnummer bereits bei einem anderen Branding als Bewerbung existiert.
- Treffer → keine Bewerbung wird angelegt, stattdessen erscheint ein Ablehnungs-Screen im Branding-Design:
  „Ihre Bewerbung kann leider nicht berücksichtigt werden — Sie haben sich bereits bei zu vielen Unternehmen beworben.“ (kein Buchungsformular mehr, kein Zurück-Button ins Formular)

## Umsetzung (technisch)

1. **Migration**: neue Spalte `brandings.blacklist_block_public_booking boolean not null default false`.

2. **Admin-UI** (`src/pages/admin/AdminBrandingForm.tsx`): Switch für das neue Feld, Beschreibung „Blockiert Buchungen über /bewerbungsgespraech/buchen, wenn E-Mail oder Telefonnummer bereits bei einem anderen Branding existiert.“

3. **Edge Function `submit-application`**: neues optionales Feld `public_booking=true` im FormData.
   - Nur wenn `public_booking` gesetzt ist **und** das Branding-Flag aktiv ist, läuft die Prüfung (Service-Role-Query, damit RLS nicht stört):
     - E-Mail (lowercase) in `applications` mit `branding_id <> branding_id`
     - Telefonnummer normalisiert (nur Ziffern, Vergleich der letzten 9 Stellen) gegen die Nummern anderer Brandings
   - Treffer → HTTP 403 mit `{ error: "blacklisted", code: "blacklisted" }`, keine Bewerbung, keine Mail/SMS/Telegram.

4. **Frontend** (`src/pages/BewerbungsgespraechPublic.tsx`):
   - Sendet `public_booking=true` mit (nur auf dem exakten Pfad `/bewerbungsgespraech/buchen`).
   - Bei Antwort-Code `blacklisted` → neuer Screen-State `rejected` statt Toast, mit Branding-Logo, Warn-Icon und der Ablehnungsmeldung.

## Nicht betroffen
- Der persönliche Buchungslink `/bewerbungsgespraech/:id` und der Admin-Annahme-Flow bleiben unverändert.
