# Brandings ins Panel einfügen

## Ziel
Neun neue Brandings in der `brandings`-Tabelle anlegen, damit sie im Admin-Panel erscheinen und dort weiter konfiguriert werden können:

1. Codebricks GmbH
2. Efficient Flow Solutions GmbH
3. for.tel Solutions GmbH
4. LIMEX Solutions GmbH
5. PointView GmbH
6. Softex Unternehmensberatung & Software GmbH
7. Topscale GmbH
8. Vendis Development Services GmbH
9. Völler IT Solutions GmbH

## Vorgehen
1. **Migration**: `INSERT INTO public.brandings (...)` mit je einem Datensatz pro Unternehmen.
2. **Befüllte Felder** (Minimal-Satz, damit die Brandings funktionsfähig sind):
   - `company_name` – wie oben
   - `subdomain_prefix` – aus dem Namen abgeleitet, z. B. `codebricks`, `efficientflow`, `fortel`, `limex`, `pointview`, `softex`, `vendis`, `voellerit`
   - `domain` – Platzhalter ableitbar, z. B. `codebricks.de` etc. (später im Panel korrigierbar)
   - Pflicht-Felder mit Defaults belegen: `payment_model` (`'fixed'`), `chat_online` (`false`), `chat_online_from`/`chat_online_until`, `subdomain_prefix`, `additional_domains` (`{}`), `blacklist_block_public_booking` (`false`), `meta_pixel_enabled` (`false`), `sms_ident_disabled` (`false`), `email_logo_enabled` (`false`), `custom_email_link_enabled` (`false`), `hourly_rate_enabled` (`false`), `email` als Platzhalter
3. **Keine weiteren Daten**: Zeitpläne, SMS-/Resend-Konfiguration, Aufträge, Vertragsvorlagen etc. bleiben leer und werden im Panel gepflegt (außer du gibst mir die Werte direkt mit).
4. Danach kurze Verifikation per Read-Query, dass alle 9 Brandings existieren.

## Hinweis
Die Brandings enthalten zunächst nur Grunddaten. Adressen, Geschäftsführer, HRB, SMS-/E-Mail-Konfiguration, Logos usw. trägst du im Panel nach — oder gib sie mir, dann fülle ich sie direkt.
