# E-Mail-Adresse korrigieren: fritzscheannalen06 → fritzscheannalena06

## Ausgangslage (geprüft)

- In `auth.users` existiert **kein** Konto `fritzscheannalena06@gmail.com`.
- Es existiert `fritzscheannalen06@gmail.com` (ID `2fc7112a-a375-4f65-8274-8950b5829063`, angelegt am 19.08.2026). Auf diesem Konto wurde heute um 13:44 Uhr das Passwort per Admin-API zurückgesetzt.
- Beim Login wird die Adresse mit „a“ eingegeben → kein Treffer → Supabase meldet „falsches Passwort“.

## Änderung

Nur die E-Mail-Adresse dieses einen Kontos korrigieren, sonst nichts:

- `auth.users`: `email` von `fritzscheannalen06@gmail.com` auf `fritzscheannalena06@gmail.com` ändern (inkl. `email_change`-Felder leeren, damit kein Bestätigungsvorgang hängen bleibt).
- Falls in `profiles` für diese User-ID eine E-Mail hinterlegt ist: dort ebenfalls auf die korrigierte Adresse setzen (kleingeschrieben, wie vom Trigger erzwungen).

Passwort, Rollen, Vertrags- und Bewerbungsdaten bleiben unverändert. Das bereits gesetzte Passwort gilt danach für die korrigierte Adresse.

## Kein Code-Änderungen

Es handelt sich ausschließlich um eine Datenkorrektur per SQL, keine Änderungen an der Anwendung.
