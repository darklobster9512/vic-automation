# Ausweisdaten-Extraktion: neues Ausgabeformat

## Ziel
Format der Extraktion umbauen und Geburtsname unterstützen.

## Neues Format
```
08:00 Uhr (LIMEX)
Vorname: Max
Nachname: Mustermann
Geburtsname: Müller
Geburtsdatum: 01.01.1990
Geburtsort: Berlin
Straße 1
12345 Berlin
Familienstand: …
Steuer-ID: …
Aktuelle Bank: …
```
- Erste Zeile (Uhrzeit + Branding-Kurzname in Klammern) nur, wenn Kontext übergeben (im Tages-Dialog immer, im KYC-Tab weggelassen).
- Branding-Kurzname = Firmenname vor erstem Leerzeichen/„GmbH/UG/AG"-Suffix, uppercase. Fallback: erstes Wort in Uppercase.
- `Geburtsname` nur zeigen, wenn Ausweis einen enthält (im deutschen Personalausweis Feld [2] „Geburtsname", im Reisepass „Geburtsname/Name at birth").
- Wenn kein Geburtsname vorhanden → Zeile weglassen.
- Geburtsdatum und Geburtsort jeweils eigene Zeile.
- Abweichungsblock bleibt unverändert unten.

## Änderungen

### `supabase/functions/extract-id-data/index.ts`
- Tool-Parameter um `birth_name: string` erweitern (required, "" wenn nicht vorhanden).
- System-Prompt: Regel ergänzen — „Geburtsname (Feld [2] auf deutschem Personalausweis bzw. `Geburtsname` im Reisepass) exakt übernehmen, in normale Schreibweise. Wenn nicht vorhanden, "" zurückgeben."

### `src/lib/extractIdData.ts`
- Signatur um optionales `context?: { appointmentTime?: string; brandingName?: string }` erweitern.
- Ausgabe neu bauen:
  - Wenn `context.appointmentTime` und/oder `brandingName` gesetzt: `HH:MM Uhr (KURZ)` als erste Zeile.
  - `Vorname:`, `Nachname:`, optional `Geburtsname:`, `Geburtsdatum:`, `Geburtsort:`, Adresszeilen, dann Familienstand/Steuer-ID/Bank wie gehabt.
- Kurz-Helfer `shortBrandingName(name)` → erstes Wort ohne Rechtsform-Suffix, uppercase.
- Abweichungsprüfung um `Geburtsname` erweitern (Vergleich gegen leer bleibt no-op).

### `src/components/admin/ExtractDayIdsDialog.tsx`
- `ExtractDayEntry` um `appointmentTime` und `brandingName` erweitern.
- Beim Aufruf von `extractIdData` den Kontext mitgeben.

### `src/pages/admin/AdminErsterArbeitstag.tsx`
- Beim Mapping der Entries `appointmentTime: r.item.appointment_time` und `brandingName: r.brandingName` übergeben.

### `src/pages/admin/AdminMitarbeiterDetail.tsx`
- Unverändert (kein Kontext → keine Kopfzeile).

## Hinweise
- Kein DB-Schema-Change.
- Typecheck nach Umsetzung.
