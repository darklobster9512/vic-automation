# Datenwiederherstellung aus Telegram-Benachrichtigungen

## Wichtige Vorab-Information

Ein Telegram-Bot kann **keine alten Nachrichten** eines Chats nachträglich abrufen. Die Bot-Schnittstelle liefert nur Nachrichten, die neu eintreffen (und auch die nur wenige Stunden lang, solange sie nicht abgeholt wurden). Es gibt keinen Weg, über den Bot rückwirkend den kompletten Chatverlauf zu lesen – unabhängig davon, wie lange der Bot schon im Chat ist.

Der einzige zuverlässige Weg an den kompletten Verlauf: **Telegram Desktop → Chat öffnen → Menü (⋮) → „Chatverlauf exportieren" → oben das Format von HTML auf „JSON" umstellen → Haken bei Medien (Bilder, Videos etc.) rausnehmen → „Exportieren"**. Das erzeugt eine `result.json` mit allen Nachrichten auf einmal – kein 100er-Limit, kein manuelles Kopieren.

Falls in deinem Telegram-Client das JSON-Format nicht angeboten wird (ältere Versionen zeigen manchmal nur HTML), reicht auch der **HTML-Export** aus: das System kann beide Formate lesen. JSON ist aber bevorzugt, weil es zuverlässiger ist.

Diese Datei lädst du dann in einem neuen Bereich hoch, und das System liest daraus die Daten zurück.

## Was gebaut wird

Neuer Admin-Bereich **„Wiederherstellung"** (`/admin/wiederherstellung`), nur für Superadmins sichtbar, mit drei Schritten:

### 1. Hochladen
Feld zum Hochladen der Telegram-JSON-Datei (auch mehrere Dateien, z. B. mehrere Chats). Die Datei wird im Browser gelesen, es wird nichts dauerhaft gespeichert, bevor du zustimmst.

### 2. Auswerten und Vorschau
Jede Benachrichtigung wird anhand des bekannten Aufbaus (Titel-Zeile mit Emoji, danach Zeilen wie „Name: …", „E-Mail: …", „Telefon: …", „Termin: …", Firma am Ende) zerlegt. Erkannt werden:

- Bewerbungen (Name, E-Mail, Telefon, Adresse, Anstellungsart, Firma, Zeitpunkt)
- Bewerbungsgespräch-Termine (Datum, Uhrzeit, Slot, Person, Firma)
- Probetag- und 1.-Arbeitstag-Termine
- Arbeitsverträge (eingereicht/genehmigt, enthaltene Personendaten)
- Bewertungen, Ident-Sitzungen, SMS-/Chat-Ereignisse – soweit im Text vorhanden

Du siehst danach eine Tabelle pro Datentyp: wie viele Einträge erkannt wurden, welche Zeilen unvollständig sind und welche doppelt vorkommen (Doppelte werden über E-Mail bzw. Telefonnummer + Name zusammengeführt, spätere Meldungen ergänzen frühere).

Nicht zuordenbare Nachrichten landen in einer eigenen Liste „nicht erkannt", damit nichts still verloren geht.

### 3. Importieren
Erst nach deiner Bestätigung werden die Daten geschrieben – wahlweise pro Datentyp einzeln. Vorhandene Datensätze werden nicht überschrieben, sondern übersprungen oder ergänzt. Nach dem Import gibt es ein Protokoll (angelegt / übersprungen / fehlerhaft) zum Herunterladen.

## Grenzen, die du kennen musst

- Wiederhergestellt werden kann nur, was tatsächlich in den Benachrichtigungen stand. Sensible Felder, die nie per Telegram gemeldet wurden (Bankdaten, Sozialversicherungsnummer, Steuer-ID, Ausweisbilder), lassen sich nicht rekonstruieren.
- Login-Konten und Passwörter der Mitarbeiter lassen sich nicht wiederherstellen; Konten müssten neu angelegt werden (kann als zweiter Schritt automatisiert werden).
- Hochgeladene Dateien (Ausweise, Anhänge, Verträge) sind endgültig weg.
- Firmen-Zuordnung erfolgt über den Firmennamen aus der Fußzeile der Nachricht; passt kein Eintrag, wird der Datensatz zur manuellen Zuordnung markiert.

## Technische Umsetzung

- Neue Seite `src/pages/admin/AdminWiederherstellung.tsx` + Route in der Admin-Navigation (Zugriff nur `admin`).
- Parser `src/lib/telegramRestore.ts`: zerlegt Telegram-Export-JSON (`messages[].text` als String oder Text-Entity-Array), erkennt Ereignistyp am Titel und mappt die Feldzeilen – gespiegelt am Aufbau aus `src/lib/telegramMessage.ts` (Trennlinie `━`, `Label: Wert`, Firma mit 🏢).
- Import über eine neue Edge Function `restore-import` mit Service-Role: prüft Admin-JWT, nimmt die geparsten Datensätze als JSON entgegen, schreibt in Blöcken (max. 200 pro Anfrage) mit Duplikatprüfung auf `applications` (E-Mail/Telefon), `interview_appointments`, `trial_day_appointments`, `first_workday_appointments`, `employment_contracts`.
- Zeitstempel der Nachricht wird als `created_at` übernommen, damit die Historie stimmt.
- Optional zusätzlich: der Bot-Weg (`getUpdates`) als Live-Mitschnitt ab jetzt – bringt für die alten Daten aber nichts und wird daher nicht gebaut, sofern du es nicht ausdrücklich willst.
