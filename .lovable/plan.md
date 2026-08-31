# WebID-Skript: screen-Chaos aufräumen und sauber durchlaufen lassen

## Was gerade passiert ist

Du hast **drei** hängende `screen`-Sessions (`40193.webid`, `40190.webid_v11`, `40186.webid`), alle mit Status **Attached** — d. h. sie glauben, sie gehören noch zu einer (inzwischen geschlossenen) PuTTY-Verbindung. `screen -r webid` schlägt fehl, weil der Name mehrdeutig ist und die Sessions noch "attached" wirken. Dein Skript läuft vermutlich in einer davon weiter (oder ist schon durch).

## Schritt 1: Alle alten Sessions killen

```bash
screen -ls
screen -X -S 40193.webid quit
screen -X -S 40190.webid_v11 quit
screen -X -S 40186.webid quit
screen -ls    # sollte jetzt "No Sockets found" zeigen
```

## Schritt 2: Prüfen, was das Skript bisher geschafft hat

```bash
cat /root/webid_v11.log 2>/dev/null | tail -50
systemctl status nginx --no-pager | head -15
nginx -t
```

Damit sehen wir, ob Nginx-Config, Zertifikat oder Paketinstallation schon teilweise gelaufen sind (Certbot ist idempotent, ein zweiter Lauf ist unkritisch).

## Schritt 3: Einmal sauber neu starten

```bash
screen -S webid          # nur EINE neue Session
bash /root/webid_v11.sh 2>&1 | tee /root/webid_v11.log
```

Wichtig: Innerhalb von screen läuft das Skript unabhängig von PuTTY. Wenn die Verbindung abreißt:

```bash
screen -d -r webid       # -d löst die tote Attach-Markierung, -r verbindet dich
```

**Der entscheidende Unterschied zu vorher:** `-d -r` statt nur `-r`. Das löst dein genaues Problem (Attached-Sessions lassen sich sonst nicht resumen).

## Schritt 4 (vor dem nächsten Lauf, im Skript)

Zwei Änderungen in `/root/webid_v11.sh` (per `nano` vor Schritt 3):

1. `apt update && apt upgrade -y` → nur `apt update` (das Upgrade startet openssh neu und killt PuTTY).
2. Vor `ufw enable`: zusätzlich `ufw allow 22/tcp`.

Ich liefere dir auf Wunsch die angepasste Datei als `/mnt/documents/webid_skript_universal_v12.sh`, die du per nano 1:1 übernehmen kannst.
