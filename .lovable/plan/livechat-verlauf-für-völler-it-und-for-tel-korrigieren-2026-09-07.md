# Livechat-Verlauf für Völler IT und for.tel korrigieren

## Was aktuell falsch ist (geprüft)

1. **Alle Zeiten sind 2 Stunden zu spät.** Im Telegram-Export steht die Berliner Ortszeit (z. B. 06:50), zusätzlich der echte UTC-Zeitstempel (04:50). Beim Import wurde die Ortszeit als UTC gespeichert. Dadurch stehen alle wiederhergestellten Einträge 2 Stunden in der Zukunft.
2. **Die nachkonstruierten Antworten sitzen an der falschen Stelle.** Es wurde stur auf *jede* einzelne Mitarbeiternachricht eine Antwort 4 Minuten später gesetzt. Wenn jemand drei Nachrichten kurz hintereinander geschrieben hat, kommen erst drei Fragen und danach drei Antworten am Stück – der Verlauf wirkt durcheinander und teils unlogisch.
3. **Antworten passen inhaltlich nicht immer**, weil sie ohne Bezug auf den restlichen Gesprächsverlauf erzeugt wurden.

## Was gemacht wird

**Schritt 1 – Zeiten geradeziehen**
Alle in diesem Wiederherstellungslauf importierten Datensätze von Völler IT und for.tel werden um 2 Stunden zurückgesetzt: Bewerbungen, Kennenlerngespräche, Verträge, 1.-Arbeitstag-Termine, Bewertungen, Idents, Nachweise und Chatnachrichten. Termindatum und -uhrzeit der Gespräche bleiben unverändert, da diese im Export bereits als reine Uhrzeit gemeldet wurden.

**Schritt 2 – Chatverlauf neu aufbauen**
Die importierten Chatnachrichten beider Brandings werden gelöscht und sauber neu angelegt:

- Mitarbeiternachrichten bleiben 1:1 erhalten (Text und Originalzeitpunkt, jetzt korrekt in UTC).
- Aufeinanderfolgende Nachrichten derselben Person innerhalb von 20 Minuten gelten als **ein** Gesprächsbeitrag und bekommen **eine** Antwort.
- Die Antwort wird 2–6 Minuten nach der letzten Nachricht des Beitrags gesetzt, aber immer vor der nächsten Mitarbeiternachricht.
- Antworten werden pro Person mit dem **kompletten Verlauf als Kontext** neu erzeugt: deutsch, Du-Ansprache, kurz, im Ton von Projektleitung/Support, mit Bezug auf das jeweilige Anliegen (Vertrag, Termin, Auftrag, Lohn, Ident).
- Auf reine Anhangsnachrichten und auf letzte Nachrichten ohne erkennbares Anliegen ("okay", "danke") wird nur dann geantwortet, wenn es natürlich wirkt.
- Alle Antworten bleiben als KI-Rekonstruktion markiert.

**Schritt 3 – Kontrolle**
Stichproben mehrerer Verläufe: korrekte Abfolge Frage → Antwort, plausible Zeitabstände, keine doppelten oder verwaisten Antworten. Es werden keine SMS, E-Mails oder Telegram-Benachrichtigungen ausgelöst.

## Technisch

- Zeitkorrektur per SQL-Migration bzw. Datenupdate: `created_at`/`submitted_at`/`accepted_at`/`assigned_at`/`completed_at` der betroffenen Zeilen `- interval '2 hours'`, eingegrenzt auf die beiden Branding-IDs und den Zeitraum 10.08.–07.09.2026.
- Chat-Neuaufbau über eine temporäre Edge Function mit Service-Role (Löschen + Batch-Insert), die nach Abschluss wieder gelöscht wird.
- Antwortgenerierung über das Lovable AI Gateway, ein Aufruf pro Mitarbeiter mit dem gesamten Verlauf, parallelisiert.
- `chat_messages.sender_role`: `user` für Mitarbeiter, `admin` für rekonstruierte Antworten, `metadata.ai_reconstructed = true`.
