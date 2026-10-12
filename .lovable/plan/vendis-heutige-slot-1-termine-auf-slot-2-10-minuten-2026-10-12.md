# Vendis: heutige Slot-1-Termine auf Slot 2 (+10 Minuten)

Heute (Mo, 12.10.2026) liegen 14 Termine auf Slot 1. Alle Slot-2-Termine liegen auf :00/:20/:40, die neuen Zeiten auf :10/:30/:50, es gibt also keine Kollision.

| Name | Alt (Slot 1) | Neu (Slot 2) |
|---|---|---|
| Julian Rößner | 09:00 | 09:10 |
| Jens Dreßler | 09:20 | 09:30 |
| Martin Uhlenbrock | 09:40 | 09:50 |
| Aarav Bharti | 10:00 | 10:10 |
| Paton Crisci | 10:20 | 10:30 |
| Mario Marschner | 11:00 | 11:10 |
| Sena Cil-Bayrak | 11:20 | 11:30 |
| Pascal Zabalawi | 11:40 | 11:50 |
| Deric Njeik | 12:00 | 12:10 |
| Sandra Greifeneder | 12:20 | 12:30 |
| Emre Erdem | 12:40 | 12:50 |
| Angelika Rohrmoser | 13:20 | 13:30 |
| Alexandra Kornek | 13:40 | 13:50 |
| Sebastian Hege | 14:00 | 14:10 |

Hinweis: Drei Termine (12:10, 12:30, 12:50) fallen in die Slot-2-Mittagspause (12:00–13:00). Sie werden trotzdem so verschoben, wenn du nichts anderes sagst.

- Status und alle übrigen Daten bleiben unverändert.
- Es gehen keine E-Mails, SMS oder Telegram-Nachrichten raus.

## Technisch
Ein Update auf `interview_appointments` für die 14 Termin-IDs: `slot_index = 2`, `appointment_time + 10 Minuten`. Danach prüfe ich, dass es keine Doppelbelegung gibt.
