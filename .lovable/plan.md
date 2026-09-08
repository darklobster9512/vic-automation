# Branding-Name in Telegram-Benachrichtigung für neue Bewerbungen

## Ziel
Wenn eine neue Bewerbung eingegangen ist, soll die Telegram-Benachrichtigung zusätzlich den Namen des Brandings enthalten, damit Empfänger sofort erkennen, für welches Unternehmen die Bewerbung gilt.

## Änderungen

### 1. Öffentliche Bewerbung (`supabase/functions/submit-application/index.ts`)
- Beim Abrufen der Branding-Daten für `created_by` auch `company_name` selektieren.
- Diesen Namen als `brandingName` an `buildTelegramMessage` übergeben.
- Die bestehende Nachrichtenstruktur bleibt unverändert; der Branding-Name erscheint als Footer (`🏢 <Firma>`).

### 2. Manuelle Bewerbung im Admin-Panel (`src/pages/admin/AdminBewerbungen.tsx`)
- In der `createMutation`-Erfolgs-Callback den Branding-Namen anhand der bereits geladenen `brandings`-Liste ermitteln.
- `sendTelegram` mit `brandingName` aufrufen.
- Massenimport bleibt unverändert (dort wird aktuell keine Telegram-Nachricht versendet, um Spam zu vermeiden).

## Technische Details
- `buildTelegramMessage` unterstützt bereits `brandingName` als Footer.
- Es werden keine Datenbank-Änderungen benötigt.
- Nach Genehmigung wird die Edge Function `submit-application` neu deployt.

## Validierung
- TypeScript-Check mit `bunx tsgo --noEmit -p tsconfig.app.json`.
- Edge Function deployen (`supabase/functions/deploy` bzw. entsprechendes Tool nach Freigabe).
