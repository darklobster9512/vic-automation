# Abfrage beim Seitenaufruf entfernen

## Was passiert aktuell

Beim Laden einer Seite mit dem Live-Chat fragt die Seite sofort und ungefragt nach der Erlaubnis für Browser-Benachrichtigungen. Chrome zeigt diese Abfrage je nach Gerät und Version mit der Formulierung „… möchte: Auf andere Apps und Dienste auf diesem Gerät zugreifen".

Das ist die einzige Berechtigung, die die Seite anfordert. Es gibt keine Anfragen nach Kamera, Mikrofon, Standort, Bluetooth oder Dateien.

## Änderung

- Die automatische Berechtigungsabfrage beim Laden wird entfernt.
- Die Abfrage erscheint künftig nur noch, wenn ein Mitarbeiter das Chat-Fenster selbst öffnet – also bewusst, im passenden Moment.
- Wer die Erlaubnis bereits erteilt hat, bekommt weiterhin Chat-Benachrichtigungen; es ändert sich nichts an den Nachrichten selbst.

## Hinweis

Falls die Meldung danach im Lovable-Vorschaufenster weiterhin auftaucht, kommt sie von der Vorschau-Umgebung selbst und nicht von der Seite. Auf der veröffentlichten Domain tritt sie dann nicht auf.

## Technisch

`src/components/chat/ChatWidget.tsx`: `Notification.requestPermission()` aus dem Mount-Effect entfernen und stattdessen beim Öffnen des Chats (`open === true`, Permission `default`) einmalig anfordern. Die Anzeige-Logik in `onNewMessage` bleibt unverändert.
