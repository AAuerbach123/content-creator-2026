// Benachrichtigungen (Vorschläge 9 + 10): immer als Meldung im Cockpit (Glocke),
// zusätzlich per E-Mail (Resend, wenn RESEND_API_KEY + MAIL_ABSENDER gesetzt) und Microsoft Teams (TEAMS_WEBHOOK_URL).
// Nie blockierend: Fehler beim Versand werden nur protokolliert.

import { dokLaden, dokSpeichern, protokollieren } from './speicher'

export type Meldung = { art: 'korrektur' | 'freigabe-verlag' | 'foto' | 'monday' | 'info'; text: string; link?: string; am: number; gelesen: string[] }

async function mailSenden(an: string[], betreff: string, text: string): Promise<string | null> {
  const key = process.env.RESEND_API_KEY
  const von = process.env.MAIL_ABSENDER
  const liste = an.map((x) => x.trim()).filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x))
  if (!key || !von || !liste.length) return null
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: von, to: liste, subject: betreff.slice(0, 150), text }),
  })
  return r.ok ? `E-Mail an ${liste.length}` : `E-Mail-Fehler ${r.status}`
}

async function teamsSenden(text: string): Promise<string | null> {
  const url = process.env.TEAMS_WEBHOOK_URL
  if (!url) return null
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) })
  return r.ok ? 'Teams' : `Teams-Fehler ${r.status}`
}

/** Meldung an Telemedia: Glocke + E-Mail an die eingestellten Adressen + Teams. */
export async function telemediaMelden(m: Omit<Meldung, 'am' | 'gelesen'>, basisUrl?: string): Promise<void> {
  const jetzt = Date.now()
  try { await dokSpeichern('meldung', crypto.randomUUID(), { ...m, am: jetzt, gelesen: [] }, 0, 'system') } catch { /* egal */ }
  try {
    const einst = (await dokLaden('einstellung', 'benachrichtigung'))?.daten as { mailAn?: string } | undefined
    const link = m.link && basisUrl ? `\n\n${basisUrl}${m.link}` : ''
    const ergebnisse = await Promise.all([
      mailSenden((einst?.mailAn ?? '').split(','), `Cockpit: ${m.text}`, m.text + link),
      teamsSenden(m.text + link),
    ])
    const versand = ergebnisse.filter(Boolean).join(', ')
    if (versand) await protokollieren({ wer: 'system', typ: 'meldung', dokId: '', aktion: 'sonstiges', zusammenfassung: `${m.text} → ${versand}` })
  } catch { /* Versand darf nie blockieren */ }
}

/** E-Mail an die Empfänger eines Verlags-Links: neue Anzeigen zur Prüfung. Liefert eine kurze Rückmeldung. */
export async function kundenMelden(an: string[], gruppe: string, portalUrl: string, spieltagText: string): Promise<string> {
  const text = `Guten Tag,\n\nfür ${gruppe} liegen neue Anzeigen zur Prüfung bereit: ${spieltagText}.\n\nBitte prüfen und freigeben:\n${portalUrl}\n\nVielen Dank\nTelemedia Interactive`
  const r = await mailSenden(an, `Neue Anzeigen zur Prüfung · ${spieltagText}`, text).catch(() => 'E-Mail-Fehler')
  return r ?? 'kein E-Mail-Versand eingerichtet'
}
