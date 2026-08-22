# Benutzerkonto löschen im Vertrags-Popup

Auf `/admin/arbeitsvertraege` soll man im Detail-Popup eines eingereichten Vertrags — dort, wo aktuell nur "Genehmigen" steht — das Benutzerkonto auch löschen können.

## Was gebaut wird

- Im Detail-Dialog erscheint bei Status "eingereicht" zusätzlich ein roter Button "Benutzerkonto löschen".
- Klick öffnet eine Sicherheitsabfrage mit Name/E-Mail und dem Hinweis, dass Vertrag, Login und alle zugehörigen Daten unwiderruflich entfernt werden.
- Nach Bestätigung: Löschung läuft, Button zeigt Ladezustand, danach Erfolgsmeldung, Popup schließt sich und die Liste aktualisiert sich.
- Fehlerfall: Fehlermeldung als Toast, Popup bleibt offen.

## Technische Details

- Datei: `src/pages/admin/AdminArbeitsvertraege.tsx`.
- Löschung über die bestehende Edge Function `delete-employee` (`supabase.functions.invoke("delete-employee", { body: { contractId } })`) — identisch zur Logik in `AdminMitarbeiter.tsx`. Diese Funktion prüft serverseitig die Rolle (admin/kunde), löscht den Vertrag samt Kaskaden sowie `user_roles`, `profiles` und den Auth-User.
- Neuer lokaler State: `deleteConfirmOpen`, `isDeleting`.
- Nach Erfolg: `queryClient.invalidateQueries` für die Vertragsliste, `setDialogOpen(false)`.
- Keine Datenbank- oder Backend-Änderungen nötig.
