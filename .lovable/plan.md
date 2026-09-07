# Fix: /mitarbeiter/support zeigt 404

## Befund
Der Code ist bereits korrekt:
- `src/App.tsx` Zeile 137: `<Route path="support" element={<MitarbeiterSupport />} />` ist sauber unter der `/mitarbeiter`-Route verschachtelt.
- `src/App.tsx` Zeile 29: Import von `MitarbeiterSupport` vorhanden.
- `src/pages/mitarbeiter/MitarbeiterSupport.tsx` existiert mit Default-Export.

Die 404-Seite im Preview kommt daher nicht vom Code, sondern vom Dev-Server: In den Logs steht, dass der Vite-Prozess per SIGTERM beendet wurde. Das Preview läuft sehr wahrscheinlich noch mit einem veralteten Build, in dem die neue Route (beim Ticket-System hinzugefügt) noch nicht enthalten ist — deshalb fängt die Catch-all-Route (`*` → NotFound) die URL ab.

## Umsetzung
1. Dev-Server neu starten, damit der aktuelle Code mit der `support`-Route geladen wird.
2. Preview neu laden und `/mitarbeiter/support` prüfen: Die Support-Seite muss statt der 404-Seite erscheinen.
3. Falls danach immer noch 404: erneut prüfen (z. B. Browser-Cache/Hard-Reload).

## Nebenbei (optional, klein)
Die Konsole zeigt zwei harmlose React-Warnungen (fehlendes `forwardRef` bei `AnimatePresence` in `ChatWidget` und bei `NotFound`). Diese verursachen nicht das 404, können aber bei Bedarf mit `React.forwardRef` bereinigt werden.

## Technische Details
- Kein Code-Fix an der Route nötig — nur Neustart/Verifizierung.
- Betroffene Dateien: keine (Code bereits korrekt).
