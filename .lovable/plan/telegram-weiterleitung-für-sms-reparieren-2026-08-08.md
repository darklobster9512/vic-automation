# Telegram-Weiterleitung für SMS reparieren

## Was ich geprüft habe

- Die Telegram-Konfiguration stimmt: Chat „limex SMS Überwachung" hat das Event `sms_empfangen` und das passende Branding.
- Der Watcher läuft und erkennt SMS: heute wurden um 09:07 und 09:27 zwei neue SMS auf SMSBot-Nummern erfasst und in `sms_inbox_seen` gespeichert.
- Trotzdem wurde nichts gesendet.

## Ursache

Die „Erstlauf"-Regel in der Funktion `sms-inbox-watch` greift pro Nummer, nicht einmalig fürs System: solange für eine Nummer (Rental) noch kein Eintrag in `sms_inbox_seen` existiert, gelten deren Nachrichten als Altbestand und werden nur als „gesehen" markiert, aber nicht verschickt.

Da jede neu gemietete Nummer beim ersten Auftauchen genau in diesem Zustand ist, werden ausgerechnet die frischen SMS auf neuen Nummern verschluckt. Genau das ist bei den beiden SMS von heute passiert.

Zusätzlich: die gespeicherten Anosim-Links liefern durchgehend `400 – No Share found` (abgelaufene Share-Tokens). Diese Nummern erzeugen nur Log-Rauschen und liefern keine SMS mehr.

## Lösung

1. **Erstlauf-Logik ersetzen**: Statt „erste Nachricht dieser Nummer = Altbestand" gilt künftig ein Zeitfenster — nur SMS, deren Empfangszeitpunkt älter als eine definierte Grenze ist (Vorschlag: 60 Minuten), werden stumm als gesehen markiert. Alles Frischere wird immer weitergeleitet, auch bei brandneuen Nummern.
2. **Fallback bei fehlendem Datum**: SMS ohne verwertbaren Zeitstempel gelten als neu und werden weitergeleitet (statt verschluckt).
3. **Anosim-Rauschen dämpfen**: Bei `400 – No Share found` wird der Eintrag als abgelaufen behandelt und nur noch selten (bzw. mit reduziertem Log-Level) abgefragt, damit die Logs lesbar bleiben.
4. **Verifikation**: Nach dem Fix eine Testnachricht über den bestehenden Weg auslösen und in den Function-Logs prüfen, dass der Telegram-Versand an Chat „limex SMS Überwachung" mit Status 200 durchgeht.

## Hinweis

Die beiden bereits erfassten SMS von heute Morgen sind als „gesehen" markiert und werden nicht nachträglich verschickt. Falls gewünscht, kann ich sie einmalig entmarkieren, damit sie beim nächsten Lauf nachgereicht werden.
