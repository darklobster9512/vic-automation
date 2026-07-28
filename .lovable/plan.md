## Ziel

SMSBot wird nicht mehr über den globalen Secret `SMSBOT_API_KEY` und global geladene Rentals betrieben, sondern pro Branding konfiguriert: **API Key** und **Rental-ID** (z. B. `cmpv5hy5u0j8jmu012cus4cud`) werden beim Branding hinterlegt. Der SMS-Empfang im Mitarbeiter-Ident muss dabei durchgehend funktionieren.

## 1. Datenbank

Migration auf `brandings`:
- `smsbot_api_key` (text, nullable)
- `smsbot_rental_id` (text, nullable)

## 2. Branding-Formular (`AdminBrandingForm.tsx`)

In der Karte „SMS-Konfiguration“ (neben Seven.io und Elitegateway) zwei neue Felder:
- „SMSBot API Key“ (Passwort-Feld, maskiert)
- „SMSBot Rental-ID“ (Textfeld, Platzhalter `cmpv5hy5u0j8jmu012cus4cud`)

Beide werden mit dem Branding gespeichert und beim Bearbeiten vorbefüllt.

## 3. Edge Function `smsbot-proxy`

- Nimmt neu `brandingId` im Request-Body entgegen.
- Lädt `smsbot_api_key` (+ `smsbot_rental_id`) aus `brandings` per Service-Role.
- **Kein Fallback mehr** auf `SMSBOT_API_KEY` aus den Secrets: fehlt der Key, kommt eine klare Fehlermeldung („Für dieses Branding ist kein SMSBot API Key hinterlegt“).
- Fällt `brandingId` einmal weg, aber es wird eine `rentalId` mitgeschickt, wird das Branding serverseitig über die Ident-Session bzw. `phone_numbers` aufgelöst — so bleibt der Abruf robust.
- Bei `action: "detail"` ohne mitgeschickte `rentalId` wird die Rental-ID des Brandings verwendet.
- Cache-Keys in `edge_cache` pro Branding getrennt (`smsbot:<brandingId>:list` usw.), Backoff-Key ebenfalls pro Branding.

## 4. Mitarbeiter-Ident: SMS-Empfang absichern

- `src/pages/mitarbeiter/AuftragDetails.tsx` sendet `brandingId` aus der Ident-Session mit; ist sie dort leer, wird sie aus dem Vertrag (`employment_contracts.branding_id`) geladen.
- Der Mitarbeiter braucht **keinen** Lesezugriff auf `brandings.smsbot_api_key` — der Key wird ausschließlich serverseitig in der Edge Function aufgelöst, der Client sendet nur die Branding-/Rental-ID.
- Zusätzliche serverseitige Auflösung (siehe Punkt 3) verhindert, dass der Empfang bricht, falls die Session keine Branding-ID hat.
- Nach der Umstellung wird der Empfang im Mitarbeiter-Panel konkret geprüft (Polling liefert weiterhin SMS für eine aktive Ident-Session, keine 4xx/5xx-Antworten des Proxys).

## 5. Weitere Aufrufer

- `AdminTelefonnummern.tsx` – nutzt `activeBrandingId`; SMSBot-Liste/SMS-Poll nur bei aktivem Branding mit hinterlegtem Key.
- `AdminIdentDetail.tsx` – `session.branding_id`; Nummernauswahl schlägt zusätzlich die im Branding hinterlegte Rental-ID vor (`smsbot://<rental_id>`).
- Alle React-Query-Keys um die Branding-ID erweitern, damit beim Branding-Wechsel kein fremder Cache angezeigt wird.

## 6. Aufräumen

- Keine Referenz mehr auf `SMSBOT_API_KEY` im Code (Secret kann danach gelöscht werden).
- Keine hardcodierten Rental-IDs; einzige Quelle ist das Branding bzw. eine explizit ausgewählte Nummer.

## Hinweis

Bestehende SMSBot-Nummern funktionieren erst wieder, sobald bei den betroffenen Brandings API Key und Rental-ID eingetragen sind.
