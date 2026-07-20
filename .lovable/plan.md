## Problem
`handleApproveAllSilent` läuft strikt sequentiell und macht pro Bewertung 5–7 Supabase-Calls (`orders`, `order_attachments`, `order_assignments update`, `employment_contracts select/update`, `resolveContractBranding`, `brandings`). Bei vielen Einträgen dauert das Minuten ohne sichtbares Feedback — es sieht so aus, als würde „nichts passieren". Zusätzlich werden Fehler mit `try/catch` stillschweigend geschluckt (`console.error` + `continue`) und der End-Toast meldet trotzdem Erfolg. Falls RLS ein `update` blockt, gibt es keinen `error`, nur 0 betroffene Zeilen — das wird aktuell nicht erkannt.

## Fix in `src/pages/admin/AdminBewertungen.tsx`

1. **Progress-Feedback** — Sonner `toast.loading(id: "bulk-approve", …)` beim Start, während der Verarbeitung per `toast.loading` mit `id` neu aufrufen (`x / n bearbeitet`), am Ende `toast.success`/`toast.error` mit derselben `id` → sichtbare Live-Anzeige statt „hängt".

2. **Parallelisierung mit Concurrency-Limit** — Statt `for`-Loop einen einfachen Pool mit 8 gleichzeitigen Workern (`Promise.all` über Chunks). Reduziert Laufzeit ~8×.

3. **Silent-Failure erkennen** — Auf `order_assignments.update(...).select("id")` erweitern. Wenn `data?.length === 0`, als Fehler zählen (RLS/nicht gefunden). Bei `error` ebenfalls Fehler zählen — nicht mehr stumm `continue`.

4. **Zähler im End-Toast**
   - `ok` (erfolgreich → Prämie gutgeschrieben)
   - `partial` (in_pruefung wegen offener Anhänge)
   - `failed` (Fehler oder 0 Rows)
   Fehleranzahl wird explizit angezeigt, damit klar ist, wenn nicht alles durchging.

5. **Optimierung `resolveContractBranding`** — pro Iteration einmal cachen bzw. Batch außerhalb der Schleife via `resolveContractBrandingBatch` aufrufen; ebenso Brandings-`payment_model` einmal per `in()` laden. Spart pro Row 2 Roundtrips.

6. **Console-Log pro Fehler** mit `order_id`/`contract_id`, damit Debugging bei erneutem Fehlschlag möglich ist.

Keine Änderungen an SMS-Logik (bleibt weiterhin komplett ausgelassen), keine DB/RLS-Änderungen, keine Änderungen am Einzel-`handleApprove`.

## Technische Details

```text
Start-Toast (id="bulk-approve", loading)
  ├─ Prefetch: brandingMap (batch), paymentModelMap (batch)
  ├─ Chunks à 8 parallel:
  │    ├─ orders.required_attachments
  │    ├─ order_attachments (nur wenn required)
  │    ├─ order_assignments.update(...).select("id")   ← Silent-Fail-Check
  │    └─ falls erfolgreich + per_order + reward>0:
  │        └─ employment_contracts.update balance
  ├─ toast.loading update pro Chunk
  └─ toast.success/error final mit ok/partial/failed
```