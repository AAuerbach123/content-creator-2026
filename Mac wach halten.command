#!/bin/bash
# Hält den Mac 10 Stunden wach (kein Ruhezustand, Bildschirm bleibt an) – z. B. während ein Loop, Upload oder Export läuft.
# Vorzeitig beenden: dieses Fenster schließen.
echo "Mac bleibt bis $(date -v+10H +%H:%M) Uhr wach. Fenster schließen = wieder normal."
caffeinate -dims -t 36000
