# Kennenlerngespräch-Buchung: E-Mails & Karriere-Link

## 1. Keine "Bewerbung angenommen"-Mail bei Direktbuchung
Wer sich über `/buchen` oder `/bewerbungsgespraech/buchen` einträgt, wird weiterhin automatisch akzeptiert, bekommt aber keine Annahme-Mail mehr.

- `BewerbungsgespraechPublic.tsx` sendet zusätzlich das Feld `skip_acceptance_email=true` an `submit-application`.
- `submit-application` überspringt bei gesetztem Flag den Mailversand (Telegram-Benachrichtigung und SMS-Logik bleiben unverändert).
- Andere Wege (Admin-Annahme, Caller-API, externe Formulare mit `auto_accept`) senden die Mail weiterhin.

## 2. Karriere-Link in der Terminbestätigung
Die Mail "Terminbestätigung – Kennenlerngespräch" (in `src/pages/Bewerbungsgespraech.tsx`) bekommt dieselbe Fußzeile wie die Annahme-Mail:
"Besuchen Sie auch unsere Karriereseite: https://<domain>/karriere" — Domain aus dem Branding (custom_email_link bevorzugt, sonst `domain`), analog zur bestehenden Logik.

## 3. Karriere-Link auf den Buchungsseiten
Auf `/buchen` und `/bewerbungsgespraech/buchen` wird unterhalb der Karte ein dezenter, klickbarer Hinweis auf die Karriereseite des jeweiligen Brandings angezeigt (gleiche Domain-Logik wie in den E-Mails). Wenn kein Domain hinterlegt ist, wird nichts angezeigt.

## 4. Links in E-Mails anklickbar machen
Aktuell werden URLs in `body_lines` / `footer_lines` als reiner Text ausgegeben.

- In beiden HTML-Buildern (`src/lib/buildEmailHtml.ts` und der Kopie in `supabase/functions/process-email-queue/index.ts`) werden URLs (`http(s)://…`) beim Rendern automatisch in `<a href="…">`-Tags mit Brandfarbe und Unterstreichung umgewandelt.
- Gilt damit für alle bestehenden Mails (Annahme, Terminbestätigung, Panel-Link usw.) ohne Änderung der Aufrufer.

## Technische Details
- Geänderte Dateien: `src/pages/BewerbungsgespraechPublic.tsx`, `src/pages/Bewerbungsgespraech.tsx`, `src/lib/buildEmailHtml.ts`, `supabase/functions/submit-application/index.ts`, `supabase/functions/process-email-queue/index.ts`.
- Edge Functions `submit-application` und `process-email-queue` werden neu deployed.
- Linkify läuft vor keiner HTML-Escaping-Stufe zusätzlicher Art; bestehende, bereits als HTML übergebene Zeilen bleiben unangetastet (nur nackte URLs werden ersetzt).
