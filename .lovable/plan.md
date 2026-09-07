# Störungs-Mails hängen in der Warteschlange

## Was aktuell passiert
- SMS gehen direkt raus, deshalb kommen sie an.
- E-Mails werden über die interne Warteschlange (`email_queue`) verschickt. Aktuell liegen dort **94 Mails auf „pending"** vom heutigen Versand — keine wurde abgearbeitet.
- In den Laufzeitprotokollen gibt es **keinen einzigen Aufruf** von `process-email-queue`. Deshalb sieht auch Resend nichts: Die Mails verlassen die Datenbank derzeit überhaupt nicht.
- Bestätigter Grund: Es gibt keinen aktiven Zeitplan, der die Warteschlange leert. Die zuständige Funktion existiert, wird aber von niemandem regelmäßig aufgerufen (nur `send-appointment-reminders` läuft stündlich).
- Ergebnis: Solange nichts die Warteschlange abarbeitet, bleibt jede neue Störungs-Mail einfach liegen.

## Vorschlag zur Behebung
1. **Sofort**: Warteschlange einmalig manuell abarbeiten, damit die 94 wartenden Störungs-Mails jetzt rausgehen.
2. **Dauerhaft**: Einen Minutentakt (Cronjob) einrichten, der `process-email-queue` automatisch alle 60 Sekunden aufruft. Damit werden alle künftigen E-Mails wieder zuverlässig zugestellt — nicht nur die Störungs-Info, auch alle anderen automatischen Mails.
3. Den Störungs-Dialog auf Direktversand umstellen, damit weitere Störungs-Mails nicht erst auf den Minutentakt warten und ein Fehler sofort sichtbar wird.
4. Danach Queue-Status und Resend-Ergebnis kontrollieren; fehlgeschlagene Datensätze werden mit der konkreten Resend-Fehlermeldung ausgewiesen.

## Technische Details
- Migration: `pg_cron`-Job „process-email-queue-minutely" mit `*/1 * * * *`, ruft per `net.http_post` die Edge-Function `process-email-queue` auf (analog zum bestehenden Reminder-Job).
- Wiederholte manuelle Aufrufe der Function nach Einrichtung, bis die 94 Pending-Einträge vollständig verarbeitet wurden (pro Aufruf werden aktuell fünf E-Mails beansprucht).
- `bypass_queue: true` wird für neue Sendungen aus `DomainAnnouncementDialog.tsx` gesetzt.
