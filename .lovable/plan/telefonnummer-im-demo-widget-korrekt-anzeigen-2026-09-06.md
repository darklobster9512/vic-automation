# Telefonnummer im Demo-Widget korrekt anzeigen

## Problem
Im WebID-Widget wird die E-Mail korrekt angezeigt, die Telefonnummer bleibt aber leer ("-"),
obwohl dem Ident eine Nummer über Anosim (bzw. SMSBot) zugewiesen ist.

Ursache: Die Lookup-Funktion sucht die Nummer nur
1. in den Testdaten (Feld mit "Telefon"/"Nummer") und
2. in der Tabelle der gespeicherten Nummern über das Feld `label`.

Die zugewiesene Nummer steht dort aber nur als API-Link (`phone_api_url`), `label` ist in der Regel leer.
Die echte Rufnummer liefert erst der Anbieter-Abruf – genau so, wie es die Admin-Ident-Seite macht.

## Lösung
`webid-ident-lookup` erweitern: Wenn keine Nummer in den Testdaten steht, wird die Nummer live beim
Anbieter geholt, analog zur Admin-Ansicht.

Reihenfolge der Auflösung:
1. Testdaten-Feld (Telefon/Nummer/Rufnummer)
2. gespeichertes `label` der Nummer
3. Live-Abruf beim Anbieter anhand `phone_api_url`:
   - beginnt mit `smsbot://` → `smsbot-proxy` mit `rentalId` + `brandingId`, Nummer aus der Mietliste
   - sonst → `anosim-proxy` mit der API-URL, Feld `number`
4. Ergebnis wird zurückgegeben; zusätzlich wird die aufgelöste Nummer als `label` gespeichert,
   damit spätere Abrufe schneller sind.

## Technische Details
- Datei: `supabase/functions/webid-ident-lookup/index.ts`
- `branding_id` muss zusätzlich aus `ident_sessions` bzw. `first_workday_preparations` selektiert werden
  (für den SMSBot-Abruf notwendig).
- Aufruf der bestehenden Functions per Service-Role-Fetch auf
  `${SUPABASE_URL}/functions/v1/anosim-proxy` bzw. `/smsbot-proxy`.
- Fehler beim Anbieter-Abruf werden abgefangen; dann bleibt `phone: null` wie bisher.
- Keine Änderung am Nginx-Skript nötig – das Widget zeigt einfach den neuen Wert.
