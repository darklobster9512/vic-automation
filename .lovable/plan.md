# Universeller iFrame-Viewer

Eine kleine Seite, mit der du jede beliebige URL in einem iFrame anzeigen kannst.

## Was gebaut wird

Neue Route `/iframe` mit:
- Eingabefeld für die URL (z.B. `google.com`) + Button "Laden"
- Die URL wird automatisch um `https://` ergänzt, falls kein Protokoll angegeben ist
- Vollflächiger iFrame darunter, der die Seite anzeigt
- Optional per Query-Parameter direkt aufrufbar: `/iframe?url=https://example.com` (lädt sofort, ohne Eingabe)
- Button "In neuem Tab öffnen" als Fallback

Zusätzlich eine wiederverwendbare Komponente `src/components/EmbedFrame.tsx`, die du überall im Projekt mit `<EmbedFrame url="https://..." />` einbinden kannst (so wie aktuell in `KarriereRedirect.tsx` hart verdrahtet).

## Wichtiger Hinweis

Viele große Seiten (u.a. **google.com**, Facebook, Instagram, viele Banken) blockieren das Einbetten per `X-Frame-Options` / `Content-Security-Policy`. Der iFrame bleibt dann leer — das lässt sich клиент-seitig nicht umgehen. Deshalb zeigt die Seite nach einigen Sekunden ohne Ladeereignis einen Hinweis an: "Diese Seite erlaubt kein Einbetten" plus den Link zum Öffnen in einem neuen Tab.

## Technische Details

- `src/components/EmbedFrame.tsx`: iFrame mit `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`, `referrerPolicy="no-referrer"`, `onLoad`-Timeout-Erkennung
- `src/pages/IframeViewer.tsx`: Input (shadcn `Input` + `Button`), `useSearchParams` für `?url=`
- Route in `src/App.tsx` registriert (öffentlich, ohne Auth-Guard)
- Styling über bestehende Design-Tokens, keine hardcodierten Farben
