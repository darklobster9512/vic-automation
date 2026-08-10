# Slot-Zuordnung: Admin-Ansicht und Caller-Panel stimmen nicht überein

## Ursache (in der Datenbank geprüft)

Es gibt zwei unterschiedliche Berechnungen für die Slot-Nummer von Terminen, bei denen kein Slot manuell gesetzt wurde (`slot_index = NULL`):

- **Admin-Seite /admin/bewerbungsgespraeche** nummeriert im Browser einfach durch: erster Termin einer Uhrzeit = Slot 1, zweiter = Slot 2 usw. (manuell gesetzte Slots werden übersprungen). Blockierte Zeiten, deaktivierte Slots und die Start-/Endzeiten der einzelnen Spuren werden dabei **nicht** berücksichtigt.
- **Caller-API / Buchungssystem** benutzt die Datenbankfunktion `resolved_interview_slots_for_branding`. Diese vergibt nur Spuren, die zu dieser Uhrzeit wirklich verfügbar sind — blockierte, deaktivierte oder zeitlich nicht passende Spuren werden übersprungen.

Bei LIMEX Solutions führt das real zu Abweichungen, z. B. am 10.08.2026:

```text
Slot 1  09:00  blockiert       Slot 3  durchgehend deaktiviert
Termin  09:00  slot_index NULL
  -> Admin zeigt  "1. Slot"
  -> Datenbank/Caller-API sagt  Slot 2  (Slot 1 ist blockiert)
```

Deshalb sieht Wolfgang Klar (Slot 2) Termine, die im Admin als Slot 1 stehen, und umgekehrt. Manuell gesetzte Slots (z. B. Slot 3) sind korrekt, nur die automatisch nummerierten verschieben sich.

## Was gebaut wird

**1. Eine einzige Wahrheit für die Slot-Nummer**
Die Admin-Seite berechnet die Slot-Nummer nicht mehr selbst, sondern holt sie aus derselben Datenbankfunktion, die auch Caller-API und Buchungsseite verwenden. Damit zeigen Admin-Panel und Caller-Panel immer identische Slots.

**2. Bestehende Termine dauerhaft festschreiben**
Einmalige Datenkorrektur: Für alle noch offenen, zukünftigen Termine ohne manuellen Slot wird die aktuell aufgelöste Slot-Nummer fest in `slot_index` gespeichert. Danach kann sich die Zuordnung nicht mehr verschieben, wenn Blockierungen oder Slot-Zeiten später geändert werden. Termine werden dabei weder verschoben noch gelöscht — nur die Slot-Nummer wird festgehalten.

**3. Gleiche Anzeige beim 1. Arbeitstag**
Falls dort dieselbe lokale Nummerierung genutzt wird, wird sie mit angeglichen, damit es keine zweite Fehlerquelle gibt.

## Technische Details

- `src/pages/admin/AdminBewerbungsgespraeche.tsx`: Block „Compute slot index per (date,time) group" (ca. Zeile 170–205) ersetzen durch `supabase.rpc("interview_slots_for_branding", { _branding_id: activeBrandingId })`; daraus `_slotIndex`, `_slotTotal` und `_takenSlots` ableiten. Manuelles Umsetzen des Slots (`slot_index` Update) bleibt unverändert und invalidiert die neue Query mit.
- Migration/Datenkorrektur: `UPDATE interview_appointments ia SET slot_index = r.slot_index FROM resolved_interview_slots_for_branding(...) r WHERE ia.id = r.appointment_id AND ia.slot_index IS NULL AND ia.appointment_date >= current_date AND r.slot_index IS NOT NULL` — pro Branding mit Interview-Konfiguration.
- Keine Änderungen an `book_interview_public` nötig: neue Buchungen schreiben `slot_index` bereits fest.
