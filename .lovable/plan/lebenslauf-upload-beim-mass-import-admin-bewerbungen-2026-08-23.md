# Lebenslauf-Upload beim Mass Import (/admin/bewerbungen)

## Ziel

Wenn im "Neue Bewerbung"-Dialog **Externe Bewerbung (Allgemein)** + **Mass Import** aktiv sind, erscheint zusätzlich ein Upload-Feld für beliebig viele PDF-Lebensläufe. Aus jedem PDF werden Vorname, Nachname, E-Mail und Handynummer extrahiert und automatisch als fertige Zeilen ins Bewerber-Textfeld geschrieben.

## Ablauf im UI

1. Dropzone "Lebensläufe hochladen (PDF)" – Mehrfachauswahl und Drag & Drop, keine Mengenbegrenzung.
2. Nach dem Upload läuft die Auswertung mit Fortschrittsanzeige ("3 / 10 ausgewertet").
3. Pro Datei eine Zeile im Ergebnis-Panel: Dateiname, erkannter Name, E-Mail, Nummer, Status (OK / unvollständig / fehlgeschlagen).
4. Erkannte Bewerber werden ans bestehende Textfeld angehängt, dort weiterhin manuell editierbar. Die bestehende Duplikatprüfung greift unverändert.
5. Dateien mit unvollständigen Daten werden separat aufgelistet und nicht ins Textfeld geschrieben, damit nichts Halbfertiges importiert wird.

## Normalisierungsregeln

- **Namen**: nie in Großbuchstaben – jedes Wort mit großem Anfangsbuchstaben, Rest klein ("SARAH HINKE" -> "Sarah Hinke"). Bindestrich- und Apostroph-Namen werden je Teil korrekt gesetzt ("MEYER-SCHULZ" -> "Meyer-Schulz"). Bereits korrekt gemischte Schreibweisen (z. B. "McDonald", "van Dijk") bleiben unverändert.
- Mehrere Vornamen: alles außer dem letzten Wort ist Vorname, das letzte Wort Nachname (wie bisher im Textformat).
- **E-Mail**: Endet die gefundene Adresse auf `@indeedemail.com`, wird keine E-Mail übernommen – der Eintrag enthält dann nur Name + Nummer.
- **Telefon**: Ausgabe immer als `+49...` ohne Leerzeichen, Klammern, Schrägstriche oder Bindestriche. `0176 123 456` -> `+49176123456`, `(0151)/123-456` -> `+49151123456`, `0049...` und `+49...` werden ebenfalls vereinheitlicht. Nummern, die eindeutig keine Mobilnummer sind (Datumsangaben, Postleitzahlen), werden ignoriert.

## Textformat im Bewerber-Feld

- Mit E-Mail: `Vorname Nachname email@domain.de +49176...`
- Ohne E-Mail (Indeed-Fall): `Vorname Nachname +49176...`

Der bestehende Zeilen-Parser verlangt aktuell zwingend eine E-Mail. Er wird so erweitert, dass Zeilen ohne E-Mail gültig sind (E-Mail bleibt dann leer); die Datenbankspalte erlaubt das bereits.

## Technische Umsetzung

- **PDF-Text**: Auslesen direkt im Browser über die bereits vorhandene pdf.js-Instanz (`react-pdf`/`pdfjs`), Seite für Seite als Text.
- **Extraktion**: Neue Edge Function `extract-cv-data`, die den PDF-Text an das Lovable AI Gateway schickt (`google/gemini-3-flash`, strukturierte JSON-Ausgabe mit `first_name`, `last_name`, `email`, `phone`). Das ist nötig, weil die Layouts sehr unterschiedlich sind (Kontaktdaten in Seitenspalten, Fußzeilen, Ligaturfehler wie "Ko ermair").
  - Fehlerbehandlung nach Gateway-Regeln: 429/5xx mit Backoff erneut versuchen, 402/403 mit klarer Meldung abbrechen.
  - Verarbeitung in kleinen Paketen (z. B. 3 parallel), damit große Uploads das Rate-Limit nicht sprengen.
- **Fallback**: Ergänzend eine reine Regex-Extraktion (E-Mail-Muster, deutsche Mobilnummern, Name aus Kopfzeile/Dateiname), die greift, wenn die KI-Antwort unvollständig ist.
- Normalisierung (Namen, Telefon, indeedemail-Regel) passiert clientseitig in einem eigenen Helfer, damit sie auch für manuell eingetippte Zeilen gilt.
- Geänderte Dateien: `src/pages/admin/AdminBewerbungen.tsx`, neuer Helfer `src/lib/cvExtraction.ts`, neue Edge Function `supabase/functions/extract-cv-data/index.ts`.
- Die PDFs werden nur zur Auswertung gelesen und nicht gespeichert.

## Test

Verifikation mit den 10 angehängten Lebensläufen: erwartet werden u. a. `Sarah Hinke ... +4915159437097`, `Tobias Bendler +4915124148773` (ohne E-Mail wegen indeedemail.com), `Serap Dag serap.demirel@web.de +4915168508699` (Kontakt nur in der Fußzeile).
