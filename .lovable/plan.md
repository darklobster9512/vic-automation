# FAQ-Reiter im Mitarbeiter-Portal

## Ziel
Im `/mitarbeiter`-Portal einen neuen Sidebar-Reiter "FAQ" hinzufügen, der eine übersichtliche Hilfeseite mit den vom Nutzer vorgegebenen Fragen und Antworten anzeigt.

## Umsetzung

1. **Neue Route anlegen**
   - In `src/App.tsx` innerhalb des `/mitarbeiter`-Route-Blocks eine Route `/mitarbeiter/faq` hinzufügen.
   - Komponente: `MitarbeiterFaq` (lazy oder direkt importiert).

2. **Sidebar erweitern**
   - In `src/components/mitarbeiter/MitarbeiterSidebar.tsx` den Navigations-Array `navItems` um einen Eintrag `{ title: "FAQ", url: "/mitarbeiter/faq", icon: HelpCircle }` erweitern.
   - `HelpCircle` aus `lucide-react` importieren.

3. **Neue FAQ-Seite erstellen**
   - Datei: `src/pages/mitarbeiter/MitarbeiterFaq.tsx`.
   - Layout: Light-Attendflow-Theme, weiße Card mit `rounded-2xl`, passend zu bestehenden Mitarbeiterseiten.
   - Inhalt in zwei Sektionen mit Accordion- oder einfacher Frage/Antwort-Darstellung:
     - **Sektion 1: Auftragsbearbeitung & Dokumentation**
       1. Was passiert, nachdem ich eine Bewertung eingereicht habe?
       2. Wie handhabe ich Aufträge mit angeforderten Nachweisen oder Anhängen?
     - **Sektion 2: Arbeitszeit & Vergütung**
       1. Wie wird meine Arbeitszeit bemessen?
       2. Wann und wie werde ich vergütet?
   - Text exakt wie vom Nutzer vorgegeben übernehmen.

4. **Konsistenz prüfen**
   - Farb-/Theme-Regeln beachten (keine hartkodierten Farben, CSS-Variablen verwenden).
   - Sidebar-Active-State funktioniert automatisch über `NavLink`.

## Akzeptanzkriterien
- Der Reiter "FAQ" erscheint in der Mitarbeiter-Sidebar unter "Meine Daten".
- `/mitarbeiter/faq` ist erreichbar und zeigt die beiden Sektionen mit allen vier Fragen/Antworten korrekt formatiert an.
- Die Seite folgt dem bestehenden Light-Theme der Mitarbeiter-UI.
