# E-Mail-Warteschlange abschalten – alles direkt versenden

## Ziel
Keine Zwischenlagerung mehr: Jede E-Mail geht sofort raus, so wie es bei SMS heute schon läuft. Für die 94 Mails, die aktuell in der Warteschlange festhängen, wird der Direktversand nachträglich einmal manuell ausgelöst, damit sie noch heute ankommen.

## Was sich für dich ändert
- Beim „Störungs-Info senden" (und überall sonst) landet jede E-Mail direkt bei Resend – kein Umweg über die Warteschlange.
- Fehler siehst du sofort in der Erfolgsmeldung, statt sie in einer stummen Queue zu verlieren.
- Die 94 wartenden Störungs-Mails werden einmalig nachträglich rausgeschickt.

## Umsetzung
1. Im E-Mail-Versand (`sendEmail`) und im Störungs-Dialog wird der Direktmodus zum Standard – die Queue-Option wird nicht mehr genutzt.
2. Die Server-Funktion, die E-Mails annimmt, geht bei jedem Aufruf sofort in den Direktversand; der Queue-Zweig wird entfernt.
3. Für die 94 wartenden Einträge: ein einmaliger Aufruf, der pro Eintrag die Mail direkt an Resend schickt, den Eintrag als versendet markiert und ins E-Mail-Log schreibt.
4. Optional (empfohlen): Danach werden Warteschlangen-Tabelle und der (aktuell ohnehin nicht laufende) Warteschlangen-Prozessor stillgelegt, damit nichts mehr versehentlich in die Queue geschrieben wird.

## Technische Details
- `src/lib/sendEmail.ts`: setzt intern immer `bypass_queue: true`.
- `supabase/functions/send-email/index.ts`: nur noch der Direktpfad, kein `enqueue_email` mehr; `bypass_queue`-Flag wird ignoriert (immer direkt).
- `src/components/admin/DomainAnnouncementDialog.tsx`: keine Änderung nötig, da `sendEmail` bereits direkt sendet; ggf. explizite `bypass_queue: true` Übergabe entfernen.
- Nachversand der 94 offenen Einträge: neue Edge-Function `flush-email-queue` (einmalig ausgeführt), die alle `pending`/`sending` Rows aus `email_queue` liest, pro Row `send-email` (Direktmodus) aufruft und danach `status='sent'` setzt. Wird nach Deploy einmal per Tool aufgerufen und danach nicht mehr benötigt.
- Aufräumen (optional, im selben Schritt): `process-email-queue` löschen; `enqueue_email`-RPC und `email_queue`-Tabelle bleiben zunächst bestehen, werden aber nicht mehr beschrieben (kein Datenverlust, keine Migration-Risiken für andere Stellen).
