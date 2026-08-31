# Neue Datei: `webid_skript_universal_v14.sh` (Certbot bleibt, nur Methode ändern)

**SSL bleibt voll funktionsfähig. Certbot wird NICHT deinstalliert.** Es ändert sich nur die Art, wie Certbot das Zertifikat ausstellt und verlängert.

## Hintergrund

- Bisher: `certbot --nginx` -> Certbot liest/schreibt die Nginx-Datei selbst.
- Problem: Certbots eigener Parser versteht `header_filter_by_lua_block` nicht und ignoriert die ganze Datei. Deshalb die Warnung und das Risiko, dass Verlaengerung/SSL kaputt geht.
- Fix: `certbot certonly --webroot` -> Certbot parst Nginx **nie wieder**. Es legt nur eine Pruefdatei in `/var/www/certbot` ab, Nginx liefert sie aus. Fertig. SSL funktioniert wie bisher, nur robuster.

## Aenderungen in v14 (gegenueber v13)

1. Certbot-Paket bleibt installiert (`certbot python3-certbot-nginx` bleiben in der Paketliste).
2. Webroot-Verzeichnis anlegen: `mkdir -p /var/www/certbot`.
3. Port-80-Serverblock bekommt zusaetzlich:
   ```nginx
   location /.well-known/acme-challenge/ { root /var/www/certbot; }
   ```
   (bereits in der temporaeren Config und in der finalen Config).
4. Zertifikat holen mit:
   `certbot certonly --webroot -w /var/www/certbot -d web-id.limex.solutions --non-interactive --agree-tos -m admin@47-skys.de`
   (statt `certbot --nginx ...`).
5. Finale 443-Config nutzt weiterhin `/etc/letsencrypt/live/web-id.limex.solutions/` Zertifikate -> identisch zu jetzt.
6. Renewal absichern: `certbot renew --dry-run` am Ende ausfuehren (muss ohne nginxparser-Warnung durchlaufen); Deploy-Hook `systemctl reload nginx` in `/etc/letsencrypt/renewal-hooks/deploy/` hinterlegen.
7. Alles andere aus v13 bleibt 1:1 gleich: Lua-Headerfilter, OPRA4X-Umbiegen, Subfilter, Popup, Logo, Client-JS, Firewall.
8. Datei mit `bash -n` pruefen und als `webid_skript_universal_v14.sh` bereitstellen.
