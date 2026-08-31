# v11-Skript: PuTTY-Absturz beim Ausführen beheben

## Wahrscheinliche Ursachen (typisch für genau dieses Symptom)

1. **`apt upgrade -y` startet mitten im Lauf `openssh-server` neu** — deine aktive SSH-Session wird gekillt, PuTTY zeigt „Verbindung geschlossen“. Sehr häufig auf Debian/Ubuntu-VPS.
2. **`set -e` + Fehler in einem Zwischenschritt** (z. B. `certbot` renew‑lock, `nginx -t` fail) → Skript bricht ab, aber weil es an dein TTY gebunden ist, wirkt es wie ein Crash.
3. **OOM auf kleinen VPS** beim gleichzeitigen Installieren von `nginx-extras` + `libnginx-mod-http-lua` + Certbot → Kernel killt Prozesse in deiner Session.
4. **`ufw enable`** ohne vorher explizit Port 22 freizugeben (nur `OpenSSH`-Profil) — auf manchen Systemen fehlt das Profil und SSH wird sofort geblockt.

## Fix — nichts an der Skript-Logik ändern, nur Ausführung absichern

Das v11-Skript inhaltlich lassen wie es ist (Lua-Header-Filter, Client-JS, Subfilter bleiben byte-identisch). Wir ändern nur **wie** es läuft, damit ein SSH-Reconnect es nicht killt und wir sehen, wo es hängt:

### 1. In `screen` oder `tmux` starten (Pflicht)

```bash
apt install -y screen
screen -S webid
sudo bash webid_skript_universal_v11.sh 2>&1 | tee /root/webid_v11.log
```

Wenn PuTTY jetzt trotzdem schließt: `screen -r webid` nach Reconnect — das Skript lief die ganze Zeit weiter. Log unter `/root/webid_v11.log` zeigt exakt die letzte Zeile vor dem Bruch.

### 2. Anpassungen im Skript (kleine, gezielte Änderungen)

- **`apt upgrade -y` entfernen.** Es ist für WebID nicht nötig, riskiert aber openssh-Restart. Nur `apt update` behalten.
- **Port 22 explizit vor `ufw enable`:** `ufw allow 22/tcp` zusätzlich zu `ufw allow OpenSSH`.
- **`DEBIAN_FRONTEND=noninteractive`** + `-o Dpkg::Options::="--force-confold"` vor den apt-Aufrufen, damit keine interaktiven Prompts oder Service-Restart-Fragen deine Session blockieren.
- **Logging von Anfang an:** direkt nach `set -e` einfügen:
  ```bash
  exec > >(tee -a /root/webid_v11.log) 2>&1
  set -x
  ```
  So sehen wir bei jedem Reconnect genau, in welcher Zeile abgebrochen wurde.
- **Swap sicherstellen** (nur wenn `free -m` < 1 GB RAM zeigt): 1 GB Swapfile anlegen, bevor Pakete installiert werden. Verhindert OOM-Kill.

### 3. Diagnose vor dem nächsten Versuch

Auf dem VPS einmal ausführen und Ergebnis schicken:

```bash
free -m
cat /var/log/apt/history.log | tail -40
journalctl -u ssh --since "1 hour ago" | tail -30
dmesg -T | tail -40
```

Damit sehen wir, ob (a) sshd wirklich neu startet, (b) OOM-Killer aktiv war, oder (c) apt einen anderen Dienst neu startet, der die Session mitreißt.

## Technisches — die geänderten Blöcke des v11-Skripts

Nur diese Zeilen ändern; alles andere bleibt identisch:

```bash
set -e
exec > >(tee -a /root/webid_v11.log) 2>&1
set -x

export DEBIAN_FRONTEND=noninteractive
APT_OPTS='-o Dpkg::Options::=--force-confold -o Dpkg::Options::=--force-confdef'

apt update
apt install -y $APT_OPTS curl gnupg2 ca-certificates lsb-release nginx-extras \
    libnginx-mod-http-lua lua-resty-http lua-cjson \
    certbot python3-certbot-nginx ufw screen

ufw allow 22/tcp
ufw allow 'Nginx Full'
ufw allow OpenSSH
echo "y" | ufw enable
```

Optionaler Swap-Block (nur ausführen, wenn `/swapfile` nicht existiert):

```bash
if [ ! -f /swapfile ] && [ "$(free -m | awk '/^Mem:/ {print $2}')" -lt 1024 ]; then
    fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
```

Ergebnis-Datei: `/mnt/documents/webid_skript_universal_v12.sh` (v11 unverändert + die vier Anpassungen oben).
