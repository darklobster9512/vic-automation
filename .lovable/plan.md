# Ausweisdaten-Extraktion: Positionierung und Auto-Kopieren

## Ziel
Im KYC-Tab der Mitarbeiter-Detailseite (`/admin/mitarbeiter/:id`) soll die "Extrahierte Ausweisdaten"-Card oberhalb der KYC-Dokumente (also über dem Titel "Personalausweis/Reisepass") angezeigt werden. Nach erfolgreicher Extraktion sollen die Daten automatisch in die Zwischenablage kopiert werden.

## Aktueller Stand
- Der "Ausweisdaten extrahieren"-Button befindet sich im Card-Header des KYC-Tabs.
- Das Ergebnis wird unterhalb der KYC-Bilder (Personalausweis/Reisepass) als Card mit einem manuellen "Kopieren"-Button angezeigt.
- Es findet noch kein automatisches Kopieren statt.

## Geplante Änderungen

### 1. Positionierung der Ergebnis-Card
- Die `idExtracted`-Ausgabe (aktuell Zeilen ~1035–1052 in `src/pages/admin/AdminMitarbeiterDetail.tsx`) wird **vor** dem "Personalausweis/Reisepass"-Block (aktuell Zeile ~1010) platziert.
- Dadurch erscheinen die extrahierten Daten direkt unter dem Button und **über** den KYC-Bildern.

### 2. Automatisches Kopieren
- Nach erfolgreicher Extraktion (`setIdExtracted(lines.join("\n"))`) wird zusätzlich `navigator.clipboard.writeText(...)` aufgerufen.
- Es wird eine `toast.success("Ausweisdaten extrahiert und kopiert")` angezeigt.
- Der bestehende "Kopieren"-Button bleibt erhalten, damit der Nutzer die Daten bei Bedarf erneut kopieren kann.

### 3. Datei
- `src/pages/admin/AdminMitarbeiterDetail.tsx`

## Nicht im Scope
- Keine Änderungen an der Edge Function `extract-id-data`.
- Keine Änderungen am Extraktionsformat oder an den angezeigten Daten.
- Keine Änderungen an anderen Tabs oder Bereichen der Seite.
