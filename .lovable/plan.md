
## Ziel

Im `/admin/idents/:id`-Detail den Bereich „Telefonnummer" auf beide Provider erweitern: erst Provider wählen (Anosim / SMSBot), dann Nummer aus einer durchsuchbaren Combobox auswählen.

## Änderungen in `src/pages/admin/AdminIdentDetail.tsx`

### 1. Provider-Toggle
- Neuer State `provider: "anosim" | "smsbot"` (Default: aus `session.phone_api_url` ableiten — startet mit `smsbot://` → smsbot, sonst anosim).
- Zwei Buttons oben im Telefon-Card (gleiches Muster wie in `AdminTelefonnummern`).

### 2. Nummern-Quellen
- **Anosim**: bestehende Query `["phone_numbers", branding_id]` bleibt (Branding-gefiltert).
- **SMSBot**: neue Query `["smsbot_rentals"]` via `smsbot-proxy` action `list` (60 s Refetch, staleTime 30 s — teilt Cache mit `SmsWatch`/`AdminTelefonnummern` dank identischem Key). Liefert bereits `number` — kein zusätzlicher Detail-Call nötig.

### 3. Combobox mit Suche
- Bestehendes `Select` ersetzen durch shadcn **Combobox** (`Popover` + `Command` + `CommandInput` + `CommandList`/`CommandItem`).
- Items zeigen die tatsächliche Rufnummer (aus Cache/`phoneDisplayMap` für Anosim, direkt aus `rental.number` für SMSBot), plus kleine Provider-Badge.
- `CommandInput` ermöglicht Filtern nach Nummer, Service, Land.
- Auswahl → `handleAssignPhone(identifier)` wobei:
  - Anosim-Identifier = `entry.api_url` (unverändert).
  - SMSBot-Identifier = `smsbot://<rentalId>` (Format schon etabliert, siehe `AdminTelefonnummern`).

### 4. SMS-Fetch erweitern
- Aktueller `useEffect` ruft nur `anosim-proxy`. Umbauen:
  - Wenn `apiUrl.startsWith("smsbot://")` → `smsbot-proxy` mit `{ rentalId }` aufrufen (Response hat identisches `sms`-Schema dank `normRental`).
  - Sonst wie bisher `anosim-proxy`.
- Polling-Intervall bleibt 5 s (nur eine ausgewählte Nummer → unkritisch).

### 5. Resolved-Nummer-Badge
- Für SMSBot direkt aus dem `smsbot_rentals`-Cache lesen; für Anosim wie bisher aus `phoneDisplayMap`.

### 6. Manueller Share-Link-Input
- Nur noch anzeigen wenn `provider === "anosim"` (SMSBot hat keine manuellen Links, Nummern kommen aus dem Cabinet).
- „Zum Branding hinzufügen"-Checkbox ebenfalls nur bei Anosim (SMSBot-Nummern sind Konto-weit).

### 7. Cleanup
- Label ändern von „Telefonnummer (Anosim)" → „Telefonnummer".
- Keine DB-Migration nötig — `phone_api_url` speichert weiterhin String (`https://anosim…` oder `smsbot://…`), Format ist bereits im System etabliert (siehe `AdminTelefonnummern`-Zuweisungsliste).

## Nicht betroffen
- SmsWatch-Widget, AdminTelefonnummern, Edge-Functions — bleiben unverändert (sie liefern schon alles, was hier gebraucht wird).
