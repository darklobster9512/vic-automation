## Ziel
Der Elitegateway SMS-Spoof API Key wird künftig pro Branding in der Datenbank gespeichert und verwendet – analog zum bestehenden `seven_api_key`. Der Edge-Function-Secret dient nur noch als Fallback.

## Umsetzung

1. **Datenbank (Migration)**
   - Neue Spalte `elitegateway_api_key text` in `public.brandings` (nullable).
   - Bestehende RLS-Policies gelten unverändert (nur Admin/Kunde-Zugriff wie bei `seven_api_key`).

2. **Branding-Formular** (`src/pages/admin/AdminBrandingForm.tsx`)
   - In der Card „SMS-Konfiguration" ein neues Passwort-Feld „Elitegateway Spoof API Key" direkt unter dem Seven.io-Feld.
   - Hinweistext: „Wird für SMS-Spoofing dieses Brandings verwendet. Leer = globaler Fallback-Key."
   - Feld in Schema, Defaults, Laden und Speichern ergänzen (max. 200 Zeichen, optional).

3. **Edge Function** (`supabase/functions/sms-spoof/index.ts`)
   - Beim Senden zuerst `elitegateway_api_key` des übergebenen `brandingId` aus `brandings` laden (Service-Role-Client).
   - Wenn vorhanden → diesen Key verwenden; sonst Fallback auf `ELITEGATEWAY_API_KEY` aus den Secrets.
   - Fehlt beides → klare Fehlermeldung „Kein Elitegateway API Key für dieses Branding konfiguriert".

4. **Aufrufer prüfen**
   - Sicherstellen, dass `AdminSmsSpoof.tsx` und `AdminProbetag.tsx` beim Invoke immer `brandingId` mitsenden (aus `useBrandingFilter`), damit der richtige Key gezogen wird.

## Technische Hinweise
- Der Key wird als Klartext in der Tabelle gespeichert (wie `seven_api_key` und `resend_api_key` bereits heute) und nur serverseitig in der Edge Function gelesen.
- Kein Verhaltensbruch: Brandings ohne eigenen Key funktionieren weiter über das Secret.
