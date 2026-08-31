# Certbot in v15 exakt wie v12 begrenzen

## Änderung
- `certbot renew --dry-run` am Ende von v15 vollständig entfernen. Dieser globale Befehl verarbeitet alle bereits auf dem Server bekannten Zertifikate und Domains.
- Den vorhandenen v12-Certbot-Aufruf unverändert beibehalten:
  ```bash
  certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect --keep-until-expiring
  ```
  Dadurch wird ausschließlich die im Skript gesetzte Domain bearbeitet.
- Keine weiteren Abschnitte ändern: Nginx, Redirect-Logging, Edge-Function-Übermittlung, OPRA4X-Umschreibung, Subfilter, Popup, Header, Logo, Firewall und bestehendes Cleanup bleiben unverändert.

## Prüfung
- Shell-Syntax der neuen Datei mit `bash -n` prüfen.
- Kontrollieren, dass nur noch genau ein Certbot-Befehl enthalten ist und dieser `-d $DOMAIN` nutzt.
- Kontrollieren, dass kein globales `certbot renew` mehr enthalten ist.
