#!/bin/bash
# Cockpit 2027 – zentralen Speicher bei Cloudflare einrichten (einmalig).
# Legt an: D1-Datenbank „cockpit-db“ (Daten aller Spiele) und KV „COCKPIT_ASSETS“ (Fotos, PDFs)
# und trägt beide in wrangler.jsonc ein. Danach optional die Schlüssel (Secrets) setzen.
# Du meldest dich dabei selbst bei Cloudflare an (Browserfenster) – das Skript sieht keine Passwörter.
cd "$(dirname "$0")" || exit 1

pause() { read -p "Enter drücken zum Schließen."; }
abbruch() { echo ""; echo "ABBRUCH: $1"; echo "Bitte dieses Fenster als Screenshot an Claude schicken."; pause; exit 1; }

command -v node >/dev/null || abbruch "Node.js fehlt."

echo "1/5  Cloudflare-Anmeldung prüfen …"
if ! npx --yes wrangler@latest whoami 2>/dev/null | grep -qi "associated with the email"; then
  echo "     Bitte im Browserfenster bei Cloudflare anmelden und „Allow“ klicken …"
  npx --yes wrangler@latest login || abbruch "Anmeldung bei Cloudflare nicht möglich."
fi

echo ""; echo "2/5  D1-Datenbank „cockpit-db“ …"
DB_ID=$(npx --yes wrangler@latest d1 list --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const l=JSON.parse(s);const d=l.find(x=>x.name==="cockpit-db");process.stdout.write(d?d.uuid:"")}catch{}})')
if [ -z "$DB_ID" ]; then
  npx --yes wrangler@latest d1 create cockpit-db || abbruch "D1-Datenbank konnte nicht angelegt werden."
  DB_ID=$(npx --yes wrangler@latest d1 list --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const l=JSON.parse(s);const d=l.find(x=>x.name==="cockpit-db");process.stdout.write(d?d.uuid:"")}catch{}})')
fi
[ -n "$DB_ID" ] || abbruch "Datenbank-ID nicht gefunden."
echo "     ✓ cockpit-db ($DB_ID)"

echo ""; echo "3/5  KV-Speicher „COCKPIT_ASSETS“ …"
KV_ID=$(npx --yes wrangler@latest kv namespace list 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const l=JSON.parse(s);const d=l.find(x=>/COCKPIT_ASSETS/.test(x.title));process.stdout.write(d?d.id:"")}catch{}})')
if [ -z "$KV_ID" ]; then
  npx --yes wrangler@latest kv namespace create COCKPIT_ASSETS || abbruch "KV konnte nicht angelegt werden."
  KV_ID=$(npx --yes wrangler@latest kv namespace list 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const l=JSON.parse(s);const d=l.find(x=>/COCKPIT_ASSETS/.test(x.title));process.stdout.write(d?d.id:"")}catch{}})')
fi
[ -n "$KV_ID" ] || abbruch "KV-ID nicht gefunden."
echo "     ✓ COCKPIT_ASSETS ($KV_ID)"

echo ""; echo "4/5  wrangler.jsonc ergänzen …"
DB_ID="$DB_ID" KV_ID="$KV_ID" node -e '
const fs=require("fs"); const p="wrangler.jsonc"; let s=fs.readFileSync(p,"utf8");
if(!s.includes("COCKPIT_DB")){
  s=s.replace(/("kv_namespaces"\s*:\s*\[)/, `$1\n    { "binding": "COCKPIT_ASSETS", "id": "${process.env.KV_ID}" },`);
  s=s.replace(/("kv_namespaces"\s*:\s*\[[\s\S]*?\])/, `$1,\n  // Cockpit 2027: zentraler Speicher (Cockpit-Server einrichten.command)\n  "d1_databases": [\n    { "binding": "COCKPIT_DB", "database_name": "cockpit-db", "database_id": "${process.env.DB_ID}" }\n  ]`);
  fs.writeFileSync(p,s); console.log("     ✓ eingetragen");
} else console.log("     ✓ war schon eingetragen");
' || abbruch "wrangler.jsonc konnte nicht geändert werden."
npx --yes wrangler@latest d1 execute cockpit-db --remote --file migrations/0001_cockpit.sql -y >/dev/null 2>&1 && echo "     ✓ Tabellen angelegt" || echo "     (Tabellen werden beim ersten Zugriff automatisch angelegt)"

echo ""; echo "5/5  Schlüssel (Secrets) – jeweils j = jetzt eingeben, Enter = überspringen."
echo "     Was die Werte bedeuten: docs/einrichtung-login-und-kunden.md"
for NAME in CF_ACCESS_TEAM_DOMAIN CF_ACCESS_AUD COCKPIT_ADMINS CF_ACCOUNT_ID CF_BROWSER_TOKEN RESEND_API_KEY MAIL_ABSENDER TEAMS_WEBHOOK_URL MONDAY_API_TOKEN; do
  read -p "     $NAME setzen? [j/N] " a
  if [[ "$a" =~ ^[jJyY]$ ]]; then npx --yes wrangler@latest secret put "$NAME" || echo "     ⚠ $NAME nicht gesetzt"; fi
done

echo ""; echo "FERTIG. Jetzt „ContentCreator online stellen.command“ ausführen, damit die neue Version online geht."
pause
