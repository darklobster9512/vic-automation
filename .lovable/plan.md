# Livechat-Avatar je Branding getrennt speichern

## Ursache
Der Avatar-Upload speichert jedes Bild immer unter derselben Datei (`<Admin-ID>/avatar.png`) und überschreibt sie. Alle Brandings, deren Chat-Avatar auf diese Datei zeigt, bekommen dadurch das neue Bild. Zusätzlich wird dabei das persönliche Profilbild des Admins geändert.

## Änderung
- Auf /admin/livechat-einstellungen wird das Bild künftig als eigene Datei pro Branding gespeichert (eindeutiger Name mit Branding-ID und Zeitstempel). Ein Upload ändert nur das aktuell gewählte Branding (nach "Speichern").
- Das persönliche Profilbild des Admins wird dabei nicht mehr verändert.
- Andere Stellen, die das Upload-Feld nutzen, bleiben unverändert.

## Hinweis zu bestehenden Daten
Brandings, die schon jetzt auf die gemeinsame Datei zeigen, zeigen weiterhin dasselbe Bild, bis für sie einmal ein neues Bild hochgeladen und gespeichert wird.

## Technische Details
- `src/components/chat/AvatarUpload.tsx`: neue optionale Props `storagePath?: () => string` und `updateProfile?: boolean` (Default true). Wenn `storagePath` gesetzt, wird dieser Pfad genutzt; `profiles`-Update nur bei `updateProfile`.
- `src/pages/admin/AdminLivechatEinstellungen.tsx`: `storagePath={() => \`${user.id}/branding-${activeBrandingId}-${Date.now()}.png\`}` (bleibt im Nutzerordner wegen Storage-Policies), `updateProfile={false}`.
