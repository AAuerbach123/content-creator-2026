#!/bin/bash
# Startet Ad-Creator (Port 3002) und ContentCreator2026 (Port 3000) je in einem eigenen Terminal-Fenster.
if ! lsof -i :3002 >/dev/null 2>&1; then
  osascript -e 'tell application "Terminal" to do script "cd ~/Desktop/wissensquiz && npm run dev -- -p 3002"' >/dev/null
fi
if ! lsof -i :3000 >/dev/null 2>&1; then
  osascript -e 'tell application "Terminal" to do script "cd ~/Desktop/content-creator-2026 && ([ -d node_modules ] || npm install) && npm run dev"' >/dev/null
fi
echo "Beide Tools starten … (ca. 15 Sekunden)"
sleep 15
echo "Ad-Creator:        http://localhost:3002"
echo "ContentCreator2026: http://localhost:3000"
echo "Die beiden Fenster mit den Servern offen lassen. Dieses Fenster kannst du schliessen."
