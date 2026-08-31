# PuTTY-Absturz beim Copy-Paste des v11-Skripts beheben

## Ursache

Du pastest den kompletten Skript-Code (~10 KB, >200 Zeilen) direkt in die PuTTY-Shell. Dabei läuft jede Zeile **sofort** in deiner aktiven SSH-Session — Zeile für Zeile. Zwei Dinge killen dann deine Session:

1. **`apt update && apt upgrade -y`**: Das Upgrade startet auf Debian/Ubuntu gern mitten im Lauf `openssh-server` neu → deine eigene Verbindung wird getrennt, PuTTY schließt sich. Der Rest des Pastes landet dann im Nirgendwo, und die Shell ist weg.
2. **Paste-Flooding**: PuTTY schiebt hunderte Zeilen in Sekunden in den Terminal-Puffer. Enthält der Paste Steuerzeichen, `&`-Hintergrund-Prozesse oder ein verfrühtes `EOF` im Heredoc, läuft die Shell aus dem Takt und bricht teilweise komplett ab.

Der Inhalt des Skripts ist nicht das Problem — **die Art des Ausführens** ist es.

## Fix: Erst als Datei speichern, dann ausführen (ohne PuTTY-Crash)

Schritt für Schritt in PuTTY eingeben:

```bash
# 1. Datei anlegen (leer)
nano /root/webid_v11.sh
```

In nano: Rechtsklick = Paste (oder Shift+Einfg). Den kompletten v11-Code einfügen. Nano puffert den Text, er wird **nicht** zeilenweise ausgeführt — das killt das Flooding-Problem komplett. Danach `Ctrl+O`, Enter, `Ctrl+X`.

```bash
# 2. Syntax prüfen (dauert 1 Sekunde, fängt Paste-Fehler ab)
bash -n /root/webid_v11.sh && echo "SYNTAX OK"
```

```bash
# 3. In screen starten, mit Logfile
apt install -y screen
screen -S webid
bash /root/webid_v11.sh 2>&1 | tee /root/webid_v11.log
```

Wenn PuTTY jetzt doch schließt: einfach neu einloggen und

```bash
screen -r webid
```

Das Skript lief die ganze Zeit weiter, `/root/webid_v11.log` zeigt exakt die letzte Zeile.

## Kleine Skript-Anpassungen (verhindern den SSH-Restart beim Upgrade)

Im v11-Code (vor dem Einfügen in nano) zwei Stellen ändern:

1. **Zeile `apt update && apt upgrade -y` komplett entfernen** — nur `apt update` behalten. Das Voll-Upgrade ist für WebID unnötig und genau das, was openssh neu startet.
2. **Vor dem `ufw enable`-Block** zusätzlich `ufw allow 22/tcp` einfügen, damit SSH auf keinen Fall wegfällt.

Alles andere im Skript (Lua-Header-Filter, Client-JS, Subfilter, Certbot) bleibt byte-identisch.

## Ergebnis

Ich liefere `/mnt/documents/webid_skript_universal_v12.sh` — v11 mit genau diesen beiden Anpassungen — plus die obige 3-Schritt-Anleitung. Danach läuft das Skript zu Ende, auch wenn die Verbindung zwischendurch abreißt.
