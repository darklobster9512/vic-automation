# Jede eingehende SMS automatisch an Telegram senden

## Ziel
Jede neue SMS von Anosim und SMSBot wird unabhängig davon, ob ein Mitarbeiter oder Admin eine Seite geöffnet hat, automatisch einmal an den für `sms_empfangen` eingerichteten Telegram-Chat gesendet.

## Umsetzung
1. Den vorhandenen zentralen SMS-Abruf `sms-inbox-watch` als dauerhaft unabhängigen Prozess aktivieren.
2. Einen Datenbank-Zeitplan einrichten, der den Abruf jede Minute startet; die Funktion prüft innerhalb dieses Laufs mehrfach, sodass neue SMS ungefähr alle 15 Sekunden erkannt werden.
3. Anosim-Nummern und alle brandingbezogenen SMSBot-Zugänge bei jedem Lauf prüfen – ohne Bezug zu einer geöffneten Ident-Seite und unabhängig vom Ident-Status.
4. Die bestehende Dubletten-Sperre über `sms_inbox_seen` beibehalten, damit jede SMS nur einmal an Telegram geht, auch wenn parallel eine Seite dieselbe Nummer abruft.
5. TAN-Weiterleitung getrennt lassen: Eine TAN wird nur bei einer aktiven Ident-Sitzung mit Status `data_sent` an die private Nummer weitergeleitet; die allgemeine Telegram-Meldung wird dagegen für jede neue SMS erzeugt.
6. Telegram-Fehler und Anbieterfehler sichtbar protokollieren, statt einen fehlgeschlagenen Versand als erfolgreich zu zählen.
7. Funktion bereitstellen und anschließend mit einem manuellen Lauf, Ausführungsprotokollen und dem aktiven Zeitplan prüfen.

## Festgestellter Ist-Zustand
- `sms-inbox-watch` enthält bereits den unabhängigen Abruf für beide Anbieter.
- In der Datenbank existiert aktuell nur der Zeitplan für Terminerinnerungen; `sms-inbox-watch` ist nicht eingeplant.
- Für `sms-inbox-watch` gibt es keine Ausführungsprotokolle.
- Die zuletzt erkannten Anosim-SMS wurden daher ausschließlich bei einem Seiten-/Proxyabruf erfasst.

## Technische Details
- Zeitplan: `* * * * *`
- Interne Durchläufe: vier Prüfungen mit jeweils etwa 15 Sekunden Abstand
- Idempotenzschlüssel: Anbieter + Quelle/Nummer + Nachrichten-Hash
- Telegram-Ereignis: `sms_empfangen`
