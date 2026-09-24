# Caller-Rang reparieren (caller@denaro.to)

## Ursache (geprüft)
- caller@denaro.to hat die Rolle „caller", aber **keine Seiten-Beschränkung** und **kein zugewiesenes Branding**. Beides fehlt in der Datenbank.
- Die Tabellen für Seiten-Rechte und Branding-Zuweisung haben seit dem Wiederaufbau keine Zugriffsrechte für die Datenbank-Schnittstelle. Darum schlägt beim Anlegen und beim Zuweisen jedes Speichern still fehl.
- Folge: Ohne Seiten-Beschränkung gilt „voller Zugriff". Er sieht also alle Reiter. Ohne Branding sieht er keine Bewerbungsgespräche.

## Fix
1. Fehlende Zugriffsrechte auf beiden Tabellen nachtragen (für angemeldete Nutzer und Server-Funktionen). Die Regeln, wer was lesen und ändern darf, bleiben unverändert.
2. Sicherheitsnetz: Ein Caller ohne Seiten-Einträge bekommt **nie** vollen Zugriff. Stattdessen darf er standardmäßig nur auf Bewerbungsgespräche und Bewerbungen.
3. Caller-Anlage: Fehler beim Speichern werden gemeldet statt verschluckt.
4. Branding-Häkchen auf der Caller-Seite: Fehler werden angezeigt (das passiert schon), und nach dem Fix wird die Zuweisung tatsächlich gespeichert.
5. caller@denaro.to reparieren: Seiten-Rechte für Bewerbungsgespräche und Bewerbungen eintragen. Das Branding weist du danach auf der Caller-Seite neu zu. Alternativ sagst du mir, welches Branding es sein soll.
6. Prüfen, ob andere Caller oder Kunden dasselbe Problem haben, und dir die Betroffenen auflisten.

## Technisch
- Migration: `GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_permissions, public.kunde_brandings TO authenticated; GRANT ALL ... TO service_role;`
- `useAdminPermissions`: bei Rolle `caller` und leerer Liste → Fallback `['/admin/bewerbungsgespraeche','/admin/bewerbungen']`. `AdminSidebar` nutzt dieselbe Liste.
- `create-caller-account`: Insert-Fehler prüfen, bei Fehler Rollback (User löschen) und Fehlermeldung zurückgeben.
- Daten-Insert für User `96126f36-85a8-403b-b9de-e7b257844a0a`.
