# Meta-Pixel pro Branding steuerbar machen

## Ziel
Im Branding-Formular (Hinzufügen/Bearbeiten) lässt sich das Meta-Pixel für die öffentliche Buchungsseite `/bewerbungsgespraech/buchen` ein- und ausschalten und der Pixel-Code direkt eintragen. Aktiviert wird es zunächst nur bei Völler IT Solutions GmbH, mit dem dort bereits hinterlegten Pixel.

## Aktueller Stand (geprüft)
- Die Buchungsseite lädt den Pixel bereits pro Branding aus dem Feld `meta_pixel_id`.
- Völler IT hat dort bereits den Wert `1076768121483815` gespeichert; kein anderes Branding hat einen Wert.
- Im Branding-Formular gibt es bisher kein Eingabefeld dafür — der Wert ist nur direkt in der Datenbank setzbar.

## Umsetzung
1. Neues Branding-Feld `meta_pixel_enabled` (Ja/Nein, standardmäßig aus).
2. Neuer Abschnitt „Meta-Pixel (Buchungsseite)“ im Branding-Formular:
   - Schalter zum Aktivieren
   - Textfeld für den Pixel; es darf entweder nur die Pixel-ID oder der komplette kopierte Meta-Pixel-Code eingefügt werden — die ID wird daraus automatisch erkannt und gespeichert
   - Feld nur sichtbar/aktiv, wenn der Schalter an ist; kurzer Hinweis, dass das Pixel nur auf der öffentlichen Buchungsseite lädt
3. Buchungsseite lädt den Pixel künftig nur, wenn der Schalter aktiv ist **und** eine Pixel-ID hinterlegt ist (heute reicht die ID allein).
4. Datenbank-Update: Bei Völler IT den Schalter aktivieren, Pixel-ID bleibt `1076768121483815`. Alle anderen Brandings bleiben aus.

## Technische Details
- Migration: `ALTER TABLE public.brandings ADD COLUMN meta_pixel_enabled boolean NOT NULL DEFAULT false;` plus Update für Branding `9c944500-d35c-40b9-99b7-0d779350ce77`.
- `src/pages/admin/AdminBrandingForm.tsx`: Felder in State, Laden und Speichern ergänzen; Extraktion der ID per Regex `fbq\('init',\s*'(\d+)'\)` bzw. reine Ziffernfolge.
- `src/pages/BewerbungsgespraechPublic.tsx`: `meta_pixel_enabled` in die Select-Spalten aufnehmen und in die Render-Bedingung für `<MetaPixel />` einbauen.
- `src/pages/Bewerbungsgespraech.tsx` (individueller Link) bleibt unverändert.
