# Neue Datei: `webid_skript_universal_v14.sh`

- v13 als Grundlage verwenden.
- `certbot --nginx` vollständig entfernen.
- `/var/www/certbot` als ACME-Webroot anlegen.
- Port 80 erhält `/.well-known/acme-challenge/`; alle anderen Aufrufe gehen auf HTTPS.
- Zertifikat mit `certbot certonly --webroot -w /var/www/certbot` beziehen.
- Renewal-Konfiguration dauerhaft auf Webroot setzen und Nginx per Deploy-Hook neu laden.
- Lua-, Redirect-, Subfilter-, Popup-, Logo- und Client-JS-Blöcke ansonsten unverändert lassen.
- Datei mit `bash -n` prüfen und als herunterladbare v14 bereitstellen.
