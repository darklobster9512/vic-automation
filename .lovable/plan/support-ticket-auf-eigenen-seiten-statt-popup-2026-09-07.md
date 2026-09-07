# Support-Ticket auf eigenen Seiten statt Popup

## Was sich ändert

- `/mitarbeiter/support` bleibt die Übersicht mit der Ticket-Liste. Der Button "Neues Ticket" öffnet kein Fenster mehr, sondern führt auf eine eigene Seite.
- `/mitarbeiter/support/neu` ist eine vollwertige Seite zum Erstellen: Betreff, Kategorie, Priorität, Beschreibung, mehrere Bilder/PDFs. Oben ein "Zurück"-Link, unten "Ticket erstellen" und "Abbrechen".
- Nach dem Erstellen landet man direkt im neuen Ticket.
- `/mitarbeiter/support/:id` zeigt das Ticket als eigene Seite: Verlauf, Anhänge, Antwortfeld, Schließen/Wiederöffnen — ebenfalls mit "Zurück zur Übersicht".

Damit ist jeder Schritt eine echte Seite, die man verlinken, teilen und mit dem Zurück-Knopf des Browsers bedienen kann.

## Technische Umsetzung

- Neue Routen in `src/App.tsx` unter dem Mitarbeiter-Layout: `support/neu` und `support/:id`.
- `src/pages/mitarbeiter/MitarbeiterSupport.tsx` behält nur die Liste; `selectedId`/`createOpen`-State und die Dialoge entfallen, Klicks navigieren per `useNavigate`.
- Neue Datei `src/pages/mitarbeiter/MitarbeiterSupportNeu.tsx`: übernimmt die Logik aus `CreateTicketDialog` (Insert mit `ticket_number: ""`, Erstnachricht, Anhänge über `uploadTicketAttachment`, Telegram `ticket_neu`), danach `navigate(/mitarbeiter/support/<id>)`.
- Neue Datei `src/pages/mitarbeiter/MitarbeiterSupportDetail.tsx`: übernimmt `TicketDetail`, liest `id` per `useParams`, lädt das Ticket selbst (statt per Prop), setzt `unread_for_user=false`, Antworten mit Telegram `ticket_antwort`.
- Beide neuen Seiten nutzen wie bisher `useOutletContext<{ contract, branding }>()` und die Hooks aus `src/hooks/useSupportTickets.ts`.
- Unbekanntes/fremdes Ticket: Hinweis plus Link zurück zur Übersicht.
- Styling bleibt im bestehenden hellen Mitarbeiter-Look (weiße Cards, `rounded-2xl`).
- Abschluss: `npx tsgo --noEmit`.
