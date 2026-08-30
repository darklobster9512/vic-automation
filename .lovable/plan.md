# Bulk-Vorbereitung 1. Arbeitstag via Freitext-Import

Neben "Ausweisdaten extrahieren" pro Tagesabschnitt in `/admin/erster-arbeitstag` kommt ein neuer Text-Button **"Vorbereitung importieren"**. Er öffnet ein Popup mit großem Eingabefeld, in dem du das bekannte Freitext-Format einfügst. Das System parst die Blöcke, matched sie mit den Terminen des Tages und zeigt dir eine Vorschau, was pro Termin gesetzt wird. Erst nach deiner Bestätigung werden alle Vorbereitungen geschrieben.

## Was pro Block extrahiert wird

Aus jedem `=== Name ===`-Block wird nur das genutzt, was für die Vorbereitung nötig ist:

- **Name** (Zeile nach `===`) → Matching mit Terminen des Tages
- **Auftrag** → aus der Bank-Zeile unter dem `anosim …`-Block (z.B. "Deutsche Bank", "DKB", "Postbank", "Consorsbank", "BBVA"). Zeilen wie "DKB ging nicht auf" werden ignoriert, es zählt die letzte reine Bank-Zeile.
- **Anosim-Link** (`https://anosim.net/api/v1/orderbookingshare?token=…` oder Share-Link, wird wie heute normalisiert)
- **Identlink** (`https://web-id.limex.solutions/…`)
- **E-Mail** (`*@web.de`)

Alles andere (Adresse, Steuer-ID, Passwort, Familienstand, +49-Nummer usw.) wird ignoriert — nur die 5 Felder oben zählen.

## Matching Freitext → Termin

Für den aktuellen Tagesabschnitt:

1. Primär über den Namen (case-insensitive, Umlaute normalisiert, Reihenfolge egal).
2. Sekundär über die `@web.de`-E-Mail gegen Vertrags-/Profil-/Bewerber-E-Mail.

Nicht gematchte Blöcke und nicht gematchte Termine werden in der Vorschau eigens gelistet.

## Auftrags-Auflösung

Bank-Text wird auf die Bankdrop-`orders` des Brandings gemappt (Titel/Provider enthält Keyword, case-insensitive, ohne Sonderzeichen). Ein Auftrag pro Bank; gibt es mehrere Kandidaten, gewinnt der mit `is_starred = true`, sonst der zuletzt erstellte. Ohne Treffer bleibt der Auftrag in der Vorschau leer und der Eintrag ist rot markiert (überspringbar).

## Vorschau-Popup

Tabelle mit einer Zeile pro Termin des Tages:

```text
Uhrzeit | Mitarbeiter | Auftrag | Nummer (Anosim) | Ident-Email | Identlink | Status
```

- Status: Bereit / Kein Match / Auftrag fehlt / Bereits vorbereitet (überschreiben ja/nein pro Zeile).
- Checkbox pro Zeile (default an, wenn "Bereit").
- Am Ende zwei Buttons: **Abbrechen** und **Ausgewählte übernehmen (n)**.

## Übernahme

Für jede bestätigte Zeile sequentiell:

1. Anosim-Share-Link → in `api/v1`-Form normalisieren (wie im bestehenden Save-Pfad).
2. Falls die URL noch nicht in `phone_numbers` für dieses Branding existiert, dort als `provider: "anosim"` anlegen.
3. `first_workday_preparations` per Upsert (`onConflict: appointment_id`) schreiben mit:
   - `order_id` (gematcht)
   - `phone_api_url` (normalisierter Anosim-Link)
   - `test_data`: bankspezifische Felder aus `BANK_IDENT_FIELDS` (wie heute), Werte:
     - `Identlink` = Web-ID-URL
     - `Email` = `@web.de`-Adresse
     - übrige Felder (Anmeldename, Passwort, Identcode) bleiben leer
   - `info_notes`: falls leer, passende Ident-Info-Vorlage (`templateForOrder`) wie im Dialog auto-übernehmen
   - `status: "prepared"`
4. Fortschritt live im Popup, am Ende Toast "n von m übernommen" plus Query-Invalidation.

## Technische Details

Neue Datei `src/components/admin/BulkPrepImportDialog.tsx`:
- Props: `open`, `onOpenChange`, `dayItems: ResolvedItem[]`, `brandingId`, `onDone`.
- Zwei Schritte: (1) Textarea + "Analysieren", (2) Vorschau-Tabelle + "Übernehmen".
- Parser als reine Funktion `parsePrepBlocks(text)` im gleichen File.
- Nutzt existierende Konstanten aus `FirstWorkdayPrepDialog.tsx` (`BANK_IDENT_FIELDS`, `DEFAULT_IDENT_FIELDS`, `fieldsForOrder`, `templateForOrder`) — diese werden dafür aus dem Modul mit-exportiert.
- Liest Bankdrop-`orders` und `ident_info_templates` per React Query mit denselben Keys wie der Prep-Dialog (Cache-Reuse).

In `src/pages/admin/AdminErsterArbeitstag.tsx`:
- Neben `<ExtractDayIdsDialog>`-Trigger pro Tagesabschnitt ein zweiter Link **"Vorbereitung importieren"** in identischem Stil.
- State `bulkImportDay: string | null` analog zu `extractDay`.
- Übergibt die `filteredItems` des Tages und `activeBrandingId` an den neuen Dialog.

Es werden keine bestehenden Speicher-, Sortier- oder Star-Mechaniken verändert.
