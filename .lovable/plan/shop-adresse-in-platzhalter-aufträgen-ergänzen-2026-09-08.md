# Shop-Adresse in Platzhalter-Aufträgen ergänzen

## Ausgangslage
- Es gibt 1.107 Platzhalter-Aufträge über alle Brandings hinweg, verteilt auf 123 verschiedene Shop-Titel (z. B. "Bewertung / Analyse Onlineshop Seeberger").
- In keiner der Beschreibungen steht aktuell eine Web-Adresse (0 von 1.107 enthalten einen Link).

## Was gemacht wird
1. Für jeden der 123 Shop-Namen wird die offizielle Shop-Adresse ermittelt (z. B. Seeberger → https://www.seeberger.de). Grundlage ist der Shop-Name im Titel; unklare Namen werden per Websuche geprüft.
2. Die Adresse wird ans Ende der bestehenden Beschreibung angehängt, in einer eigenen Zeile im gleichen Stil wie der übrige Text:

```text
Zu prüfender Onlineshop: https://www.seeberger.de
```

3. Der bestehende Beschreibungstext bleibt unverändert – es wird nur ergänzt.
4. Die Ergänzung greift für alle Platzhalter-Aufträge aller Brandings; Aufträge, die schon eine Adresse enthalten, werden übersprungen (doppelte Einträge ausgeschlossen).
5. Vor der Aktualisierung bekommst du die vollständige Zuordnungsliste (Shop-Name → Adresse) zur Kontrolle, damit falsche Treffer vorher korrigiert werden können.

## Hinweise
- Es werden keine Benachrichtigungen (E-Mail, SMS, Telegram) ausgelöst – es ist eine reine Textaktualisierung.
- Namen, bei denen sich die Adresse nicht sicher bestimmen lässt (z. B. "Brand", "L-T", "Glamour"), werden in der Liste als unklar markiert und erst nach deiner Rückmeldung ergänzt.

## Technisch
- Reine Datenänderung per `UPDATE` auf `public.orders` (`is_placeholder = true`), gruppiert nach Titel; kein Schema-Eingriff, keine Code-Änderung.
- Absicherung über `description NOT ILIKE '%http%'`, damit ein erneuter Lauf nichts doppelt anhängt.
