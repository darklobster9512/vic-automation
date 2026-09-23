# Kunden dürfen Bewerbungsgespräch-Termine löschen

Auf `/admin/bewerbungsgespraeche` ist der Löschen-Knopf für alle sichtbar, aber beim Kunden-Rang passiert nichts bzw. es erscheint ein Fehler: In der Datenbank darf aktuell nur der Admin-Rang Termine löschen. Kunden haben nur Lese- und Änderungsrechte.

## Umsetzung

1. **Neue Löschberechtigung für den Kunden-Rang** auf den Bewerbungsgespräch-Terminen — genau nach derselben Regel, die für Lesen und Ändern schon gilt: Ein Kunde darf Termine löschen, die zu Bewerbungen seiner eigenen Brandings gehören. Das schließt Termine von Bewerbern mit Blacklist-Eintrag ein, da diese Einschränkung nur die Anzeige betrifft, nicht das Löschen.
2. **Keine Änderung an der Oberfläche nötig** — der Löschen-Knopf und der Bestätigungsdialog sind bereits vorhanden und funktionieren, sobald die Berechtigung da ist.

Admin-Rechte bleiben unverändert, andere Brandings bleiben unantastbar, es werden keine Benachrichtigungen verschickt.

## Technische Details

Neue RLS-Policy auf `public.interview_appointments`:

```sql
create policy "Kunden can delete interview_appointments"
on public.interview_appointments for delete to authenticated
using (
  is_kunde(auth.uid())
  and (
    not user_has_any_branding(auth.uid())
    or application_id in (select apps_for_branding_ids(auth.uid()))
  )
);
```

Zusätzlich `grant delete on public.interview_appointments to authenticated`, falls noch nicht vorhanden.
