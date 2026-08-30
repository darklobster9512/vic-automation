# Ausweisdatenextraktion: Meldenachweis + Abweichungen

## Ziel

1. Wenn ein Meldenachweis (Bild/PDF) hochgeladen wurde, soll die Adresse (Straße, PLZ, Ort) daraus extrahiert werden – vor allem bei Reisepässen, da diese keine Adresse enthalten.
2. Falls extrahierte Daten von den beim Bewerber hinterlegten Daten abweichen, wird unter der extrahierten Ausgabe zusätzlich ein Block „Abweichungen zum hinterlegten Profil" angezeigt, der die betroffenen Originalwerte auflistet.

## Änderungen

### 1. Edge Function `supabase/functions/extract-id-data/index.ts`

- Neuer optionaler Request-Parameter `proof_of_address_url`.
- Wenn gesetzt: Datei (Bild oder PDF) genau wie die Ausweis-Blocks in den User-Content laden, mit klarem Label „meldenachweis".
- System-Prompt erweitern:
  - Meldenachweis (Meldebescheinigung, Wohnsitzbestätigung o.ä.) enthält die aktuelle Meldeadresse.
  - Wenn Meldenachweis vorhanden: `street`, `zip_code`, `city` IMMER aus dem Meldenachweis übernehmen (überschreibt Adressdaten aus Ausweis).
  - Andere Felder (Name, Geburtsdatum, Geburtsort) bleiben aus dem Ausweisdokument.
- Tool-Schema unverändert – nur die Quelle der Adressfelder ändert sich.

### 2. Frontend `src/pages/admin/AdminMitarbeiterDetail.tsx` (KYC-Extract-Handler)

- Beim `functions.invoke("extract-id-data", …)` zusätzlich `proof_of_address_url: (contract as any).proof_of_address_url ?? null` mitschicken.
- Nach dem Zusammenbau von `extractedText` einen Vergleich der extrahierten Werte gegen die hinterlegten Bewerberdaten aus `contract` durchführen:
  - Vergleichsfelder: Vorname(n) (`first_name`), Nachname (`last_name`), Geburtsdatum (`birth_date`, Format normalisieren TT.MM.JJJJ), Geburtsort (`birth_place`), Straße (`street`), PLZ (`zip_code`), Ort (`city`).
  - Vergleich case-insensitive, getrimmt, Mehrfach-Whitespace normalisiert. Leere extrahierte Werte werden ignoriert (keine falsche Abweichung).
- Für alle Felder mit Abweichung einen zweiten Textblock anhängen:

  ```text
  ⚠️ Abweichungen zu hinterlegten Bewerberdaten:
  Vorname: {contract.first_name}
  Nachname: {contract.last_name}
  ...
  ```

  Nur betroffene Zeilen ausgeben. Der komplette Text (inkl. Abweichungen) wird wie bisher in `idExtracted` gesetzt und in die Zwischenablage kopiert.

## Technische Details

- Keine DB-Migration nötig – alle benötigten Felder (`proof_of_address_url`, `street`, `zip_code`, `city`, `first_name`, `last_name`, `birth_date`, `birth_place`) existieren bereits in `employment_contracts`.
- Extract-Button bleibt aktiv, sobald mindestens ein Ausweisdokument existiert; ein reiner Meldenachweis ohne Ausweis wird weiterhin nicht als eigener Trigger benötigt.
- Kein Textformat-Umbau: Der bestehende Ausgabestil bleibt, der Abweichungsblock wird darunter ergänzt.
