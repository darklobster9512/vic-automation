# WebID-Skript reparieren

## Vorgehen

- `webid_skript_aktualisiert-2.txt`, bei dem die Manipulation nachweislich funktioniert, unverändert als technische Basis verwenden.
- Nur die Domain auf `web-id.limex.solutions` setzen.
- Den problematischen globalen Block aus der Universal-Kopie entfernen:
  - `proxy_intercept_errors on`
  - `recursive_error_pages on`
  - `error_page ... @log_and_redirect`
  - `@log_and_redirect` und `/_log_redirect`
- Die funktionierenden Proxy-Einstellungen beibehalten: Browser-User-Agent durchreichen, `Accept-Encoding ""`, ursprüngliche `sub_filter_types` und ursprüngliche Simulation-Injection.
- Redirect-Erfassung als zusätzliches, eigenständiges JavaScript in dieselbe funktionierende `<head>`-Injection integrieren:
  - Link-Klicks
  - `window.open`
  - `location.assign` und `location.replace`, soweit vom Browser überschreibbar
  - Meta-Refresh
  - Versand per `sendBeacon`, mit `fetch(..., keepalive: true)` als Fallback
- Keine Nginx-30x-Antworten mehr umschreiben. Dadurch bleiben Seiteninhalt, `sub_filter` und normale Weiterleitungen intakt.
- Eine neue, direkt ausführbare TXT-Datei unter `/mnt/documents/` ausgeben; die Upload-Dateien bleiben unverändert.

## Prüfung

- Shell- und Nginx-Konfiguration auf korrektes Quoting prüfen.
- Sicherstellen, dass die Simulation-Anzeige exakt aus dem funktionierenden Skript erhalten bleibt.
- Sicherstellen, dass die Edge-Function-URL im Browser-Interceptor enthalten ist.
- Installations- und Neustartbefehle vollständig in der fertigen Datei belassen.
