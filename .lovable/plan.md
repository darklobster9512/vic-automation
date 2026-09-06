# TAN nur vom aktuell aktiven Auftrag anzeigen

## Problem
Eine Rufnummer wird nacheinander für mehrere Aufträge verwendet. Aktuell kann eine TAN angezeigt werden, die zu einem bereits abgeschlossenen (oder abgebrochenen) Auftrag gehört — sie bleibt im Widget stehen bzw. wird beim nächsten Auftrag erneut ausgeliefert.

## Ziel
Im Widget erscheint eine TAN nur dann, wenn sie zum aktuell laufenden Auftrag gehört und innerhalb dessen Laufzeit eingetroffen ist. TANs aus abgeschlossenen oder abgebrochenen Aufträgen werden nie angezeigt.

## Umsetzung

### 1. SMS-Erfassung (`sms-inbox-watch`)
Beim Erkennen einer WebID-TAN wird die Sitzung nicht mehr blind als „zuletzt aktualisiert" gewählt, sondern:
- nur Sitzungen zur selben Rufnummer mit Status `waiting` oder `data_sent` (also aktiv), 
- davon die zuletzt gestartete.
Gibt es keine aktive Sitzung, wird die TAN nicht gespeichert (sie gehört zu keinem laufenden Auftrag).

### 2. Abfrage (`webid-ident-lookup`)
- Beim Suchen nach dem Ident-Link (`/aid/<id>`) werden aktive Sitzungen (`waiting`, `data_sent`) bevorzugt; abgeschlossene/abgebrochene Sitzungen dienen nur noch zum Ermitteln von E-Mail und Rufnummer, nie für die TAN.
- Die TAN wird nur zurückgegeben, wenn die gefundene Sitzung aktiv ist **und** `last_tan_at` nach dem Start der Sitzung liegt (`created_at`). Ältere TANs aus früheren Aufträgen fallen damit weg.
- Zusätzliche Sicherheitsgrenze: TANs, die älter als der Sitzungsbeginn sind, werden ignoriert; abgeschlossene Sitzungen liefern immer `tan: null`.

### 3. Widget (neue Skriptversion `webid_skript_universal_v19.sh`)
- Liefert die Abfrage keine TAN mehr, wird eine zuvor angezeigte TAN wieder auf „–" mit laufendem Countdown zurückgesetzt (kein Nachleuchten alter TANs).
- Grüne Darstellung (#07fb05) und 0-Format der Rufnummer bleiben wie in v18.

## Nicht betroffen
Redirect-Logging, Proxy-/Certbot-Konfiguration, Telegram-Weiterleitung und Datenbankinhalte bleiben unverändert.
