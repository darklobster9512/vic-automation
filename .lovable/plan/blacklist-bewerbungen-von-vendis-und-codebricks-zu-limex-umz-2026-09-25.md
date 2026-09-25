# Blacklist-Bewerbungen von Vendis und Codebricks zu LIMEX umziehen

## Umfang (geprüft)
Blacklist = dieselbe E-Mail existiert auch bei einem anderen Branding (gleiche Regel wie das rote Badge).

Wie beim letzten Mal nur Status „neu":
- Codebricks: 20
- Vendis: 17
- Summe: **37**

Nicht betroffen (bleiben beim bisherigen Branding): Codebricks 13 angenommen + 21 mit gebuchtem Termin, Vendis 10 angenommen + 13 mit gebuchtem Termin.

## Wichtig
- Keine E-Mails, SMS oder Telegram-Nachrichten.
- Nur das Branding ändert sich auf LIMEX; Status bleibt „neu", alle Daten bleiben erhalten.

## Technisch
`UPDATE public.applications SET branding_id = '086e5c75-5ae6-439d-8ff4-a3b63bdaed3c'` für `status = 'neu'` bei Codebricks/Vendis mit E-Mail-Treffer in einem anderen Branding. Danach Kontrollabfrage: 0 Blacklist-„neu" mehr bei beiden Brandings.
