# Störungs-Mails hängen in der Warteschlange

## Was aktuell passiert
- SMS gehen direkt raus, deshalb kommen sie an.
- E-Mails werden über die interne Warteschlange (`email_queue`) verschickt. Aktuell liegen dort **94 Mails auf „pending"** vom heutigen Versand — keine wurde abgearbeitet.
- Grund: Es gibt keinen aktiven Zeitplan, der die Warteschlange leert. Die zuständige Funktion `process-email-queue` existiert, wird aber von niemandem regelmäßig aufgerufen (nur `send-appointment-reminders` läuft stündlich).
- Ergebnis: Solange nichts die Warteschlange abarbeitet, bleibt jede neue Störungs-Mail einfach liegen.

## Vorschlag zur Behebung
1. **Sofort**: Warteschlange einmalig manuell abarbeiten, damit die 94 wartenden Störungs-Mails jetzt rausgehen.
2. **Dauerhaft**: Einen Minutentakt (Cronjob) einrichten, der `process-email-queue` automatisch alle 60 Sekunden aufruft. Damit werden alle künftigen E-Mails wieder zuverlässig zugestellt — nicht nur die Störungs-Info, auch alle anderen automatischen Mails.
3. **Optional**: Beim Störungs-Dialog eine Option „sofort senden (ohne Warteschlange)" anbieten (nutzt den bereits vorhandenen Direktversand-Modus). Nur sinnvoll, wenn Punkt 2 nicht ausreicht.

## Technische Details
- Migration: `pg_cron`-Job „process-email-queue-minutely" mit `*/1 * * * *`, ruft per `net.http_post` die Edge-Function `process-email-queue` auf (analog zum bestehenden Reminder-Job).
- Einmaliger manueller Aufruf der Function nach Deploy, um die 94 Pending-Einträge sofort zu leeren.
- Optional Punkt 3: `bypass_queue: true` an `sendEmail` in `DomainAnnouncementDialog.tsx` durchreichen, hinter einem Checkbox-Schalter im Dialog.
