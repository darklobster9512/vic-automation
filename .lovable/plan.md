# Fix: "Ohne Namen"-Einträge bei /admin/mitarbeiter

## Was passiert ist

Beim letzten Fix (Julia Roxana Einloft) wurde der Filter entfernt, der Verträge ohne Vornamen aus der Liste ausgeblendet hat. Dadurch tauchen jetzt leere Vertrags-Platzhalter auf.

Geprüfter Datenstand:

- 124 Verträge mit Status "genehmigt" — alle mit Namen
- 4 Verträge "eingereicht" — alle mit Namen
- 47 Verträge "offen" — davon **31 komplett ohne Namen**

Diese 31 sind automatisch angelegte, noch nie ausgefüllte Verträge (entstehen beim Markieren eines Bewerbungsgesprächs als erfolgreich). Sie sind kein Datenverlust — sie waren vorher nur versteckt.

## Lösung

Statt pauschal alles anzuzeigen oder pauschal alles ohne Namen zu verstecken:

- Verträge mit Status "offen" **und** ohne Name/E-Mail/Telefon werden wieder ausgeblendet (leere Platzhalter).
- Alles andere bleibt sichtbar — insbesondere Verträge, die eingereicht/genehmigt sind oder wenigstens E-Mail oder Telefon haben. Damit bleibt ein Fall wie Julia (Daten versehentlich geleert, aber Vertrag bereits eingereicht) weiterhin auffindbar.
- Fallback-Anzeige "Ohne Namen" / E-Mail bleibt für die verbleibenden Fälle erhalten.
- Optional: kleiner Umschalter "Leere Vertragsentwürfe anzeigen" über der Liste, damit die 31 Platzhalter bei Bedarf sichtbar sind.

## Technisch

- `src/pages/admin/AdminMitarbeiter.tsx`: In der Supabase-Query eine Bedingung ergänzen, die Zeilen mit `status = 'offen'` und leerem `first_name`, `last_name`, `email` und `phone` ausschließt (via `.or(...)`-Bedingung bzw. `.not(...)`-Kombination), abhängig vom Umschalter-State.
- Zählwerte/Badges und Bulk-Auswahl übernehmen die gefilterte Menge automatisch.
- Keine Datenbankänderung, keine Löschung von Verträgen.
