In `src/pages/admin/AdminAnhaengeDetail.tsx` auf jeder Anhang-Card ein kleines Fullscreen-Icon (Lucide `Maximize2`) oben rechts über dem Bild einblenden. Klick öffnet einen Dialog mit dem Bild in Vollansicht (Sheet/Dialog, max-w screen, dunkler Hintergrund, Bild `object-contain`).

Umsetzung:
- Neuer lokaler State `fullscreenUrl: string | null`.
- Auf jeder Card (nur wenn `isImage(a.file_url)`) ein Button-Overlay mit `Maximize2`-Icon, absolut positioniert (top-2 right-2), halbtransparenter Hintergrund, `hover:bg-black/70`.
- Klick setzt `fullscreenUrl = a.file_url`.
- Neuer `<Dialog>` außerhalb der Grid-Map mit großem `DialogContent` (`max-w-[95vw] max-h-[95vh] p-0 bg-black/95`), zeigt `<img class="w-full h-full object-contain">`.
- Bestehendes Layout und Approve/Reject-Logik bleibt unverändert.

Betrifft nur diese eine Datei, rein UI.