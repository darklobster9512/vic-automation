# Shortlink für 1.-Arbeitstag-Termin in der SMS

## Ziel
Wenn ein Arbeitsvertrag genehmigt wird, geht die E-Mail bereits mit dem Button „Termin für 1. Arbeitstag buchen“ raus. Künftig soll dieselbe Buchungs-URL zusätzlich als Kurzlink in der `vertrag_genehmigt`-SMS mitgeschickt werden.

## Vorgehen

1. **SMS-Vorlage `vertrag_genehmigt` um `{link}` erweitern**
   - Neuer Text (per Migration), z. B.: `Hallo {name}, Ihr Arbeitsvertrag wurde genehmigt! Bitte buchen Sie Ihren Termin für den 1. Arbeitstag: {link}`
   - In `/admin/sms-vorlagen` wird `{link}` als verfügbarer Platzhalter für diese Vorlage angezeigt.

2. **Kurzlink beim Genehmigen erzeugen** (`AdminArbeitsvertraege.tsx`, `handleApprove`)
   - Die schon berechnete Buchungs-URL (`/erster-arbeitstag/<contract-id>` auf der Branding-Domain) wird über die bestehende Shortlink-Funktion zu `https://<branding-domain>/r/<code>` verkürzt.
   - Der Kurzlink ersetzt `{link}` im SMS-Text; die E-Mail behält weiterhin den vollständigen Link im Button.
   - Fällt das Kürzen aus (Fehler), wird die vollständige URL eingesetzt; ist keine URL vorhanden, wird `{link}` sauber entfernt statt als Platzhalter zu bleiben.
   - Der Fallback-Text (falls keine Vorlage in der Datenbank existiert) enthält den Link ebenfalls.

## Technische Details
- Shortlink-Logik: `src/lib/createShortLink.ts` (Insert in `short_links`, URL via `buildBrandingUrl`).
- Betroffene Datei im Frontend: `src/pages/admin/AdminArbeitsvertraege.tsx` (Schritt 5 „Send SMS“) sowie `PLACEHOLDER_INFO` in `src/pages/admin/AdminSmsTemplates.tsx`.
- Datenbank: ein `UPDATE` auf `sms_templates` für `event_type = 'vertrag_genehmigt'`.
- Länge: Kurzlink hält die SMS unter 160 Zeichen.
