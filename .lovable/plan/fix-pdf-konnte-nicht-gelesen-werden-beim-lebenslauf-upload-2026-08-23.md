# Fix: „PDF konnte nicht gelesen werden" beim Lebenslauf-Upload

## Was passiert

Das Auslesen der PDFs im Browser läuft über pdf.js. Dessen Worker-Datei wird aktuell von einem externen CDN (jsdelivr) nachgeladen. Schlägt dieser Nachladeversuch fehl (Netzwerk, Blocker, Version), scheitert jedes einzelne PDF sofort — deshalb 10 von 10 Fehlern, obwohl die Dateien in Ordnung sind (serverseitig wurden dieselben 10 PDFs korrekt ausgelesen).

Zusätzlich wird die eigentliche Fehlermeldung von pdf.js verschluckt und durch den generischen Text „PDF konnte nicht gelesen werden" ersetzt, sodass die Ursache im UI nicht sichtbar ist.

## Lösung

1. **Worker lokal bündeln** statt vom CDN laden: die Worker-Datei aus dem bereits installierten `pdfjs-dist` (v4.8.69) per Vite-URL-Import einbinden und als `workerSrc` setzen. Damit ist die Extraktion unabhängig von externen Netzwerkzugriffen und die Version passt garantiert zur Library.
2. **Zentrale Worker-Konfiguration** in einem kleinen Modul, das sowohl die Lebenslauf-Extraktion als auch die bestehende KYC-Dokumentvorschau nutzen — heute setzen beide Stellen den CDN-Pfad doppelt.
3. **Fehler sichtbar machen**: Wenn ein PDF wirklich nicht lesbar ist, die konkrete pdf.js-Meldung mit anzeigen und in die Konsole loggen, statt nur den generischen Text.
4. **Zusätzlicher Sicherheitsgurt**: Scheitert das Lesen im Browser trotzdem (z. B. gescanntes/kaputtes PDF), wird die Datei nicht mehr sofort als Fehler abgehakt — der Name wird weiterhin aus dem Dateinamen abgeleitet und der Eintrag als „Unvollständig" gelistet, damit Nummer/E-Mail manuell ergänzt werden können.

## Technisch

- Neues Modul `src/lib/pdfWorker.ts`: `pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href` (bzw. `?url`-Import), einmalig gesetzt.
- `src/lib/cvExtraction.ts` und `src/components/admin/KycDocumentPreview.tsx` importieren dieses Modul; CDN-Zeilen entfallen.
- `extractApplicantFromPdf`: Fehlerpfad gibt `message` mit `String(e)` bzw. `e.message` zurück und fällt auf `fallbackExtract` mit leerem Text zurück (Name aus Dateiname) → Status `incomplete` statt `failed`.
- Keine Änderungen an der Edge Function `extract-cv-data` und keine Datenbankänderung.
