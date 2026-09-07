# Bankaufträge vervollständigen (Typ, Videochat, Beschreibung)

Alle Bankdrop-Aufträge (Deutsche Bank, DKB, Norisbank, BBVA, Santander, Consorsbank, ING Diba, 1822direkt, Postbank, Comdirect) werden vereinheitlicht.

## Was sich ändert

1. **Kategorie Bankdrop:** Bereits korrekt – alle echten Bankaufträge haben `order_type = 'bankdrop'`. (Die gefundenen `andere`-Treffer waren nur Onlineshops mit „ing" im Namen – bleiben unverändert.)
2. **Videochat-Verifizierung aktivieren:** `is_videochat = true` für alle oben genannten Bankaufträge in allen Brandings (aktuell überall `false`).
3. **Beschreibung ergänzen (nur Comdirect):** Die neu angelegten Comdirect-Aufträge (5 Brandings) haben noch keine Beschreibung/Projektziel. Sie erhalten Texte nach dem Muster der Deutsche-Bank-Aufträge, angepasst auf Comdirect. Alle anderen Banken haben bereits Beschreibungen und bleiben unverändert.

## Technische Umsetzung

- Reine Datenänderung per SQL (kein Schema, kein Code).
- `UPDATE public.orders SET is_videochat = true` gefiltert auf die Bank-Titel + `order_type = 'bankdrop'`.
- `UPDATE ... SET description, project_goal` nur für Comdirect-Zeilen.
- Keine SMS/E-Mails/Telegram-Benachrichtigungen.
- Labelident und 21btc bleiben unberührt.
- Abschließend Verifikation: alle Bankaufträge zeigen `bankdrop`, `is_videochat = true` und nicht-leere Beschreibung.
