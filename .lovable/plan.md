# Bewertungen: Platzhalter-Button + kein SMS-Versand

## Ausgangslage (geprüft)
- In der Datenbank ist aktuell kein Auftrag als Platzhalter markiert: 1107 "Andere", 99 Bankdrop, 36 Exchanger. Deshalb erscheint der Platzhalter-Button auf /admin/bewertungen nie.
- Der Sammel-Genehmigen-Ablauf (Starter-Jobs und Platzhalter) verschickt bereits keine SMS. Die einzige Nachricht, die dort ausgelöst wird, ist die Einladung zur Vertragsdatenerfassung, sobald beide Starterjobs eines Mitarbeiters genehmigt sind.

## Was gemacht wird

1. Auftragstypen bereinigen (alle Brandings)
   - Alle Aufträge, die weder Bankdrop noch Exchanger sind, werden als Platzhalter gekennzeichnet.
   - Titel, Prämien, Stunden, Beschreibungen, Zuweisungen und Bewertungen bleiben unverändert.
   - Starterjob-Kennzeichnung (Thalia, Seeberger) bleibt erhalten; diese Aufträge sind dann Platzhalter und Starterjob zugleich und erscheinen in beiden Sammel-Buttons.

2. Erkennung im Panel robuster machen
   - Auf /admin/bewertungen gilt ein Auftrag als Platzhalter, wenn der Typ "Platzhalter" ist oder das Platzhalter-Kennzeichen gesetzt ist.
   - Der Button "Alle Platzhalter genehmigen (ohne SMS)" wird im Reiter "In Überprüfung" immer angezeigt, mit Anzahl; ist nichts offen, ist er ausgegraut.

3. Nachrichtenversand absichern
   - Beide Sammel-Buttons genehmigen weiterhin ohne SMS und ohne E-Mail an den Mitarbeiter.
   - Ausnahme bleibt bewusst: Sind beide Starterjobs eines Mitarbeiters genehmigt, geht wie bisher die Einladung raus, die Vertragsdaten auszufüllen.
   - Die Bestätigungsmeldung nach dem Lauf weist Genehmigungen, offene Anhänge, Fehler und versendete Einladungen getrennt aus.

## Technische Details
- SQL-Update auf `orders`: `order_type = 'platzhalter'`, `is_placeholder = true` für alle Zeilen mit `order_type NOT IN ('bankdrop','exchanger')`.
- `src/pages/admin/AdminBewertungen.tsx`: `is_placeholder` in Order-Select und `GroupedReview` aufnehmen, Filter- und Button-Logik auf `order_type === 'platzhalter' || is_placeholder` umstellen, Platzhalter-Button dauerhaft rendern (disabled bei 0).
- `handleApproveAllSilent` bleibt unverändert (kein `sendSms`/`sendEmail`), nur `maybeSendGespraechErfolgreichEmail` nach Abschluss.
