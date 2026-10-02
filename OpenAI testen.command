#!/bin/bash
# Testet, ob der OpenAI-Schlüssel aus .env.local Bilder erzeugen kann (1 kleines Bild, Kosten ca. 1–2 US-Cent).
cd "$(dirname "$0")" || exit 1
mkdir -p out
node - <<'JS'
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const m = env.match(/^OPENAI_API_KEY\s*=\s*"?([^"\n]+)"?/m);
if (!m) { console.log('FEHLER: In .env.local steht kein OPENAI_API_KEY.'); process.exit(1); }
(async () => {
  console.log('Frage OpenAI an … (dauert 10–40 Sekunden)');
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + m[1].trim(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt: 'Photorealistic photo of a red apple on a wooden table, soft daylight', size: '1024x1024', quality: 'low', n: 1 })
  });
  const j = await r.json();
  if (!r.ok) {
    console.log('FEHLER ' + r.status + ': ' + (j.error && j.error.message ? j.error.message : JSON.stringify(j)));
    if (j.error && /quota|billing|credit/i.test(j.error.message || '')) console.log('→ Guthaben ist noch nicht angekommen. In 5–10 Minuten nochmals testen.');
    if (r.status === 401) console.log('→ Schlüssel ungültig: neuen Schlüssel bei OpenAI erstellen und in .env.local eintragen.');
    if (/verif/i.test((j.error && j.error.message) || '')) console.log('→ OpenAI verlangt eine Organisations-Verifizierung für dieses Bildmodell.');
    process.exit(1);
  }
  fs.writeFileSync('out/openai-test.png', Buffer.from(j.data[0].b64_json, 'base64'));
  console.log('OK – OpenAI funktioniert. Testbild: out/openai-test.png');
  require('child_process').execSync('open out/openai-test.png');
})().catch(e => { console.log('FEHLER: ' + e.message); process.exit(1); });
JS
read -p "Enter drücken zum Schließen."
