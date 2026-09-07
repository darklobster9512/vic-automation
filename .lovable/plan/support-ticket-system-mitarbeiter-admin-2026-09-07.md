# Support-Ticket-System (Mitarbeiter + Admin)

Ein vollwertiges Ticketsystem: Mitarbeiter erstellen und verfolgen Tickets im Mitarbeiter-Portal, das Team bearbeitet sie im Admin-Panel unter einem neuen Reiter "Tickets".

## Mitarbeiter-Portal

Neuer Menüpunkt "Support" (`/mitarbeiter/support`):
- Liste aller eigenen Tickets mit Betreff, Kategorie, Status-Badge, letzter Aktivität und ungelesen-Punkt.
- "Neues Ticket": Betreff, Kategorie (Auftrag, Bezahlung, Vertrag, Technik, Sonstiges), Priorität (Niedrig/Normal/Hoch), Beschreibung, optionale Dateianhänge (Bilder/PDF).
- Detailansicht als Verlauf: Nachrichten von Mitarbeiter und Support im Wechsel, Antwortfeld mit Anhang, Live-Aktualisierung ohne Neuladen.
- Mitarbeiter kann ein Ticket selbst schließen und ein geschlossenes wieder öffnen.

## Admin-Panel

Neuer Sidebar-Eintrag "Tickets" (`/admin/tickets`, Bereich Betrieb):
- Tabs: Offen, In Bearbeitung, Wartet auf Mitarbeiter, Gelöst, Geschlossen, Alle – jeweils mit Anzahl.
- Filter nach Branding (folgt dem aktiven Branding), Kategorie, Priorität sowie Suche nach Name/Betreff/Ticketnummer.
- Sortierung nach Aktivität; Badge mit Anzahl unbeantworteter Tickets in der Sidebar.
- Detailansicht: Ticketverlauf, interne Notizen (für den Mitarbeiter unsichtbar), Antwortfeld, Statuswechsel, Priorität ändern, Zuweisung an einen Admin, Mitarbeiter-Kurzinfos mit Link zum Mitarbeiterprofil.
- Antwortvorlagen (Textbausteine) pro Branding, analog zum Livechat.
- Massenaktionen: mehrere Tickets schließen bzw. Status setzen.

## Benachrichtigungen

- Telegram-Nachricht an das passende Branding-Ziel bei neuem Ticket und bei jeder Mitarbeiterantwort (neues Event `ticket_neu` / `ticket_antwort`).
- E-Mail an den Mitarbeiter, wenn der Support antwortet (direkter Versand, keine Warteschlange).
- Ungelesen-Markierungen für beide Seiten.

## Technische Umsetzung

Datenbank (Migration):
- `support_tickets`: `ticket_number` (fortlaufend, z.B. `TCK-00123`), `contract_id`, `user_id`, `branding_id`, `subject`, `category`, `priority`, `status`, `assigned_to`, `last_message_at`, `unread_for_admin`, `unread_for_user`, `closed_at`, Zeitstempel + Update-Trigger.
- `support_ticket_messages`: `ticket_id`, `sender_role` (`user`/`admin`), `created_by`, `content`, `attachment_url`, `is_internal`, `created_at`.
- Grants für `authenticated` und `service_role`; RLS: Mitarbeiter sehen/schreiben ausschließlich eigene Tickets und dort keine internen Notizen; Admin voll; `kunde` nur Tickets der eigenen Brandings über `user_branding_ids`; `caller` kein Zugriff.
- Trigger setzt `branding_id` aus dem Vertrag, aktualisiert `last_message_at` und Ungelesen-Flags.
- Realtime für beide Tabellen (`REPLICA IDENTITY FULL`).
- Anhänge im bestehenden Bucket `chat-attachments` unter `tickets/<ticket_id>/…` mit passenden Storage-Policies.

Frontend:
- Neue Seiten `src/pages/mitarbeiter/MitarbeiterSupport.tsx` und `src/pages/admin/AdminTickets.tsx` (+ Detail-Panel), Routen in `App.tsx`, Einträge in `MitarbeiterSidebar.tsx` und `AdminSidebar.tsx`.
- Gemeinsamer Hook `useSupportTickets` mit Realtime-Subscription inkl. Cleanup.
- Styling nach den bestehenden Vorgaben: Admin im Premium-Card-Look, Mitarbeiter im hellen Attendflow-Stil.
