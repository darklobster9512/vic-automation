# Slot-System: Prüfergebnis und Absicherung der Doppelbuchung

## Was ich geprüft habe

Alle Bewerbungsgespräch-Termine, gruppiert nach Branding + Datum + Uhrzeit:

```text
for.tel Solutions      181 Zeitpunkte mit 1 Buchung, 118 mit 2 Buchungen (letzte Doppelbelegung 08.07.)
LIMEX Solutions         11 Zeitpunkte, alle mit 1 Buchung
Efficient Flow           9 Zeitpunkte, alle mit 1 Buchung
```

Befunde:

1. **Kein einziger Zeitpunkt wurde je über die Kapazität hinaus belegt** — nirgends 3 Buchungen, und die 2er-Belegungen gab es nur bei for.tel, wo „Slots pro Uhrzeit = 2" eingestellt ist. Insofern hat das System bisher nie überbucht.
2. **Seit dem 08.07. gibt es bei for.tel keine einzige Doppelbelegung mehr** — passend zur heute gefundenen fehlenden Slot-2-Konfigurationszeile, wodurch real nur 1 Spur buchbar war. Das ist mit dem heutigen Fix behoben; ab jetzt sollten wieder 2 pro Uhrzeit möglich sein.
3. **Fehlermeldungen gab es keine.** In den Postgres-Logs steht kein einziger Fehler zu `interview_appointments`. Das liegt aber nicht daran, dass alles sauber abgesichert ist, sondern daran, dass es gar keine Absicherung gibt, die einen Fehler werfen könnte: auf `interview_appointments` existieren nur zwei Unique-Indizes (`id` und `application_id`), keiner auf Datum + Uhrzeit. Die Kapazitätsprüfung passiert ausschließlich im Browser (`Bewerbungsgespraech.tsx`), und gebucht wird mit einem direkten `insert`.

Konsequenz: Buchen zwei Bewerber denselben letzten freien Platz im selben Moment (oder lädt jemand die Seite mit veralteten Daten), landen **beide** Datensätze in der Datenbank — ohne Fehler, ohne Hinweis. Genau deshalb ist auch kein Error zu finden.

## Was gebaut werden soll

**Serverseitige Buchung mit atomarer Kapazitätsprüfung**

Eine neue `SECURITY DEFINER`-Funktion `book_interview_public(_application_id, _date, _time)` übernimmt das Buchen komplett:

1. Sperrt die Buchungen dieses Brandings für Datum + Uhrzeit (`FOR UPDATE`), damit zwei gleichzeitige Anfragen sich nicht überholen.
2. Ermittelt die reale Kapazität für diesen Zeitpunkt: Anzahl der Slot-Spuren, die an diesem Wochentag zu dieser Uhrzeit laufen (Start-/Endzeit, Wochenendzeiten, Mittagspause, blockierte Zeiten pro Spur und global) — dieselbe Logik wie im Frontend, nur in SQL.
3. Prüft die Vorlaufzeit (`min_lead_time_hours`) gegen die gewünschte Uhrzeit.
4. Löscht einen eventuell vorhandenen alten Termin derselben Bewerbung (Umbuchung), legt den neuen an und setzt den Bewerbungsstatus auf `termin_gebucht`.
5. Ist der Zeitpunkt voll, blockiert oder außerhalb der Vorlaufzeit, kommt eine klare Fehlermeldung („Dieser Termin ist bereits vergeben") zurück.

**Frontend**

`src/pages/Bewerbungsgespraech.tsx` ruft in `bookMutation` statt Delete + Insert + Status-RPC nur noch diese eine Funktion auf. Die bisherige Frontend-Filterung bleibt als Komfort erhalten (belegte Zeiten weiter ausgegraut). Bei der Fehlermeldung „bereits vergeben" werden die Slot-Daten neu geladen und ein Toast zeigt an, dass die Zeit gerade weggeschnappt wurde.

**Monitoring**

Optional als Teil dieser Änderung: eine einmalige Prüfabfrage nach Überbelegungen, die künftig jederzeit wiederholbar ist — aktuell ist das Ergebnis sauber (0 Fälle).

## Technische Details

- Neue Migration mit `book_interview_public(...)` (`SECURITY DEFINER`, `SET search_path = public`), Kapazitätsberechnung aus `branding_schedule_settings` (`schedule_type = 'interview'`, Fallback auf `slot_index = 1`) und `schedule_blocked_slots` (`slot_index IS NULL` = gilt für alle Spuren).
- Sperre über `SELECT ... FROM interview_appointments ia JOIN applications a ... WHERE a.branding_id = ... AND date/time = ... FOR UPDATE`.
- `EXECUTE`-Rechte für `anon` und `authenticated`, da die Buchungsseite ohne Session läuft (`publicSupabase`).
- Kein Unique-Index auf (Datum, Uhrzeit) — die Kapazität ist konfigurierbar (1..N), das lässt sich mit einem Index nicht abbilden.
- Telegram-/E-Mail-/SMS-Versand bleibt wie bisher im Frontend nach erfolgreicher Buchung.
- Probetag und 1. Arbeitstag bleiben unverändert (`book_first_workday_public` prüft dort bereits serverseitig).
