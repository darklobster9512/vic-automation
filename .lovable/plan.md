# Registrierungen ohne Branding (z. B. Beate Stang) reparieren

## Betroffene Konten (branding-los)

Heute (24.08.), brandingübergreifend — beide ohne Arbeitsvertrag, beide gehören laut Bewerbung zu LIMEX:

| Name | E-Mail | Zeit | Bewerbung bei |
| --- | --- | --- | --- |
| Beate Stang | beate-stang@t-online.de | 10:13 | LIMEX |
| Rosemarie Angel | rosiangel3112@gmail.com | 10:27 | LIMEX |

Letzte 7 Tage, gleiches Problem (alle ohne Vertrag): Patrick Krajewski (23.08., keine Bewerbung), Marco La Bua-Di Bernardo (23.08., LIMEX), Sandra Meyer (23.08., keine), Katharina Targosz (22.08., keine), Jeanette Bänke (22.08., LIMEX), Felix Grefe (21.08., LIMEX), Vladyslav Ostrovskyy (20.08., LIMEX), Max Weber (19.08., keine), Christin Zingel (19.08., LIMEX).

## Was ich geprüft habe

- `profiles` von heute: Beate Stang (10:13) und Rosemarie Angel (10:27) haben `branding_id = NULL`; 11 andere Registrierungen von heute haben ein Branding.

- Für Beate Stang existiert **kein** `employment_contracts`-Eintrag — nur ältere LIMEX-Bewerbungen mit derselben E-Mail.
- `auth.users.raw_user_meta_data` enthält kein Branding; der DB-Trigger `handle_new_user` setzt `branding_id` nicht.
- In `src/pages/Auth.tsx` passiert alles nach der Registrierung in **einem** `if (... && brandingId)`-Block: Branding setzen, Arbeitsvertrag anlegen, Willkommens-Mail, Telegram. Ist `brandingId` null, passiert nichts davon.
- Die Domain-Erkennung fällt am Ende auf das Branding mit Domain `frik-maxeiner.de` zurück — dieses Branding existiert in der Tabelle `brandings` nicht mehr. Ergebnis: `brandingId = null`, Registrierung läuft "erfolgreich" durch, aber ohne Branding, ohne Vertrag, ohne Starteraufträge und ohne Willkommens-Mail.

Das erklärt die Fälle exakt: die betroffenen Nutzer haben sich über eine Host-Adresse registriert, die keiner Branding-Domain (auch keiner `additional_domains` bzw. `custom_email_link`) zugeordnet ist.

## Fix

1. **Kein stiller Fallback mehr**
   In `Auth.tsx`: Wenn kein Branding zur Domain gefunden wird, wird der Registrierungs-Tab gesperrt und ein Hinweis angezeigt ("Registrierung über diese Adresse nicht möglich"), statt ein Konto ohne Branding anzulegen. Login bleibt normal möglich.

2. **Branding serverseitig mitschreiben**
   Beim `signUp` wird `branding_id` in die `user_metadata` gelegt und `handle_new_user` so erweitert, dass `profiles.branding_id` direkt beim Anlegen gesetzt wird. Damit hängt das Branding nicht mehr an einem Folge-Update, das bei Netzwerkabbruch/Tab-Schließen ausfallen kann.

3. **Fehlerbehandlung entkoppeln**
   Vertragsanlage, Willkommens-Mail und Telegram werden einzeln abgesichert, damit ein Fehler in einem Schritt die anderen nicht mehr verhindert.

4. **Nachtrag der betroffenen Nutzer**
   Alle oben gelisteten Konten bekommen ihr Branding gesetzt und einen offenen Arbeitsvertrag (damit Starteraufträge greifen). Bei den Fällen mit LIMEX-Bewerbung ist die Zuordnung eindeutig; bei den vier Konten ohne Bewerbung (Krajewski, Meyer, Targosz, Weber) lege ich dir vor dem Schreiben einen Vorschlag zur Freigabe vor.

## Technische Details

- `src/pages/Auth.tsx`: Fallback auf `frik-maxeiner.de` entfernen, `brandingMissing`-Zustand, `signUp(options.data.branding_id)`, `try/catch` je Folgeaktion.
- Migration: `handle_new_user` liest `NEW.raw_user_meta_data->>'branding_id'` und schreibt es in `profiles.branding_id`.
- Datenkorrektur per SQL: `profiles.branding_id` setzen und fehlende `employment_contracts` (Status `offen`) anlegen — der bestehende Trigger `assign_starter_jobs` weist die Starteraufträge dann automatisch zu.
