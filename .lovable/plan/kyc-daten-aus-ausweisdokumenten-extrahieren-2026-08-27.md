# KYC-Daten aus Ausweisdokumenten extrahieren

## Ziel

Im KYC-Tab der Mitarbeiter-Detailseite (`/admin/mitarbeiter/:id`) kommt ein Button **„Ausweisdaten extrahieren"**. Klick -> die hochgeladenen Ausweis-Bilder/PDFs (Vorder- und Rückseite, bei Reisepass die eine Seite) werden per KI-Bilderkennung ausgelesen und das Ergebnis erscheint als kopierbarer Block:

```text
Dominik Hubertus Alfons Bergschneider
16.05.1993 in Rheine
Wilhelm-Busch-Str. 18 A
49479 Ibbenbüren
verheiratet
```

Wichtig: Name, Geburtsdatum, Geburtsort und Adresse kommen **ausschließlich aus dem Ausweisdokument**, nie aus den gespeicherten „Persönliche Daten" (dort fehlen oft Zweitnamen oder es gibt Tippfehler). Nur der **Familienstand** wird aus den Persönlichen Daten des Vertrags ergänzt.

## Ablauf

1. Button oben rechts im KYC-Bereich, aktiv nur wenn mindestens ein Ausweisbild vorhanden ist.
2. Beim Klick: Ladezustand, die Dokument-URLs werden an eine neue Edge Function geschickt.
3. Die Function lädt die Dateien, schickt sie als Bild an ein Vision-Modell (Lovable AI Gateway, Gemini) und erhält strukturierte Felder zurück.
4. Ergebnis wird im UI in einer Karte angezeigt: der fertig formatierte Block + Button „Kopieren". Zusätzlich Hinweis, wenn ein Feld nicht lesbar war (z. B. Adresse fehlt auf der Vorderseite -> kommt von der Rückseite; bei Reisepass gibt es keine Adresse).
5. Der Familienstand aus dem Vertrag wird clientseitig als letzte Zeile angehängt (weggelassen, wenn leer).

## Formatierung

- Zeile 1: alle Vornamen + Nachname exakt wie im Ausweis (Umlaute wiederhergestellt, keine Versalien wie „MUSTERMANN")
- Zeile 2: `TT.MM.JJJJ in <Geburtsort>`
- Zeile 3: Straße + Hausnummer
- Zeile 4: PLZ + Ort
- Zeile 5: Familienstand aus Persönliche Daten

## Technisch

- Neue Edge Function `supabase/functions/extract-id-data/index.ts`:
  - Input: `{ front_url, back_url?, id_type }`
  - Lädt jede Datei; Bilder werden als Base64-Data-URL angehängt, PDFs als `file`-Block (`application/pdf`) an das Chat-Completions-Multimodal-Format.
  - Modell: `google/gemini-3.7-flash` über `https://ai.gateway.lovable.dev/v1/chat/completions` mit `LOVABLE_API_KEY`.
  - Structured Output via Tool-Call `extract_id`: `first_names`, `last_name`, `birth_date` (TT.MM.JJJJ), `birth_place`, `street`, `zip_code`, `city`. Fehlende Werte als `""`.
  - Fehlerbehandlung nach Gateway-Semantik: 429/5xx -> Hinweis „später erneut versuchen", 402 -> Credits-Meldung, sonst Fehlermeldung durchreichen.
  - `verify_jwt` bleibt Standard (nur eingeloggte Admins rufen auf); Aufruf über `supabase.functions.invoke`.
- `src/pages/admin/AdminMitarbeiterDetail.tsx`: Button + lokaler State (`extracting`, `extracted`), Ergebniskarte unter den Ausweisbildern, Kopieren via `navigator.clipboard`.
- Keine Datenbankänderung, keine Änderung an den gespeicherten Vertragsdaten (reines Auslesen/Anzeigen).
