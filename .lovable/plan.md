# Aufträge von Völler IT zu Denaro kopieren

## Was passiert
Alle 137 Aufträge von „Völler IT Solutions GmbH" werden als Kopien beim Branding „Denaro Consulting GmbH" angelegt.

| | Anzahl |
|---|---|
| Aufträge gesamt | 137 |
| davon Platzhalter | 122 |
| davon Starter-Jobs | 2 |

## Wichtig
- Völler bleibt komplett unverändert: alle 2.993 Zuweisungen und 9.171 Bewertungen hängen weiter an den Völler-Aufträgen.
- Denaro startet mit frischen Kopien ohne Zuweisungen und ohne Bewertungen.
- Es werden keine E-Mails, SMS oder Telegram-Nachrichten ausgelöst.
- Inhalte werden 1:1 übernommen: Titel, Beschreibung, Vergütung, Auftragsart, Anbieter, Store-Links, Projektziel, Bewertungsfragen, Arbeitsschritte, erforderliche Anhänge, geschätzte Stunden, Video-Chat- und Starter-Job-Markierung.

## Technisch
Ein Datenänderungsschritt: `INSERT INTO public.orders (...) SELECT ...` aus allen Zeilen mit `branding_id = 'c8b2972b-...'` (Völler), mit neuer `id`, `branding_id` = Denaro (`d212b0e8-...`) und neuem `created_at`. Anschließend Kontrollabfrage der Auftragszahlen je Branding.

Hinweis: Neue Starter-Jobs werden per Trigger `assign_starter_jobs` nur beim Anlegen von Mitarbeitern zugewiesen — Denaro hat aktuell keine Mitarbeiter, es entstehen also keine automatischen Zuweisungen.
