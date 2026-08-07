# Bezeichnung von Caller-Zugängen bearbeitbar machen

## Ziel
Auf `/admin/caller-zugaenge` soll die Bezeichnung eines bestehenden Zugangs nachträglich geändert werden können.

## Umsetzung
- In der Tabelle wird die Bezeichnung klickbar (Stift-Icon bzw. Klick auf den Namen).
- Ein kleiner Dialog "Bezeichnung ändern" öffnet sich mit dem aktuellen Namen im Eingabefeld.
- Speichern schreibt den neuen Namen in `caller_api_keys.label` und aktualisiert die Liste; leere Eingaben werden abgelehnt.
- Erfolgs-/Fehlermeldung per Toast, wie bei den bestehenden Aktionen.

## Technisch
- Datei: `src/pages/admin/AdminCallerZugaenge.tsx`
- Neuer State `editTarget` + `editLabel`, Update via `supabase.from("caller_api_keys").update({ label }).eq("id", row.id)`, danach `queryClient.invalidateQueries(["caller-api-keys"])`.
- Keine Datenbankänderung nötig, bestehende Update-Policy deckt das ab.
