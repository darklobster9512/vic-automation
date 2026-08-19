# Umbuchungs-Shortlink in der Mailbox-SMS

## Ziel
Die Mailbox-SMS ("Wir konnten Sie zum vereinbarten Gesprächstermin telefonisch leider nicht erreichen…") enthält künftig einen kurzen Link, über den der Bewerber selbst einen neuen Gesprächstermin buchen kann.

## Vorgehen

1. **Neuer Platzhalter `{link}`** in der SMS-Vorlage `gespraech_erinnerung`.
   - Vorlagentext wird ergänzt, z. B.: `Wir konnten Sie zum vereinbarten Gesprächstermin telefonisch leider nicht erreichen. Bitte buchen Sie hier einen neuen Termin: {link}`
   - In der Vorlagen-Übersicht (`/admin/sms-vorlagen`) wird `{link}` als verfügbarer Platzhalter angezeigt.

2. **Admin-Panel (`/admin/bewerbungsgespraeche`, Mailbox-Button)**
   - Beim Vorbereiten der Mailbox-SMS wird die Buchungs-URL des Bewerbers (`/bewerbungsgespraech/<application_id>` auf der Branding-Domain) erzeugt und über die bestehende Shortlink-Funktion zu `https://<branding-domain>/r/<code>` verkürzt.
   - Der Kurzlink ersetzt `{link}` im Vorschautext, damit im Dialog exakt der Text steht, der versendet wird.

3. **Caller-API (`caller-api` Edge Function)**
   - Die Actions `set_mailbox` und `send_reminder` (inkl. Vorschau) erzeugen serverseitig denselben Shortlink (Eintrag in `short_links` per Service-Role) und ersetzen `{link}`.
   - Ohne verfügbaren Link wird der Platzhalter sauber entfernt, statt `{link}` im Text stehen zu lassen.

## Technische Details
- Shortlink-Logik im Frontend: `src/lib/createShortLink.ts` (bereits genutzt bei Bewerbungsannahme).
- Ziel-URL via `buildBrandingUrl(branding_id, "/bewerbungsgespraech/<app-id>")`.
- In der Edge Function wird das Kürzen inline nachgebaut (Code generieren, `short_links` Insert, URL aus Branding-Domain zusammensetzen).
- Zeichenlänge: Kurzlink hält die SMS unter 160 Zeichen, sofern der Vorlagentext knapp bleibt.
