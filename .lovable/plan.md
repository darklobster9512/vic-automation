# bbm-consult.de zeigt die falsche Seite

## Ursache
Dein Block hat nur `listen 80;`, gilt also nur für **http**. Wer **https://bbm-consult.de** aufruft (Browser und der Rahmen auf /karriere tun das), landet auf Port 443. Dafür gibt es keinen Block mit `server_name bbm-consult.de`. nginx nimmt dann den ersten oder Standard-443-Block, und der zeigt auf ein anderes Projekt. Dessen Vite-Prozess sperrt die Domain, daher kommt "Blocked request".

Prüfen kannst du das mit: `curl -I http://bbm-consult.de` (richtige App) und `curl -I https://bbm-consult.de` (falsche App).

## Lösung
1. Zertifikat holen und den 443-Block automatisch anlegen lassen:
   `sudo certbot --nginx -d bbm-consult.de -d www.bbm-consult.de`
   Oder den Block selbst ergänzen:
   ```text
   server {
       listen 443 ssl;
       server_name bbm-consult.de www.bbm-consult.de;
       ssl_certificate     /etc/letsencrypt/live/bbm-consult.de/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/bbm-consult.de/privkey.pem;
       location / {
           proxy_pass http://127.0.0.1:8081;
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```
2. `sudo nginx -t && sudo systemctl reload nginx`
3. Nebenbei: `proxy_pass` besser auf `127.0.0.1:8081` statt auf die öffentliche IP, dann muss Port 8081 nicht offen sein.

## Achtung bei /karriere
Wenn auf bbm-consult.de dieses Portal läuft, zeigt /karriere im Rahmen `bbm-consult.de/karriere/...`, also sich selbst. Das ergibt eine Endlosschleife. Der Rahmen sollte auf die Domain zeigen, auf der die "BBN Consulting Website" läuft. Sag mir, welche Domain das ist, dann ändere ich den Rahmen.

## In dieser App
Für das https-Problem ist keine Codeänderung nötig.
