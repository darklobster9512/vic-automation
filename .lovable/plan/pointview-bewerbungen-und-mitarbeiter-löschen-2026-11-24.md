# PointView: Bewerbungen und Mitarbeiter löschen

Betroffen ist nur das Branding **PointView GmbH** (2de5a23d-72e1-48bc-bc0f-9e8c11f3181c).

## Was gelöscht wird
- 149 Bewerbungen
- 64 Vorstellungsgespräche sowie Probetag- und 1.-Arbeitstag-Termine dieser Bewerbungen
- 52 Arbeitsverträge, davon 25 Mitarbeiter mit Login
- Zu den Verträgen: Auftragszuweisungen, Bewertungen und Entwürfe, Anhänge, Auftragstermine, Ident-Sessions, Arbeitstag-Vorbereitungen, Livechat-Nachrichten und Support-Tickets
- Die 25 Logins samt Profil und Rolle. Keiner davon ist bei einem anderen Branding angestellt oder hat eine Admin-, Kunden- oder Caller-Rolle.

## Was bleibt
- Das Branding selbst mit seinen Einstellungen, Vorlagen, Telefonnummern und Zeitplänen
- Die 127 PointView-Aufträge
- SMS- und E-Mail-Protokolle
- Es werden keine E-Mails, SMS oder Telegram-Nachrichten verschickt.

## Technische Details
- Löschen in einer Transaktion, in Abhängigkeitsreihenfolge: Kinddaten der Verträge, dann die Verträge, die Termine, die Bewerbungen, `user_roles`/`profiles` und zuletzt `auth.users` (nur die 25 Nutzer-IDs).
- Danach prüfe ich nach, dass für dieses Branding 0 Bewerbungen und 0 Verträge übrig sind.
- Das lässt sich nicht rückgängig machen. Vorher am besten unter /admin/backups ein Backup erstellen.
