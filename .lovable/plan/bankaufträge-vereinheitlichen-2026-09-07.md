# Bankaufträge vereinheitlichen

Alle Bankdrop-Aufträge in allen Brandings bekommen dieselben Arbeitsschritte, Bewertungsfragen und erforderlichen Anhänge – jeweils mit korrektem Bank-Namen und korrekter Website. Alle anderen Felder (Titel, Prämie, Stunden, Beschreibung, Projektziel) bleiben unverändert.

## Betroffene Aufträge

Bestehende Bankdrop-Aufträge (24), verteilt auf mehrere Brandings:

- Deutsche Bank (4)
- DKB (4)
- Norisbank (1)
- BBVA (3)
- Santander (1)
- Consorsbank (2)
- ING Diba (2)
- 1822direkt (2) – Deutsche-Bank-Anhangsschema mit Website `1822direkt.de`
- Postbank (2) – Deutsche-Bank-Anhangsschema mit Website `postbank.de`
- Labelident (4) – bleibt unverändert (kein Bank-Ident-Auftrag)

Zusätzlich neu: **Comdirect** wird für jedes Branding neu angelegt, das aktuell mindestens einen Bankdrop-Auftrag hat.

21btc bleibt komplett unverändert.

## Einheitliche Arbeitsschritte

6 Schritte (Website erkunden, Videochat, WebID + SMS-TAN, Hinweise beachten, Bewertung, Prüfung & Feedback) – Text wörtlich wie vom Nutzer vorgegeben; „Bank XYZ" und Website-URL werden je Auftrag ersetzt.

## Einheitliche Bewertungsfragen

Die 5 vorgegebenen Fragen (Website Gesamteindruck, Navigation & Inhalte, Identprozess Ablauf, Videochat, Gesamtbewertung).

## Erforderliche Anhänge pro Bank

| Bank | Anhänge |
|---|---|
| Deutsche Bank | webID-Bestätigung, Deutsche Bank ID, Einmalcode, Willkommensschreiben + Karte |
| DKB | webID-Bestätigung, Willkommensschreiben + Karte |
| Norisbank | webID-Bestätigung, Noris ID, Einmalcode, Willkommensschreiben + Karte |
| BBVA | WebID-Bestätigung, App-Löschung |
| Santander | webID-Bestätigung, Benutzername, iTAN-Liste, Willkommensschreiben + Karte |
| Consorsbank | Postident-Bestätigung, Onlinekennung & Passwort, TAN-Brief |
| ING Diba | Postident-Bestätigung, Willkommensschreiben + Bankkarte |
| Comdirect | Postident-Bestätigung, Willkommensschreiben + Bankkarte |
| 1822direkt | webID-Bestätigung, 1822-ID, Einmalcode, Willkommensschreiben + Karte |
| Postbank | webID-Bestätigung, Postbank ID, Einmalcode, Willkommensschreiben + Karte |

## Technische Umsetzung

- SQL-Update auf `public.orders` für alle betroffenen IDs: setzt `work_steps`, `review_questions`, `required_attachments`.
- Für Comdirect: `INSERT` pro Branding mit Titel-Muster „Bewertung / Analyse & Evaluierungsprozess – Identprozess Comdirect", `order_type='bankdrop'`, Stunden/Prämie=0, gleicher Werte-Set wie oben.
- Keine SMS, keine E-Mails, keine Telegram-Notifications.
