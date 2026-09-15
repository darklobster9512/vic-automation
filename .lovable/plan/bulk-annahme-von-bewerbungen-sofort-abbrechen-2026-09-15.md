# Bulk-Annahme von Bewerbungen sofort abbrechen

## Ziel

Den laufenden automatischen Versand (Annahme offener Bewerbungen bei Codebricks, PointView, Topscale, Vendis mit E-Mail/SMS pro Bewerbung) komplett und sofort stoppen, damit keine weiteren Bewerbungen angenommen und keine weiteren Nachrichten verschickt werden.

## Schritte

1. **Cron-Job entfernen** – Den pg_cron-Job `bulk-accept-applications` per `cron.unschedule` sofort löschen, damit alle 2 Minuten kein neuer Stapel mehr startet.
2. **Lauf markieren** – Den Datensatz in `bulk_accept_runs` auf `status = 'stopped'` setzen (mit `finished_at = now()`), damit auch ein gerade laufender Stapel danach nichts mehr fortsetzt.
3. **Bereits versendete Annahmen bleiben unverändert** – Was schon verschickt wurde, bleibt wie es ist (kein Rückbau von Status oder Nachrichten).

## Was nicht geändert wird

- Keine Änderungen an Bewerbungs-Status, die bereits gesetzt wurden.
- Keine Änderungen an anderen Cron-Jobs (z. B. die einmalige Codebricks-Portal-Info am 14.09. bleibt bestehen, sofern du nichts anderes sagst).
- Keine Benachrichtigungen durch diese Wartungsaktion.

## Technischer Hinweis

Danach kannst du mir sagen, was falsch lief (z. B. falsche Zielgruppe, falsche Nachrichten, falsches Timing) – dann baue ich den Ablauf entsprechend um oder lasse ihn ganz weg.
