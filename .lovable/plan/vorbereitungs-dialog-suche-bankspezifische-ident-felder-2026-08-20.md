# Vorbereitungs-Dialog: Suche + bankspezifische Ident-Felder

## Änderungen

**1. Auftrag – Dropdown mit Suche**
Das Auswahlfeld wird zu einem durchsuchbaren Combobox-Feld (wie beim Nummern-Picker): Eingabefeld oben, Liste filtert live nach Auftragsnummer, Titel und Anbieter.

**3. Ident-Daten – nur die passenden Felder je Bank**
Sobald ein Auftrag gewählt ist, wird die Bank aus Titel/Anbieter erkannt und die Felderliste automatisch auf genau diese Felder reduziert (überzählige Standardfelder fallen weg):

| Bank | Felder |
| --- | --- |
| DKB | Identlink, Email |
| Deutsche Bank | Identlink, Email |
| BBVA | Identlink, Email, Anmeldename, Passwort |
| Postbank | Identlink, Email |
| Consorsbank | Identlink, Email |

Alle anderen Banken behalten die bisherigen Standardfelder (Identcode, Identlink, Anmeldename, Email, Passwort). Eigene Felder können weiterhin manuell ergänzt und einzelne Felder entfernt werden. Bereits eingegebene Werte bleiben erhalten, wenn das Feld auch in der neuen Liste vorkommt. Bei einer schon gespeicherten Vorbereitung wird nicht überschrieben – die gespeicherten Felder bleiben stehen.

**4. Info / Fragen und Antworten – Vorlage automatisch wählen**
Beim Auswählen eines Auftrags wird die Info-Vorlage automatisch gesetzt, deren Name zur Bank passt (die Vorlagen heißen bereits wie die Banken, z. B. „DKB", „Postbank", „BBVA"). Das Dropdown zeigt die gewählte Vorlage an. Ist bereits Text im Feld (gespeicherte Vorbereitung), wird nicht automatisch überschrieben; manuelles Umschalten der Vorlage funktioniert wie bisher inklusive Rückfrage.

## Technisches

- `src/components/admin/FirstWorkdayPrepDialog.tsx`
  - Auftrags-`Select` durch `Popover` + `Command` (Suche) ersetzen, gleiches Muster wie der bestehende Nummern-Picker.
  - Neue Konstante `BANK_IDENT_FIELDS` als Map von Bank-Schlüsselwort → Feldliste; Erkennung über normalisierten Vergleich von `title` + `provider` des Auftrags.
  - `useEffect` auf `orderId`: nur wenn keine gespeicherte Vorbereitung mit Daten existiert bzw. der Auftrag aktiv gewechselt wurde, `testData` auf die Bankliste setzen (vorhandene Werte per Label übernehmen) und passende Vorlage über `infoTemplates` per Namensabgleich anwenden.
  - Ausgewählte Vorlagen-ID im State halten, damit das `Select` sie anzeigt.
