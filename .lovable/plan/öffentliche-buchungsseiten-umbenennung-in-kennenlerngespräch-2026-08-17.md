# Öffentliche Buchungsseiten: Umbenennung in "Kennenlerngespräch" + neuer Intro-Step

## Ziel
Auf den öffentlichen Routen `/bewerbungsgespraech/buchen` und `/buchen` soll das Wort "Bewerbungsgespräch" durch "Kennenlerngespräch" ersetzt werden (die URLs selbst bleiben unverändert). Zusätzlich erhält die Einstiegsseite einen neuen Intro-Step mit einem "Weiter"-Button, der erst zum bestehenden Datenformular führt.

## Änderungen

### 1. Textliche Anpassungen auf beiden öffentlichen Seiten
- `src/pages/BewerbungsgespraechPublic.tsx`:
  - Seitentitel/H1: "Bewerbungsgespräch buchen" → "Kennenlerngespräch buchen"
  - Button-Label: "Weiter zur Terminbuchung" bleibt erhalten, erscheint aber erst auf Step 2
- `src/pages/Bewerbungsgespraech.tsx`:
  - Alle sichtbaren Vorkommen von "Bewerbungsgespräch" (z. B. Bestätigungs-Headline, Hinweistexte) → "Kennenlerngespräch"
  - Keine Änderung an Routen, Dateinamen oder API-Parametern

### 2. Neuer zweistufiger Flow in `BewerbungsgespraechPublic.tsx`
Einführung eines lokalen `step`-States (`intro` | `form`):

**Step 1: Intro**
- Logo und `ContactCard` (bereits vorhanden) bleiben oben sichtbar.
- Darunter eine Info-Card mit:
  - H1: "Kennenlerngespräch buchen"
  - Subheadline: "Prozesstester (m/w/d) im Homeoffice"
  - Fließtext: "Lernen Sie uns in einem kurzen, unverbindlichen Gespräch kennen."
  - Detailzeile: "Dauer: nur 10–15 Minuten."
  - Ansprechpartner-Zeile: "Ihr persönlicher Ansprechpartner Jonas Hagenauer begleitet Sie durch den Bewerbungsprozess und beantwortet Ihre Fragen."
- Button "Weiter" schaltet auf Step 2 um.

**Step 2: Formular**
- Das bestehende Formular (Vorname, Nachname, E-Mail, Telefonnummer) wird angezeigt.
- H1 hier ebenfalls "Kennenlerngespräch buchen".
- Optional: ein "Zurück"-Link/Button, um wieder zum Intro zu gelangen.

### 3. Design-Konsistenz
- Farbgebung, Abstände, Schriftgrößen und Animationen an das bestehende Premium-Light-Design anpassen (weiße/glassmorphe Cards, Brand-Farb-Akzent, `rounded-2xl`).
- Keine hartkodierten Farbwerte außerhalb der bestehenden Brand-Color-Logik.

## Nicht im Scope
- Keine Änderungen an Admin-Seiten (`/admin/bewerbungsgespraeche` etc.).
- Keine Änderungen an Edge Functions, Datenbank oder SMS-Templates.
- Keine URL-/Routen-Änderungen.

## Validierung
- Lokaler Build-Check (`bun run build` bzw. TypeScript) muss fehlerfrei durchlaufen.
- Visueller Check im Preview auf `/bewerbungsgespraech/buchen`: Intro-Step wird korrekt angezeigt, "Weiter" führt zum Formular, danach normale Terminbuchung.
