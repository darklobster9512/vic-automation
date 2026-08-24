# Lebenslauf-Upload nur für Admins

Der PDF-Lebenslauf-Upload im "Neue Bewerbung"-Dialog (`/admin/bewerbungen`) soll nur für die Rolle `admin` sichtbar sein. Kunden- und Caller-Accounts sehen ihn nicht mehr.

## Änderung

- `src/pages/admin/AdminBewerbungen.tsx`: `useUserRole()` einbinden und den kompletten Upload-Block (Dropzone, Fortschrittsanzeige, Ergebnisliste) nur rendern, wenn `isAdmin` true ist. Bedingung wird von `isExternal` zu `isExternal && isAdmin`.

Der Mass-Import per Textfeld bleibt für alle unverändert. Keine Datenbank- oder Backend-Änderungen.
