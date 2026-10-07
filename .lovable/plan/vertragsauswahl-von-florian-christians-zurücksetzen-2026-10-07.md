# Vertragsauswahl von Florian Christians zurücksetzen

Es gibt zwei Konten von Florian Christians:
- **Denaro** (florian.christians1973@gmail.com): hat „Teilzeit“ ausgewählt, Status „offen“, noch nicht eingereicht.
- **Codebricks** (designer1905@gmail.com): hat noch gar keine Vertragsform gewählt, hier muss nichts geändert werden.

## Was passiert
- Beim Denaro-Vertrag wird die gewählte Vertragsform entfernt. Danach kann er im Portal die Vertragsform neu auswählen.
- Seine anderen Daten bleiben erhalten: Login, Aufträge, Chat, Termine, Guthaben und schon eingetragene persönliche Angaben.
- Es gehen keine E-Mails oder SMS raus.

## Technische Details
Update auf `employment_contracts` id `4d0e247b-579d-4369-8a9e-c10261dacb69`: `template_id = NULL`, `employment_type = NULL`, `contract_dismissed = false`. Status bleibt „offen“.
