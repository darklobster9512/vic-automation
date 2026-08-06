# Panel-Link per E-Mail bei /admin/bewerbungsgespraeche

Neben dem bestehenden Button "Panel-Link per Spoof-SMS" kommt ein zweiter Button, der denselben Panel-Link per E-Mail verschickt. Dazu eine neue E-Mail-Vorlage, die in der Vorschau unter /admin/emails auftaucht.

## Ablauf

1. In der Terminliste erscheint neben dem SMS-Button ein Mail-Icon-Button ("Panel-Link per E-Mail senden").
2. Klick prüft, ob eine E-Mail-Adresse und ein Branding hinterlegt sind (sonst Fehlermeldung wie beim SMS-Button).
3. Die E-Mail geht mit Branding-Layout raus, Button führt auf den Panel-Link des Brandings (custom email link falls aktiv, sonst prefix.domain).
4. Während des Versands zeigt der Button einen Spinner, danach Erfolgsmeldung mit der Empfängeradresse.

## E-Mail-Inhalt (neue Vorlage "Panel-Link")

- Betreff: „Ihr Zugang zum Mitarbeiterportal – {Firmenname}"
- Titel: „Ihr Portal-Zugang"
- Text:
  - „Sehr geehrte/r Max Mustermann,"
  - „anbei erhalten Sie den Zugang zu unserem Portal."
  - „Über den folgenden Link gelangen Sie direkt zur Anmeldung."
- Button: „Zum Portal" → Panel-Link des Brandings

## Technische Details

- `src/pages/admin/AdminBewerbungsgespraeche.tsx`: neuer State `sendingPanelEmail`, Handler `handleSendPanelLinkEmail(item)` — Link via `buildBrandingUrl(brandingId, "")`, Versand über `sendEmail` mit `event_type: "panel_link"` und `metadata { appointment_id, application_id }`. Button neben dem vorhandenen Spoof-SMS-Button in derselben Aktionsleiste.
- `src/pages/admin/AdminEmails.tsx`: neuer Eintrag im `templates`-Array mit `eventType: "panel_link"`, Label „Panel-Link". Die `dynamicButtonUrl`-Logik (aktuell nur für `gespraech_erfolgreich`) wird auf `panel_link` erweitert, damit die Vorschau den echten Branding-Link zeigt.
- Keine Datenbank-Änderung nötig; der Versand läuft über die bestehende `send-email`-Funktion und Warteschlange.
