## Ziel

Alle Telegram-Meldungen bekommen ein einheitliches, schöneres Layout (HTML) und deutlich mehr Inhalt — voller Name, Kontaktdaten, Sterne-Bewertung, Chat-Absender, Branding. **Kein Zeitstempel** (Telegram zeigt die Uhrzeit ohnehin selbst an).

## Preview: so sehen alle Notifications danach aus

**1. Neue Bewerbung** (`bewerbung_eingegangen`)
```text
📝 Neue Bewerbung
━━━━━━━━━━━━━━━━━
👤 Name: Ulrike Hea
✉️ E-Mail: ulrike.hea@web.de
📱 Telefon: +49 176 12345678
💼 Art: Teilzeit
📍 Ort: 44135 Dortmund
🔗 Quelle: Instagram/Facebook
🏢 for.tel
```

**2. Bewerbungsgespräch gebucht** (`gespraech_gebucht`)
```text
📅 Bewerbungsgespräch gebucht
━━━━━━━━━━━━━━━━━
👤 Name: Ulrike Hea
📱 Telefon: +49 176 12345678
🗓 Termin: Mittwoch, 05.08.2026
⏰ Uhrzeit: 14:30 Uhr
🏢 for.tel
```

**3. Probetag gebucht** (`probetag_gebucht`)
```text
🧪 Probetag gebucht
━━━━━━━━━━━━━━━━━
👤 Name: Ulrike Hea
📱 Telefon: +49 176 12345678
🗓 Termin: Donnerstag, 06.08.2026
⏰ Uhrzeit: 09:00 Uhr
🏢 for.tel
```

**4. Erster Arbeitstag gebucht** (`erster_arbeitstag_gebucht`)
```text
🚀 Erster Arbeitstag gebucht
━━━━━━━━━━━━━━━━━
👤 Name: Ulrike Hea
📱 Telefon: +49 176 12345678
🗓 Datum: Montag, 10.08.2026
⏰ Uhrzeit: 08:00 Uhr
🏢 for.tel
```

**5. Konto erstellt** (`konto_erstellt`)
```text
👤 Neuer Mitarbeiter registriert
━━━━━━━━━━━━━━━━━
👤 Name: Max Mustermann
✉️ E-Mail: max.mustermann@gmail.com
📱 Telefon: +49 151 22334455
🏢 for.tel
```

**6. Arbeitsvertrag eingereicht** (`vertrag_eingereicht`)
```text
📋 Arbeitsvertrag eingereicht
━━━━━━━━━━━━━━━━━
👤 Name: Max Mustermann
✉️ E-Mail: max.mustermann@gmail.com
📱 Telefon: +49 151 22334455
💼 Art: Minijob
🗓 Wunschstart: 01.09.2026
📎 Dokumente: Ausweis (Vorder-/Rückseite), Meldebescheinigung
🏢 for.tel
```

**7. Vertrag unterzeichnet** (`vertrag_unterzeichnet`)
```text
✍️ Vertrag unterzeichnet
━━━━━━━━━━━━━━━━━
👤 Name: Max Mustermann
✉️ E-Mail: max.mustermann@gmail.com
💼 Art: Minijob
🏢 for.tel
```

**8. Bewertung eingereicht** (`bewertung_eingereicht`)
```text
⭐ Bewertung eingereicht
━━━━━━━━━━━━━━━━━
👤 Mitarbeiter: Max Mustermann
📦 Auftrag: App-Test Onlinebanking
🌟 Bewertung: ★★★★☆ 4,0 / 5 (3 Fragen)
💬 „Der Ablauf war klar verständlich, nur das Laden…“
🏢 for.tel
```

**9. Anhänge eingereicht** (`anhaenge_eingereicht`)
```text
📎 Anhänge eingereicht
━━━━━━━━━━━━━━━━━
👤 Mitarbeiter: Max Mustermann
📦 Auftrag: App-Test Onlinebanking
🗂 Dateien: 3 hochgeladen
🏢 for.tel
```

**10. Ident gestartet** (`ident_gestartet`)
```text
🎥 Ident gestartet
━━━━━━━━━━━━━━━━━
👤 Mitarbeiter: Max Mustermann
📦 Auftrag: Video-Ident Neobank
🏢 for.tel
```

**11. Email TAN angefordert** (`email_tan_angefordert`)
```text
📧 Email TAN angefordert
━━━━━━━━━━━━━━━━━
👤 Mitarbeiter: Max Mustermann
📦 Auftrag: Video-Ident Neobank
⚠️ Wartet auf TAN-Eingabe
🏢 for.tel
```

**12. Chat-Nachricht** (`chat_nachricht`) — hier fehlte bisher der Name komplett
```text
💬 Neue Chat-Nachricht
━━━━━━━━━━━━━━━━━
👤 Von: Melanie Wolf-Busch
📱 Telefon: +49 160 99887766
💬 „Hallo, ich habe eine Frage zum Auftrag…“
🏢 for.tel
```
(mit Anhang zusätzlich: `📎 Anhang: bild.jpg`)

**13. Auftragstermin gebucht** (`auftragstermin_gebucht`) — Event existiert in den Einstellungen, wird aktuell nirgends ausgelöst. Ich hänge es an die Terminbuchung in `order_appointments` an:
```text
📆 Auftragstermin gebucht
━━━━━━━━━━━━━━━━━
👤 Mitarbeiter: Max Mustermann
📦 Auftrag: Video-Ident Neobank
🗓 Termin: Dienstag, 04.08.2026 · 11:00 Uhr
🏢 for.tel
```

**14. Testnachricht** (`_test`)
```text
🔔 Testnachricht
━━━━━━━━━━━━━━━━━
✅ Diese Telegram-Verbindung funktioniert.
```

## Technische Umsetzung

1. Neuer Helper `src/lib/telegramMessage.ts`: `buildTelegramMessage({ icon, title, fields, brandingName })` — rendert Titel fett, Trennlinie, Felder (leere Werte werden automatisch weggelassen), optional Branding-Zeile als Footer, escaped HTML-Sonderzeichen; dazu `renderStars(avg)` und `formatDateLong(date)`. Kein Zeitstempel.
2. Aufrufstellen umstellen: `AdminBewerbungen.tsx`, `Bewerbungsgespraech.tsx`, `Probetag.tsx`, `ErsterArbeitstag.tsx`, `Auth.tsx`, `Arbeitsvertrag.tsx`, `MitarbeiterArbeitsvertrag.tsx`, `mitarbeiter/Bewertung.tsx`, `mitarbeiter/AuftragDetails.tsx`.
3. `useChatRealtime.ts` bekommt optional `senderName` / `senderPhone` / `brandingId`; `ChatWidget.tsx` übergibt die Vertragsdaten, damit der Chat-Alarm den Namen zeigt und im richtigen Branding-Kanal landet.
4. Edge Functions `submit-application` und `sign-contract` erhalten eine kleine lokale Kopie des Formatters (kein `src/`-Import möglich) und laden die fehlenden Felder (Telefon, Beschäftigungsart, Branding-Name) nach.
5. `send-telegram/index.ts`: Retry ohne `parse_mode`, falls Telegram „can't parse entities“ meldet — schützt vor Ausfällen durch Sonderzeichen.

## Hinweis

Bei einigen Events fehlt bisher die `branding_id` (Chat, Vertrag eingereicht, Bewertung) — dadurch gehen sie an alle Telegram-Chats. Ich ergänze sie, damit die Meldungen sauber pro Kunde routen.
