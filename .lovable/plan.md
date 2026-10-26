# Fix: bbm-consult.de soll auf Port 8081 zeigen

Für https antwortet ein zweiter nginx-Block, der bbm-consult.de auf Port 8080 weiterleitet. Diesen Block musst du entfernen.

## 1. Den falschen Block finden
```text
sudo grep -rn "bbm-consult" /etc/nginx/
```
Hier erscheint eine zweite Datei (oder ein zweiter Block) mit `server_name bbm-consult.de` und `proxy_pass ...:8080`. Aus diesem Block entfernst du `bbm-consult.de www.bbm-consult.de`, oder du löschst den ganzen Block.

## 2. Deine Datei komplett ersetzen
Datei: `/etc/nginx/sites-available/bbm-consult.de`
```text
server {
    listen 80;
    server_name bbm-consult.de www.bbm-consult.de;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name bbm-consult.de www.bbm-consult.de;

    ssl_certificate     /etc/letsencrypt/live/bbm-consult.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bbm-consult.de/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 3. Aktivieren und neu laden
```text
sudo ln -sf /etc/nginx/sites-available/bbm-consult.de /etc/nginx/sites-enabled/bbm-consult.de
sudo nginx -t && sudo systemctl reload nginx
```

## 4. Prüfen
```text
sudo nginx -T | grep -n "server_name.*bbm-consult"
```
Hier darf die Domain nur noch in deiner Datei stehen, also in genau zwei Zeilen (Port 80 und 443). Danach muss https://bbm-consult.de im Titel "Mitarbeiter Dashboard" zeigen.

## Folge für /karriere
Wenn das Portal auf bbm-consult.de läuft, lädt /karriere sich selbst. Sag mir die neue Domain der Website, dann stelle ich den Rahmen darauf um.
