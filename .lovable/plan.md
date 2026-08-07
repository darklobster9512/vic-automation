# Vertrags-PDFs für LIMEX Solutions neu erzeugen

## Ausgangslage (geprüft)

- LIMEX Solutions hat 8 genehmigte Verträge, alle über das Vorlagen-System (`contract_templates`).
- In der Datenbank ist bei **keinem** LIMEX-Vertrag ein PDF hinterlegt (`contract_pdf_url` und `signed_contract_pdf_url` sind leer). Es gibt aktuell also keine gespeicherte PDF-Datei, die man ersetzen könnte.
- Das PDF entsteht heute nur ad hoc: Der Mitarbeiter klickt im Panel auf „Herunterladen", dann wird die Vertragsansicht im Browser in ein PDF umgewandelt. Die Firmen-Unterschrift wird dabei live aus dem Branding geladen.
- Konsequenz: Alle PDFs, die **ab jetzt** heruntergeladen werden, enthalten die neue Unterschrift. Die 8 bereits verschickten/heruntergeladenen Dateien liegen aber außerhalb des Systems (beim Mitarbeiter) und lassen sich nicht rückwirkend ändern.

## Was gebaut wird

Damit es künftig echte, archivierte PDFs gibt und du die 8 Verträge sofort mit Unterschrift neu erzeugen kannst:

1. **PDF-Erzeugung im Admin-Bereich**
   - Neue Funktion, die die Vertragsansicht (Vorlage + Mitarbeiterdaten + Mitarbeiter-Unterschrift + Firmen-Unterschrift aus dem Branding) unsichtbar rendert, in ein PDF umwandelt, in den Storage lädt und die Adresse am Vertrag speichert.
   - Button „Vertrag als PDF erzeugen" in der Vertragsdetail-Ansicht unter `/admin/arbeitsvertraege`.

2. **Sammel-Aktion**
   - Button „PDFs für alle genehmigten Verträge erzeugen" auf `/admin/arbeitsvertraege`, der alle genehmigten Verträge des aktiven Brandings nacheinander abarbeitet, mit Fortschrittsanzeige und Ergebnis-Meldung.
   - Damit werden die 8 LIMEX-Verträge in einem Durchgang mit der neuen Unterschrift erzeugt.

3. **Download im Admin**
   - Ist ein PDF vorhanden, erscheint in der Vertragsdetail-Ansicht ein Download-Link, damit du die Dateien direkt herausgeben kannst.

## Technische Details

- Wiederverwendung des bestehenden Render-Pfads aus `src/pages/mitarbeiter/MeineDaten.tsx` (`html2canvas` + `jsPDF`), ausgelagert in `src/lib/renderContractPdf.ts`, damit Panel und Admin dieselbe Ausgabe erzeugen.
- Die Vertragsvorschau wird als gemeinsame Komponente (`ContractDocument`) extrahiert und im Admin off-screen gemountet; Datenquelle: `employment_contracts` + `contract_templates.content` + `brandings` (`signature_image_url`, `signer_name`, `signer_title`).
- Upload nach `contract-documents` unter `contracts/<contract_id>.pdf` mit `upsert: true`; anschließend `contract_pdf_url` am Vertrag setzen.
- Die Docmosis-Funktion `generate-contract` bleibt unverändert (nur für Brandings ohne Vorlagen).
- Sammellauf sequentiell mit kurzer Pause, um Speicher-/Rate-Probleme zu vermeiden.
