# Restliche Blacklist-Bewerbungen zu LIMEX

## Stand (geprüft)

Bei Codebricks, PointView, Topscale und Vendis gibt es **keine** Blacklist-Bewerbung mit Status „neu" mehr — der Transfer von 161 Bewerbungen hat vollständig funktioniert.

Was du in der Übersicht noch siehst, sind 37 Bewerbungen mit einem **weiter fortgeschrittenen Status**:

| Branding | angenommen | Termin gebucht |
|---|---|---|
| Codebricks | 1 | 11 |
| PointView | 4 | 7 |
| Topscale | 0 | 7 |
| Vendis | 3 | 4 |

Die waren beim letzten Mal bewusst ausgenommen, weil die Vorgabe „nur offene Bewerbungen" lautete.

## Was jetzt passieren soll

Diese 37 Bewerbungen ebenfalls dem Branding LIMEX zuordnen:

- Status bleibt unverändert (angenommen bzw. Termin gebucht)
- Bereits gebuchte Gesprächstermine bleiben bestehen und unverändert
- Alle Daten, Lebensläufe und Zeitstempel bleiben erhalten
- Es werden **keine** E-Mails, SMS oder Telegram-Nachrichten verschickt
- Keine Änderungen am Code

## Technisch

Ein einzelnes Update auf `applications`: `branding_id` = LIMEX (`086e5c75-5ae6-439d-8ff4-a3b63bdaed3c`) für alle Rows der vier Brandings, bei denen dieselbe E-Mail in einem anderen Branding existiert (identische Blacklist-Definition wie im Admin-Badge). Danach Kontrollabfrage, dass bei den vier Brandings keine Blacklist-Treffer mehr übrig sind.
