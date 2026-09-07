# SMS-Störungsinfo: Direktlink und Rechtschreibung

## Ziel
Die SMS im Störungsinfo-Dialog soll statt eines Shortlinks den direkten Panel-Link verwenden (z. B. `https://app.codebricks.gmbh`) und „aendere“ soll korrekt als „ändere“ geschrieben werden.

## Änderungen

### `src/components/admin/DomainAnnouncementDialog.tsx`
1. **Default-SMS korrigieren**
   - `aendere` → `ändere`
2. **Shortlink entfernen**
   - Import `createShortLink` entfernen
   - Aufruf `createShortLink(...)` entfernen
   - Für `{link}` direkt `buildBrandingUrl(brandingId, "")` verwenden (Panel-Root-URL ohne `/auth`)
3. **Platzhalter-Hinweis anpassen**
   - Hinweistext unter dem SMS-Textfeld aktualisieren, damit klar ist, dass `{link}` nun der direkte Panel-Link ist

## Keine weiteren Änderungen
E-Mail-Text, Empfängerlogik, Versand und UI-Layout bleiben unverändert.
