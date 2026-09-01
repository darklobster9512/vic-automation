# Fix: SMS enthält den Text „{link}“ statt eines Links

## Was geprüft wurde
- Die SMS-Logs (`sms_logs`, Event `vertrag_genehmigt`, heute 10:10–10:14 Uhr) enthalten alle wörtlich `{link}`, während `{name}` korrekt ersetzt wurde.
- In `short_links` wurde im gleichen Zeitraum **kein** Eintrag angelegt (letzter Eintrag 09:25 Uhr, ein Bewerbungsgespräch-Link).
- Im Code gibt es nur eine Stelle, die diese SMS verschickt: `handleApprove` in `src/pages/admin/AdminArbeitsvertraege.tsx` — dort wird der Shortlink erzeugt und `{link}` ersetzt.

Fazit: Die Genehmigungen liefen über eine **alte, im Browser/Published-Build gecachte Version** der Seite. Der neue Code wurde nie ausgeführt, deshalb blieb `{link}` stehen. Die Vorlage in der Datenbank war bereits aktualisiert – daher der sichtbare Platzhalter.

## Lösung: Ersetzung serverseitig absichern
Der Client darf nicht die einzige Instanz sein, die `{link}` auflöst. Die Edge Function ist sofort aktiv, unabhängig vom Browser-Cache.

1. **`send-sms` Edge Function erweitert**
   - Nimmt optional `contract_id` (bzw. `link_target`) entgegen.
   - Enthält der Text noch `{link}` und ist eine `contract_id` vorhanden: Edge Function baut die Buchungs-URL (`https://<branding-domain>/erster-arbeitstag/<id>`), legt einen Shortlink in `short_links` an und setzt ihn ein.
   - Bleibt danach immer noch ein unaufgelöster Platzhalter übrig (`{...}`), wird er entfernt statt versendet – nie wieder wörtliches `{link}` in einer SMS.

2. **Client übergibt die Contract-ID**
   - `AdminArbeitsvertraege.tsx` sendet beim Genehmigen zusätzlich `contract_id` mit; die bestehende clientseitige Shortlink-Erzeugung bleibt als schneller Weg erhalten.

3. **Neu veröffentlichen**
   - Nach dem Fix muss die App neu publiziert und die Admin-Seite einmal hart neu geladen werden (Strg+Shift+R), damit der aktuelle Build läuft.

## Betroffene Dateien
- `supabase/functions/send-sms/index.ts`
- `src/pages/admin/AdminArbeitsvertraege.tsx`
- `src/lib/sendSms.ts` (Parameter `contract_id`)

## Nachträglich
Auf Wunsch: den 5 betroffenen Personen (Esraa Yilmaz, Denis Cosic, Nele Dickmann, Isabella Haßler, Ervin Tamas) die SMS mit korrektem Link erneut senden.
