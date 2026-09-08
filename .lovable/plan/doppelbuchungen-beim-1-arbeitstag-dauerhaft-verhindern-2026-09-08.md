# Doppelbuchungen beim 1. Arbeitstag dauerhaft verhindern

Bestehende Termine bleiben unverändert. Es geht nur darum, dass ab sofort keine neue Doppelbelegung mehr entstehen kann.

## Was passiert

- Für den gemeinsamen Kalender von LIMEX, Codebricks, Vendis, Topscale, PointView und Softex gilt künftig hart: pro Datum und Uhrzeit nur ein Termin.
- Das gilt für jeden Weg, auf dem ein Termin entsteht: öffentliche Buchungsseite, Admin-Anlage, Verschiebung eines bestehenden Termins und Massen-Import.
- Wird versucht, eine belegte Uhrzeit ein zweites Mal zu belegen, wird der Vorgang abgelehnt und der Buchende sieht eine klare Meldung ("Dieser Termin ist bereits vergeben").
- Bereits abgesagte/stornierte Termine blockieren die Uhrzeit nicht.
- Die bereits vorhandenen doppelten Termine (08.09. 10:00, 01.09. 16:00) werden nicht angefasst und lösen keine Fehler aus.

## Technische Umsetzung

Migration:

1. Sperr-Funktion + `BEFORE INSERT OR UPDATE`-Trigger auf `first_workday_appointments`. Die Funktion ermittelt über `fw_calendar_branding_ids` die Kalendergruppe des betroffenen Termins (Branding via `employment_contracts`/`applications`) und prüft mit `FOR UPDATE`-Sperre auf einen bestehenden, nicht stornierten Termin mit gleichem `appointment_date` + `appointment_time` in derselben Gruppe. Treffer → `RAISE EXCEPTION` mit eigenem SQLSTATE.
2. Zusätzlich Prüfung gegen `first_workday_blocked_slots` derselben Gruppe, damit gesperrte Zeiten nicht umgangen werden.
3. Wegen der Altbestände wird bewusst **kein** Unique-Index angelegt (der würde an den bestehenden Duplikaten scheitern); die Absicherung erfolgt über den Trigger, der nur neue/geänderte Zeilen prüft.
4. `book_first_workday_public` behält seine Vorprüfung, fängt aber den Trigger-Fehler ab und gibt eine verständliche Meldung zurück.

Frontend:

- In der öffentlichen Buchung und in der Admin-Ansicht wird der Fehler abgefangen und als Hinweis-Toast angezeigt, danach werden die freien Zeiten neu geladen.

Keine Benachrichtigungen (SMS/E-Mail) durch diese Änderung.
