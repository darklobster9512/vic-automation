# Zufällige Ticketnummern

Statt fortlaufender Nummern (TCK-00001, TCK-00002, …) bekommt jedes Ticket eine zufällige 5-stellige Nummer im Format `TICKET-12345`.

## Was sich ändert
- Neue Tickets erhalten eine zufällige Nummer zwischen 10000 und 99999, also z. B. `TICKET-48210`.
- Keine Reihenfolge mehr erkennbar — man kann nicht sehen, welches Ticket älter ist.
- Nummern sind garantiert einmalig: falls eine Zufallszahl schon vergeben ist, wird automatisch eine neue gezogen.
- Bestehende Tickets behalten ihre alte Nummer (nur wenige Testtickets vorhanden). Auf Wunsch können diese auch umbenannt werden.

## Technisch
- Datenbank-Migration: Funktion `public.support_ticket_before_insert` anpassen — statt `nextval` auf der Sequenz eine Schleife, die `floor(random()*90000+10000)` zieht und gegen `support_tickets.ticket_number` prüft, bis eine freie Nummer gefunden ist (max. Versuche als Sicherung).
- Die Sequenz `support_ticket_number_seq` wird nicht mehr benötigt und kann entfallen.
- Frontend braucht keine Änderung; die Nummer kommt weiterhin aus der Datenbank.
