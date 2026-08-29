# Fix: v5 sub_filter-Injection wieder aktivieren

## Problem
In `webid_skript_universal_v5.sh` steht in der `sub_filter`-Ersetzung Zeile 139/140 zweimal hintereinander `<script>`. Das war ein Copy-Paste-Fehler beim Einbauen des Redirect-Reporters.

Auswirkung im Browser:
- Zeile 139 `<script>` öffnet Script #1.
- Zeile 140 `<script>` und die komplette IIFE werden zum Text-Inhalt von Script #1.
- Zeile 200 `</script>` schließt Script #1 — dessen JS beginnt mit `<script>` → SyntaxError.
- Redirect-Reporter läuft nie; nachfolgender sim-header-Block wirkt ebenfalls tot ("sub_filter geht nicht mehr").

Der nginx-`sub_filter` selbst ist intakt und ersetzt weiter `<head>`.

## Fix
In `webid_skript_universal_v5.sh` genau eine Zeile entfernen: das doppelte `<script>` in Zeile 140. Nichts anderes anfassen — v4-Verhalten bleibt so 1:1 erhalten, plus funktionierender Redirect-Reporter.

Vorher:
```
139:         <script>
140:         <script>
141:             (function(){
```
Nachher:
```
139:         <script>
140:             (function(){
```

## Auslieferung
Ich schreibe die korrigierte Datei nach `/mnt/documents/webid_skript_universal_v5.sh` (nur diese eine Zeile entfernt) und hänge sie als Artefakt an.
