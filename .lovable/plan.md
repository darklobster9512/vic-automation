# Slot-System bei /admin/zeitplan stabilisieren

Kurz: Es ist nicht nur ein Anzeigefehler. Das Feld „Slots pro Uhrzeit" wird pro Slot-Zeile gelesen und geschrieben, obwohl es global fürs Branding gelten soll. Dadurch gibt es aktuell zwei echte Probleme.

## Was geprüft wurde (aktueller Stand in der Datenbank)

Interview-Einstellungen:

```text
for.tel Solutions      Slot 1: slots_pro_uhrzeit = 2   (Slot-2-Zeile fehlt komplett)
LIMEX Solutions        Slot 1: slots_pro_uhrzeit = 2
                       Slot 2: slots_pro_uhrzeit = 1   <- widersprüchlich
Efficient Flow         Slot 1: slots_pro_uhrzeit = 1
```

Daraus folgen drei Befunde:

1. **Anzeige:** Beim Klick auf „Slot 2" zeigt das Formular den Wert aus der Slot-2-Zeile (1) statt den maßgeblichen Wert aus Slot 1 (2). Genau das, was aufgefallen ist.
2. **Gefährlicher Speichervorgang:** Speichert man auf Slot 2 die Zeiten, wird der angezeigte Wert 1 mitgeschickt und anschließend auf **alle** Slots des Brandings synchronisiert. Die Slot-Anzahl fällt damit unbemerkt von 2 auf 1 zurück, Slot 2 verschwindet. Dasselbe gilt für die Vorlaufzeit.
3. **for.tel bucht real nur 1 Slot statt 2:** Die öffentliche Buchungsseite baut eine Buchungs-Spur nur, wenn es für den Slot eine Konfigurationszeile gibt. Für Slot 2 existiert bei for.tel keine Zeile, deshalb wird Slot 2 übersprungen — die Kapazität pro Uhrzeit ist faktisch 1, obwohl 2 eingestellt ist.

## Was gebaut wird

**1. „Slots pro Uhrzeit" und „Vorlaufzeit" nur noch auf Slot 1**
Beide Felder erscheinen im Admin-Formular ausschließlich beim ersten Slot (sie gelten ohnehin brandingweit). Bei Slot 2, 3, … zeigt das Formular nur Startzeit, Endzeit, Intervall, Wochentage, Wochenendzeiten und Mittagspause. Über den Slot-Tabs steht ein kurzer Hinweis, dass Anzahl und Vorlaufzeit global unter Slot 1 gesetzt werden.

**2. Speichern auf höheren Slots kann die Slot-Anzahl nicht mehr überschreiben**
Speichervorgänge aus Slot 2+ senden weder Slot-Anzahl noch Vorlaufzeit mehr mit, und die Synchronisierung überschreibt diese Werte nur, wenn sie tatsächlich von Slot 1 kommen.

**3. Fehlende Slot-Zeilen automatisch anlegen**
Wird die Slot-Anzahl auf N erhöht, werden fehlende Zeilen für Slot 2..N sofort mit den Werten von Slot 1 angelegt. Damit ist jeder sichtbare Slot auch real konfiguriert.

**4. Buchungsseite mit Fallback absichern**
Fehlt einer Spur trotzdem die Konfigurationszeile, verwendet die Buchungsseite die Einstellungen von Slot 1, statt die Spur zu überspringen. Die eingestellte Kapazität pro Uhrzeit stimmt dann immer.

**5. Bestandsdaten korrigieren**
Einmalige Datenkorrektur: Slot-Anzahl und Vorlaufzeit aller Slot-Zeilen eines Brandings auf den Wert von Slot 1 angleichen (LIMEX Slot 2: 1 → 2) und die fehlende Slot-2-Zeile für for.tel aus Slot 1 anlegen. Bestehende gebuchte Termine bleiben unberührt.

## Technische Details

- `src/pages/admin/AdminZeitplan.tsx`: `showSlotsPerTime` nur bei `effectiveSlot === 1`; `saveSettingsMutation` synchronisiert `interview_slots_per_time` / `min_lead_time_hours` nur bei `slot_index === 1`; nach Erhöhen der Anzahl Upsert der fehlenden `slot_index`-Zeilen aus der Slot-1-Zeile.
- `src/pages/Bewerbungsgespraech.tsx`: in der `lanes`-Schleife `?? primarySetting` als Fallback statt `continue`.
- Datenkorrektur per SQL-Update/Insert auf `branding_schedule_settings` (`schedule_type = 'interview'`).
- Blockierte Zeiten und Mittagspausen bleiben wie bisher pro Slot, mit `slot_index = null` weiterhin als „gilt für alle Slots".
