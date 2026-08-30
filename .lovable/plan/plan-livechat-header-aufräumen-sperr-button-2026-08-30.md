# Plan: Livechat-Header aufräumen + Sperr-Button

## Ziel
Im Header von `/admin/livechat` sollen SMS-Watch, das Code-Eingabefeld (Ident-Code senden) und der „+ Auftrag“-Button entfernt werden. Stattdessen kommt ein Button, mit dem das Benutzerkonto des Mitarbeiters gesperrt bzw. entsperrt werden kann.

## Änderungen in `src/pages/admin/AdminLivechat.tsx`

Entfernen aus dem Header:
- `SmsWatch`-Komponente
- Code-Input + Senden-Button (Ident-Code per SMS)
- „+ Auftrag“-Button

Der Glocken-Button (Livechat-Benachrichtigung per SMS) und der Admin-Avatar bleiben unverändert.

Neu:
- Button mit Schloss-Icon („Konto sperren“ / „Konto entsperren“), sichtbar sobald ein Chat ausgewählt ist.
- Der aktuelle Sperrstatus wird beim Laden des Vertrags mitgeladen (`is_suspended`).
- Klick öffnet einen Bestätigungsdialog; bei Bestätigung wird `employment_contracts.is_suspended` umgeschaltet und eine Toast-Meldung angezeigt.
- Gesperrter Zustand wird im Button visuell hervorgehoben (rot bei gesperrt).

## Technische Details
- Vertragsabfrage im `useEffect` um `is_suspended` erweitern.
- Update via `supabase.from("employment_contracts").update({ is_suspended }).eq("id", active.contract_id)` — dieselbe Logik wie in `AdminMitarbeiter.tsx`.
- Nicht mehr benötigte States/Handler (`quickSmsCode`, `quickSmsSending`, `handleQuickSms`, Order-Dialog-Trigger im Header) werden bereinigt; der Auftrags-Dialog selbst wird entfernt, da er nur über den Header erreichbar war.
