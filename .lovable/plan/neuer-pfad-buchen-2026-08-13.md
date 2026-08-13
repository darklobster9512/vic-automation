# Neuer Pfad `/buchen`

## Ziel
Die öffentliche Buchungsseite soll zusätzlich unter `/buchen` erreichbar sein und exakt denselben Inhalt wie `/bewerbungsgespraech/buchen` anzeigen.

## Änderung
In `src/App.tsx` eine weitere Route innerhalb des öffentlichen `Routes`-Blocks hinzufügen:

```text
<Route path="/buchen" element={<BewerbungsgespraechPublic />} />
```

Diese zeigt dieselbe Komponente `BewerbungsgespraechPublic` an wie `/bewerbungsgespraech/buchen`. Die Komponente arbeitet domainbasiert (`window.location.hostname`) und verwendet keine Pfadparameter, daher ist keine Wrapper-Komponente oder Weiterleitung nötig.

## Nicht im Scope
- Keine visuellen oder inhaltlichen Änderungen an der Buchungsseite selbst.
- Keine Änderungen an Navigationen, Shortlinks oder anderen Routen.

## Validierung
- Build prüfen, dass `App.tsx` fehlerfrei kompiliert.
- Kurzer Aufruf von `/buchen` im Preview, um sicherzustellen, dass die Seite lädt und das Branding korrekt aufgelöst wird.
