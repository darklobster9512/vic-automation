# 21btc: Videochat aktivieren und Idents abschließen

## Ziel
- Der Auftrag "Prozessanalyse - App & Website 21btc" hat in allen 9 Brandings die Videochat-Verifizierung aktiv.
- Jeder Mitarbeiter, der zu 21btc bereits eine Bewertung abgegeben hat, erscheint unter /admin/idents nicht mehr als ausstehend, sondern als abgeschlossen.

## Ausgangslage (geprüft)
- 9 21btc-Aufträge vorhanden, davon aktuell nur 1 mit aktivierter Videochat-Verifizierung.
- 130 Bewertungen zu 21btc, daraus 66 eindeutige Mitarbeiter-Auftrag-Paare.
- Für 53 dieser Paare fehlt bisher ein Ident-Eintrag; die vorhandenen sind bereits abgeschlossen.

## Umsetzung
1. Videochat-Verifizierung für alle 9 21btc-Aufträge einschalten.
2. Für die 53 fehlenden Paare je einen Ident-Eintrag mit Status "abgeschlossen" anlegen (verknüpft mit Auftrag, Mitarbeiter, Zuweisung und Branding).
3. Eventuell vorhandene 21btc-Idents mit offenem Status ebenfalls auf abgeschlossen setzen.
4. Ergebnis prüfen: keine 21btc-Idents mehr im Status ausstehend, sofern eine Bewertung existiert.

## Hinweise
- Es werden keine SMS, E-Mails oder Telegram-Nachrichten ausgelöst.
- Reine Datenänderung, keine Änderung an der Oberfläche.
