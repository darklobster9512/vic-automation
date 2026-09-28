# JSON-Analyse-Werkzeug im Admin-Bereich

## Ziel
Neue Admin-Seite `/admin/json-analyse`: JSON-Dateien hochladen, einlesen und auswerten. Rein lesend – es wird nichts in die Datenbank geschrieben und es gehen keine E-Mails/SMS raus.

## Funktionen
- **Upload:** Mehrere `.json`-Dateien per Dateiauswahl oder Drag & Drop. Verarbeitung komplett im Browser (kein Upload zum Server, keine Speicherung).
- **Struktur-Erkennung:** Automatische Erkennung des JSON-Aufbaus (Array, Objekt, verschachtelte Listen). Ungültige Dateien werden mit klarer Fehlermeldung übersprungen.
- **Übersicht:** Kennzahlen pro Datei – Anzahl Einträge, erkannte Felder, Werteverteilungen (z. B. Häufigkeit pro Feldwert), Zeitbereich falls Datumsfelder vorhanden.
- **Tabellenansicht:** Alle Einträge als durchsuchbare, sortierbare Tabelle mit Spaltenauswahl. Freitextsuche über alle Felder.
- **Filter:** Beliebige Feld-Wert-Filter (gleich, enthält, Datumsbereich), kombinierbar.
- **Export der Ansicht:** Gefilterte Ergebnisse als CSV herunterladen (nur lokaler Download, keine Datenbank).
- **Zusammenführen:** Mehrere Dateien können zu einer Gesamtansicht kombiniert werden, mit Duplikat-Erkennung über wählbare Schlüsselfelder.

## Technische Umsetzung
- Neue Seite `src/pages/admin/AdminJsonAnalyse.tsx`, Route in `src/App.tsx` unter dem Admin-Layout, Eintrag in `src/components/admin/AdminSidebar.tsx` (Bereich „System" nahe Backups).
- Parsing mit `JSON.parse` im Browser; große Dateien werden in Teilen verarbeitet, damit die Seite nicht einfriert.
- Flachklopfen verschachtelter Objekte (Punkt-Notation) für die Tabellenspalten.
- Kein neuer API-Endpunkt, keine Edge Function, keine Migration – keine Datenbankänderungen.
- Styling passend zum bestehenden Admin-Panel (Premium-Card-Layout).

## Grenzen
- Kein Schreiben in die Datenbank, kein Abgleich mit dem Datenbankstand, keine Benachrichtigungen.
- Dateien verlassen den Browser nicht; nach einem Seitenwechsel ist die Auswertung weg (bewusst ohne Speicherung).

## Verifikation
- `bunx tsgo` nach den Änderungen.
- Test mit einer Beispiel-JSON: Upload, Kennzahlen, Suche, Filter, CSV-Export.
