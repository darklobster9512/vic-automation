## Sammel-SMS bei Mehrfach-Zuweisung

Aktuell wird in `AssignmentDialog.tsx` pro neu zugewiesenem Mitarbeiter eine SMS mit dem Template `auftrag_zugewiesen` (`{name}`, `{auftrag}`) verschickt. Das passt bei Einzel-Zuweisung, ist aber teuer wenn mehrere Aufträge auf einmal an einen Mitarbeiter gehen.

### Anpassung

Die SMS-Logik bleibt pro Mitarbeiter, aber pro Speichervorgang wird pro Mitarbeiter nur **eine** SMS gesendet — egal wie viele Aufträge in diesem Save neu zugewiesen wurden.

- Bei **1 neuem Auftrag** für einen Mitarbeiter → weiterhin Template `auftrag_zugewiesen` (unverändert).
- Bei **≥ 2 neuen Aufträgen** für denselben Mitarbeiter → neues Template `auftraege_zugewiesen_sammel` mit Platzhaltern `{name}` und `{anzahl}`.

Da `AssignmentDialog` im Modus `"order"` immer nur einen Auftrag pro Save betrifft (`sourceId` = eine Order, mehrere Contracts), greift der Sammel-Fall nur, wenn wir künftig auch im Modus `"contract"` (mehrere Orders auf einen Mitarbeiter) SMS versenden. Deshalb wird zusätzlich der Modus `"contract"` mit SMS-Versand ergänzt, damit die Ersparnis dort greift, wo sie entsteht.

### SMS-Text (Vorschlag)

Template `auftraege_zugewiesen_sammel`:

```
Hallo {name}, es sind {anzahl} neue Auftraege fuer Sie verfuegbar. Jetzt im Mitarbeiterportal ansehen.
```

Einzel-Template `auftrag_zugewiesen` bleibt wie es ist.

### Umsetzung

1. **DB**: neues `sms_templates`-Row `auftraege_zugewiesen_sammel` mit obigem Text einfügen.
2. **`src/components/admin/AssignmentDialog.tsx`**:
   - Im `saveMutation` beim Modus `"contract"` (mehrere neue Orders auf einen Mitarbeiter) SMS-Versand ergänzen — analog zum bestehenden `"order"`-Block, aber gruppiert:
     - Wenn `newlyAdded.length === 1` → Template `auftrag_zugewiesen`.
     - Wenn `newlyAdded.length >= 2` → Template `auftraege_zugewiesen_sammel`, `{anzahl}` = `newlyAdded.length`.
   - Im Modus `"order"` bleibt es bei 1 SMS pro neu zugewiesenem Mitarbeiter (Sammel greift hier nicht, da pro Save nur ein Auftrag betroffen ist).
3. Kein UI-Change nötig.

Bestätigst du den SMS-Text oder soll ich ihn anders formulieren (z. B. duzen, Link ins Portal einbauen)?
