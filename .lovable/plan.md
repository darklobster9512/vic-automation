# /admin/bewerbungen schneller machen

Die Seite lädt aktuell alle Bewerbungen eines Brandings auf einmal (for.tel: ~2.000, davon bis zu 1.009 in einem Tab) und rendert jede Zeile ungefiltert in einer Tabelle — inklusive Tooltip- und Popover-Komponenten pro Zeile. Jede Checkbox-Auswahl, jeder Sekunden-Tick der Queue und jeder Status-Wechsel rendert die komplette Tabelle neu. Das erklärt die Verzögerung beim Auswählen, den zähen Countdown und das allgemeine Lag.

## Was geändert wird

### 1. Tabelle nicht mehr komplett rendern
- Pro Tab nur eine Seite anzeigen (z. B. 50 Einträge) mit Blätter-Navigation und "Mehr laden".
- Zeilen in eine eigene, memoisierte Zeilen-Komponente auslagern, die nur neu rendert, wenn sich diese eine Bewerbung oder deren Auswahl-Status ändert.
- Tooltips/Popover pro Zeile nur noch dort rendern, wo sie wirklich gebraucht werden (Benachrichtigungs-Popover erst beim Öffnen).

### 2. Auswahl beschleunigen
- Auswahl-Status pro Zeile als einzelner Boolean an die Zeile geben statt das gesamte Set — dadurch rendert beim Klick nur die angeklickte Zeile neu.
- "Alle auswählen" bezieht sich weiterhin auf alle neuen Bewerbungen, arbeitet aber ohne kompletten Tabellen-Rerender.

### 3. Queue-Countdown entkoppeln
- Der Sekunden-Countdown läuft aktuell über den Seiten-State und rendert damit jede Sekunde die ganze Seite neu (deshalb "vergehen pro Sekunde mehrere Sekunden").
- Der Fortschrittsbalken wird eine eigenständige Komponente mit eigenem State; die Wartezeit wird über einen echten Zeitstempel berechnet, sodass die angegebenen Sekunden exakt eingehalten werden, auch wenn der Browser Timer verzögert.

### 4. Akzeptieren selbst beschleunigen
- Pro Bewerbung werden derzeit mehrere Einzelabfragen nacheinander ausgeführt (Branding-Domain, Branding-Name/SMS-Absender, SMS-Vorlage, Kurzlink, dann E-Mail und SMS).
- Branding-Daten und SMS-Vorlagen werden einmal pro Queue-Lauf geladen und wiederverwendet statt für jede Bewerbung erneut.
- Unabhängige Schritte (Kurzlink-Erzeugung, E-Mail, SMS) laufen parallel statt strikt hintereinander.
- Reihenfolge bleibt: erst Benachrichtigungen, dann Statuswechsel — schlägt der Versand fehl, bleibt der Status "neu".

### 5. Ladeaufwand reduzieren
- Die Abfrage lädt nur noch die Spalten, die die Tabelle und die Aktionen brauchen, statt `*` samt aller Verknüpfungen.

## Technische Details
- Datei: `src/pages/admin/AdminBewerbungen.tsx` (plus neue Unterkomponenten für Zeile und Queue-Fortschritt).
- Keine Datenbank-Änderungen, keine Änderung an Statuslogik, E-Mail-/SMS-Inhalten oder Templates.
- Zeilen-Komponente via `React.memo`, Callbacks über `useCallback`, Seitenzahl-State pro Tab.
- Countdown über `Date.now()`-Zieltermin statt 1-Sekunden-State-Schleife im Elternteil.
- Branding-/Template-Lookups als Map im Queue-Lauf gecacht.
