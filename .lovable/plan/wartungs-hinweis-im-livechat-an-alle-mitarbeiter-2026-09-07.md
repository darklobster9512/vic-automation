# Wartungs-Hinweis im Livechat an alle Mitarbeiter

## Ziel
Jeder Mitarbeiter der Brandings Codebricks, LIMEX und Vendis bekommt im Livechat eine Nachricht von der Projektleitung/Support.

## Empfänger
- Codebricks: 152
- LIMEX: 447 (1 gesperrter Account wird ausgelassen)
- Vendis: 44 (1 gesperrter Account wird ausgelassen)
- Gesamt: 643 Mitarbeiter

Nur Mitarbeiter mit aktivem Konto, keine gesperrten.

## Nachrichtentext
"Hallo, wir hatten heute Wartungsarbeiten an unserem System. Dadurch kann es sein, dass einzelne Informationen in deinem Portal aktuell falsch oder unvollständig angezeigt werden. Falls dir etwas auffällt, eröffne bitte ein Support-Ticket unter „Support“ in deinem Portal – bitte nicht hier im Livechat melden. Unsere IT kümmert sich dann direkt darum. Vielen Dank für dein Verständnis!"

## Vorgehen
- Die Nachricht wird als Admin-Nachricht in den bestehenden Chat jedes Mitarbeiters eingetragen, mit aktuellem Zeitstempel und als ungelesen, damit sie im Portal auffällt.
- Es werden keine SMS, E-Mails oder Telegram-Benachrichtigungen ausgelöst.
- Mitarbeiter, die den Chat offen haben, sehen die Nachricht sofort (Live-Aktualisierung).

## Technisch
Ein einziger Insert in `chat_messages` (`sender_role = 'admin'`, `read = false`) je Vertrag, gefiltert über `employment_contracts.branding_id` der drei Brandings und `is_suspended = false`, `user_id is not null`. Kein Code-Deployment nötig, reiner Datenvorgang.
