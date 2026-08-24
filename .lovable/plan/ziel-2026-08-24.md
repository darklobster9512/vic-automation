Panel-Link SMS: Text vor URL in Edge Function

## Ziel
Die Edge Function `caller-api` soll beim Versand eines Panel-Links per SMS nicht mehr nur die nackte URL verschicken, sondern einen kurzen Text davorstellen.

## Textvorlage
„Hallo {name}, hier gelangen Sie zu Ihrem Portal: {link}“

- `{name}` wird durch den Vor- und Nachnamen des Bewerbers ersetzt.
- `{link}` bleibt die bisherige Portal-URL.

## Änderungen

1. **`supabase/functions/caller-api/index.ts`**
   - In der Action `send_panel_link` wird der SMS-Text von `text: link` auf `Hallo ${name}, hier gelangen Sie zu Ihrem Portal: ${link}` geändert.
   - `name` wird aus `a.first_name` und `a.last_name` zusammengesetzt.

2. **`src/pages/admin/AdminBewerbungsgespraeche.tsx`**
   - In `handleSendPanelLinkSms` wird derselbe Textaufbau verwendet, damit Admin- und Caller-Panel-Link-SMS identisch sind.

3. **Deployment**
   - `caller-api` Edge Function wird neu deployed.

## Nicht im Scope
- E-Mail-Panel-Link bleibt unverändert.
- SMS-Template-System wird nicht umgebaut (nur Inline-Text für diese eine SMS-Art).
