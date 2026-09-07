# Passwort ändern auf „Meine Daten"

Auf der Seite `/mitarbeiter/meine-daten` bekommt der Mitarbeiter einen neuen Bereich „Passwort ändern" mit drei Feldern: aktuelles Passwort, neues Passwort, neues Passwort wiederholen. Nach Bestätigung wird das Passwort geändert und zusätzlich weiterhin als Klartext in `employment_contracts.temp_password` gespeichert (wie bei Admin-Reset).

## Ablauf
1. Mitarbeiter füllt die drei Felder aus und klickt „Passwort ändern".
2. Client validiert: alle Felder ausgefüllt, neue Passwörter identisch, mind. 6 Zeichen, neu ≠ alt.
3. Aktuelles Passwort wird per `signInWithPassword` mit der eigenen E-Mail geprüft (Re-Auth). Bei Fehler: Toast „Aktuelles Passwort falsch".
4. Neue Edge Function `change-employee-password` wird aufgerufen mit `{ current_password, new_password }`.
   - verifiziert Caller via `getClaims`
   - holt `employment_contracts` Row zum Caller (`user_id = auth.uid()`)
   - re-verifiziert `current_password` serverseitig gegen die E-Mail (Sicherheit)
   - setzt neues Passwort per `auth.admin.updateUserById`
   - schreibt `temp_password = new_password` in den Vertrag
5. Erfolgs-Toast, Felder werden geleert.

## Technische Details
- Neue Datei: `supabase/functions/change-employee-password/index.ts` (analog zu `reset-employee-password`, aber ohne Admin-Rollencheck; nur eigener Account).
- Frontend-Änderung nur in `src/pages/mitarbeiter/MeineDaten.tsx`: neue Card „Passwort ändern" mit Form, `useState` für die drei Felder + Loading, `supabase.functions.invoke("change-employee-password", ...)`.
- Keine Datenbank-Migration nötig (`temp_password` existiert bereits).
- Keine Änderungen an Admin-Flows.
