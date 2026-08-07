# Vorlaufzeit für Probetag & 1. Arbeitstag konfigurierbar

Aktuell ist die Vorlaufzeit auf beiden öffentlichen Buchungsseiten fest auf 12 Stunden codiert (`Probetag.tsx` Zeile 159, `ErsterArbeitstag.tsx` Zeile 163). Die Spalte `min_lead_time_hours` existiert bereits in `branding_schedule_settings` und wird bisher nur für Bewerbungsgespräche genutzt.

## Was gebaut wird

1. **/admin/zeitplan → Tab "Probetag & 1. Arbeitstag"**: Neues Feld "Vorlaufzeit (Stunden)" in den Zeitplan-Einstellungen, analog zum Gesprächs-Tab. Standard 12, Bereich 0–168.
2. **Speichern**: Der Wert wird in der `trial`-Einstellung des jeweiligen Brandings abgelegt (kein Schema-Änderung nötig, Spalte existiert).
3. **Buchungsseiten**: Probetag und 1. Arbeitstag lesen den Wert aus den Zeitplan-Einstellungen des Brandings und filtern Zeitslots damit; fällt auf 12 zurück, wenn nichts gesetzt ist.

## Technisches

- `src/components/admin/TrialDayBlocker.tsx`: Lead-Time-State + Input, `onSaveSettings` um `min_lead_time_hours` erweitern.
- `src/pages/admin/AdminZeitplan.tsx`: Prop-Typ von `onSaveSettings` erweitern; die bestehende `saveSettingsMutation` schreibt das Feld bereits, wenn es übergeben wird.
- `src/pages/Probetag.tsx` und `src/pages/ErsterArbeitstag.tsx`: `min_lead_time_hours` aus `scheduleSettings` (`schedule_type = 'trial'`) verwenden statt der `12 * 60 * 60 * 1000`-Konstante.

Hinweis: Die serverseitige RPC `book_first_workday_public` prüft die Vorlaufzeit nicht — die Filterung bleibt wie bisher rein clientseitig. Auf Wunsch kann die Prüfung zusätzlich in die RPC eingebaut werden.
