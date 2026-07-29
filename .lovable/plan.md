## Ziel

Starterjobs im Mitarbeiter-Panel klar kennzeichnen und über den Auftragskarten einen Hinweis anzeigen, der sich je nach Fortschritt ändert.

## 1. Starterjob-Badge

Ein kleines wiederverwendbares Badge (`src/components/mitarbeiter/StarterJobBadge.tsx`), Rocket-Icon + Text „Starterjob", im Branding-Primärton (semantische Tokens, abgerundet, wie die bestehenden Badges).

Eingebaut an drei Stellen, jeweils wenn `orders.is_starter_job === true`:
- `/mitarbeiter` (MitarbeiterDashboard) – in der Auftragskarte neben Auftragsnummer/Status
- `/mitarbeiter/auftraege` (MitarbeiterAuftraege) – gleiche Position in der Karte
- `/mitarbeiter/auftragdetails/:id` (AuftragDetails) – oben im Kopfbereich neben dem Titel/über der Beschreibung

Dafür wird `is_starter_job` in den bestehenden `orders`-Selects mitgeladen (Dashboard nutzt bereits `select("*")`; in `MitarbeiterAuftraege` und `AuftragDetails` wird das Feld ergänzt).

## 2. Starterjob-Hinweis auf /mitarbeiter

Neue Komponente `src/components/mitarbeiter/StarterJobNotice.tsx`, platziert direkt über dem Auftragskarten-Bereich im Dashboard. Sie wird nur angezeigt, wenn dem Mitarbeiter Starterjobs zugewiesen sind, und durchläuft 5 Phasen:

**Phase 1 – Starterjobs offen** (nicht für alle Starterjobs eine Bewertung abgeschickt):
> **Starterjobs**
> Erledige beide Starterjobs bitte innerhalb der nächsten 48 Stunden, damit wir deine Arbeitsweise und Fähigkeiten kurz einschätzen können. Die Bearbeitung dauert insgesamt ca. 25–35 Minuten.
> Nach Abschluss und Prüfung erhältst du von uns per E-Mail oder telefonisch eine Rückmeldung zu den nächsten Schritten.
> Bitte stelle sicher, dass wir dich sowohl per E-Mail als auch telefonisch erreichen können.

**Phase 2 – Bewertungen abgeschickt, noch nicht genehmigt:**
> **Starterjobs in Prüfung**
> Vielen Dank – deine Bewertungen zu den Starterjobs sind bei uns eingegangen. Unser Team prüft deine Ergebnisse jetzt sorgfältig und meldet sich in Kürze bei dir. Bitte halte dich per E-Mail und Telefon erreichbar.

**Phase 3 – beide Starterjob-Zuweisungen „erfolgreich", Vertragsdaten noch nicht abgeschickt:**
> **Starterjobs bestanden – jetzt Vertragsdaten ausfüllen**
> Herzlichen Glückwunsch, deine Starterjobs wurden erfolgreich geprüft. Als nächsten Schritt fülle bitte deine Arbeitsvertragsdaten aus, damit wir deinen Arbeitsvertrag erstellen können.
> Button „Vertragsdaten ausfüllen" → `/mitarbeiter/arbeitsvertrag`

**Phase 4 – Vertragsdaten abgeschickt, noch nicht genehmigt:**
> **Arbeitsvertrag in Prüfung**
> Deine Vertragsdaten sind eingegangen und werden aktuell von uns geprüft. Sobald alles bestätigt ist, informieren wir dich per E-Mail.

**Phase 5 – Arbeitsvertrag genehmigt:** Hinweis wird komplett ausgeblendet.

Farbliche Abstufung: Phase 1/3 mit Handlungsbedarf (Amber bzw. Primär), Phase 2/4 neutral-blau, jeweils im bestehenden Card-Stil (`rounded-2xl`, linker Akzentbalken, shadow-md).

## Technische Details

- Datenquellen (alle bereits im Dashboard geladen bzw. minimal ergänzt):
  - Starterjobs: `order_assignments` × `orders.is_starter_job = true`
  - Bewertung abgeschickt: Existenz von `order_reviews` für Contract + Starterjob-Order
  - Genehmigt: `order_assignments.status === 'erfolgreich'` für alle Starterjobs
  - Vertragsstatus: bereits vorhandene States `contractSubmittedAt` / `contractStatus`
- Die bestehende Karte „Arbeitsvertragsdaten ausfüllen" wird unterdrückt, solange der Starterjob-Hinweis in Phase 1/2 aktiv ist, damit keine widersprüchlichen Hinweise gleichzeitig erscheinen.
- Keine DB-Änderungen nötig; rein Frontend.
