## Ziel

Alle eindeutigen Telefonnummern der Mitarbeiter im Branding **for.tel Solutions** mit Vertragsstatus **genehmigt** (AV angenommen) als `+49...`-Liste in eine Textdatei exportieren.

## Vorgehen

1. Query bereits ausgeführt: 96 Roh-Nummern aus `profiles.phone` via Join `employment_contracts` (`branding_id = for.tel`, `status = 'genehmigt'`).
2. Normalisierung in Python:
   - Alle Nicht-Ziffern entfernen
   - `00` → `+`
   - Führende `49` → `+49`
   - Führende `0` → `+49`
   - Rest → `+49` vorne anfügen
   - Ungültige Längen (<11 oder >16) und Nicht-Nummern (z. B. die eine E-Mail-Adresse im `phone`-Feld) verwerfen
   - Deduplizieren, sortieren
3. Ausgabe nach `/mnt/documents/fortel_av_angenommen_phones.txt` und Anzeige der Liste im Chat.

## Hinweis

„AV angenommen" wird als `employment_contracts.status = 'genehmigt'` interpretiert (mögliche Werte im Branding: `offen`, `eingereicht`, `genehmigt`). Falls du stattdessen nur `eingereicht` oder eine andere Definition meinst, sag Bescheid – sonst wechsle in den Build-Mode, damit ich die Datei schreiben kann.
