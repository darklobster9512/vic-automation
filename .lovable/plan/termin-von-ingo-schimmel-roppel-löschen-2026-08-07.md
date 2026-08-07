# Termin von Ingo Schimmel-Roppel löschen

## Gefundener Eintrag (geprüft)

```text
Ingo Schimmel-Roppel
Fr, 07.08.2026 — 15:40 Uhr
Status: neu
```

## Was passiert

- Der Bewerbungsgespräch-Termin von Ingo Schimmel-Roppel am 07.08.2026 um 15:40 Uhr wird gelöscht.
- Die Bewerbung selbst bleibt bestehen; der Bewerber kann danach wieder einen Termin buchen.
- Es werden keine E-Mails und keine SMS ausgelöst.

## Technische Details

- `DELETE FROM public.interview_appointments WHERE id = '2db2a786-8ed6-454a-88ca-54a19535a628'`
- Optional konsistent: Status der zugehörigen Bewerbung bleibt unverändert (kein Rücksetzen), sofern nicht anders gewünscht.
