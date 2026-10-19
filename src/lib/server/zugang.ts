// Anmeldung & Rechte (LOOP-Cockpit-Ausbau-Team.md, Phase 2).
//
// Online mit Cloudflare Access: Access setzt nach dem Login (E-Mail + Einmal-Code) das signierte JWT
// `Cf-Access-Jwt-Assertion`. Wir prüfen Signatur (RS256, Zertifikate des Access-Teams), Ablauf,
// Audience und Aussteller selbst per WebCrypto – keine zusätzliche Bibliothek.
//
// Variablen (Cloudflare Secrets / .env.local):
//   CF_ACCESS_TEAM_DOMAIN  z. B. telemedia.cloudflareaccess.com
//   CF_ACCESS_AUD          „Application Audience (AUD) Tag" der Access-Anwendung
//   COCKPIT_ADMINS         Komma-Liste von E-Mail-Adressen, die immer Admin sind
//
// Ohne CF_ACCESS_*: lokaler Modus (Mac) bzw. gemeinsames Passwort (Basic-Auth) → ein Benutzer „team“ mit Admin-Rechten.

import { dokLaden } from './speicher'

export type Rolle = 'admin' | 'redaktion' | 'grafik' | 'pruefer' | 'lesen'
export type Recht = 'lesen' | 'bearbeiten' | 'gestalten' | 'freigeben' | 'admin'

export type Benutzer = {
  email: string
  name: string
  rolle: Rolle
  modus: 'access' | 'lokal' | 'passwort'
}

export type BenutzerEintrag = { email: string; name?: string; rolle: Rolle; aktiv: boolean; tourGesehen?: boolean }

export const ROLLEN: Rolle[] = ['admin', 'redaktion', 'grafik', 'pruefer', 'lesen']

const RECHTE: Record<Rolle, Recht[]> = {
  admin: ['lesen', 'bearbeiten', 'gestalten', 'freigeben', 'admin'],
  redaktion: ['lesen', 'bearbeiten', 'freigeben'],
  grafik: ['lesen', 'gestalten', 'bearbeiten'],
  pruefer: ['lesen', 'freigeben'],
  lesen: ['lesen'],
}

export function darf(b: Benutzer, recht: Recht): boolean {
  return RECHTE[b.rolle]?.includes(recht) ?? false
}

/** Gestaltungsvarianten (KI erzeugen, anpassen, Geldscheine platzieren): nur Rolle „Grafik“ – lokal auf dem Mac ohne Anmeldung ebenfalls. */
export function darfVarianten(b: Benutzer): boolean {
  return b.rolle === 'grafik' || b.modus === 'lokal'
}

/** Standardrolle für angemeldete Personen ohne Eintrag: Redaktion (Tagesarbeit möglich, keine Admin-Funktionen). */
export const STANDARD_ROLLE: Rolle = 'redaktion'

export class ZugangFehler extends Error {
  constructor(public status: 401 | 403, nachricht: string) {
    super(nachricht)
  }
}

// ------------------------------------------------------------------ JWT (RS256) prüfen

type Jwk = JsonWebKey & { kid?: string }
let zertifikate: { keys: Jwk[]; geholt: number } | null = null

function b64urlZuBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function schluesselHolen(team: string, kid: string): Promise<Jwk | undefined> {
  const alt = !zertifikate || Date.now() - zertifikate.geholt > 60 * 60 * 1000
  if (alt || !zertifikate!.keys.some((k) => k.kid === kid)) {
    const r = await fetch(`https://${team}/cdn-cgi/access/certs`)
    if (!r.ok) throw new ZugangFehler(401, 'Access-Zertifikate nicht abrufbar.')
    const j = (await r.json()) as { keys?: Jwk[] }
    zertifikate = { keys: j.keys ?? [], geholt: Date.now() }
  }
  return zertifikate!.keys.find((k) => k.kid === kid)
}

export async function jwtPruefen(token: string, team: string, aud: string): Promise<{ email: string; name?: string }> {
  const teile = token.split('.')
  if (teile.length !== 3) throw new ZugangFehler(401, 'Ungültiges Anmelde-Token.')
  const kopf = JSON.parse(new TextDecoder().decode(b64urlZuBytes(teile[0]))) as { alg?: string; kid?: string }
  const nutz = JSON.parse(new TextDecoder().decode(b64urlZuBytes(teile[1]))) as { email?: string; aud?: string | string[]; exp?: number; nbf?: number; iss?: string; name?: string }
  if (kopf.alg !== 'RS256' || !kopf.kid) throw new ZugangFehler(401, 'Unerwartetes Token-Format.')
  const jwk = await schluesselHolen(team, kopf.kid)
  if (!jwk) throw new ZugangFehler(401, 'Unbekannter Token-Schlüssel.')
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlZuBytes(teile[2]),
    new TextEncoder().encode(teile[0] + '.' + teile[1]),
  )
  if (!ok) throw new ZugangFehler(401, 'Token-Signatur ungültig.')
  const jetzt = Math.floor(Date.now() / 1000)
  if (!nutz.exp || nutz.exp < jetzt - 30) throw new ZugangFehler(401, 'Anmeldung abgelaufen – bitte neu laden.')
  if (nutz.nbf && nutz.nbf > jetzt + 30) throw new ZugangFehler(401, 'Token noch nicht gültig.')
  const auds = Array.isArray(nutz.aud) ? nutz.aud : [nutz.aud]
  if (!auds.includes(aud)) throw new ZugangFehler(401, 'Token gehört nicht zu dieser Anwendung.')
  if (nutz.iss && nutz.iss !== `https://${team}`) throw new ZugangFehler(401, 'Token-Aussteller unbekannt.')
  if (!nutz.email) throw new ZugangFehler(401, 'Token ohne E-Mail-Adresse.')
  return { email: nutz.email.toLowerCase(), name: nutz.name }
}

// ------------------------------------------------------------------ Benutzer ermitteln

function cookieWert(header: string | null, name: string): string | undefined {
  if (!header) return undefined
  for (const teil of header.split(';')) {
    const [k, ...v] = teil.trim().split('=')
    if (k === name) return v.join('=')
  }
  return undefined
}

export function accessAktiv(): boolean {
  return Boolean(process.env.CF_ACCESS_TEAM_DOMAIN && process.env.CF_ACCESS_AUD)
}

/** Ermittelt den angemeldeten Benutzer. Wirft ZugangFehler(401), wenn Access aktiv ist und kein gültiges Token vorliegt. */
export async function benutzerAus(request: Request): Promise<Benutzer> {
  const team = process.env.CF_ACCESS_TEAM_DOMAIN?.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const aud = process.env.CF_ACCESS_AUD
  if (!team || !aud) {
    const passwort = Boolean(process.env.APP_PASSWORD)
    return passwort
      ? { email: 'team', name: 'Team (gemeinsames Passwort)', rolle: 'admin', modus: 'passwort' }
      : { email: 'lokal', name: 'Lokal (Mac)', rolle: 'admin', modus: 'lokal' }
  }
  const token = request.headers.get('cf-access-jwt-assertion') ?? cookieWert(request.headers.get('cookie'), 'CF_Authorization')
  if (!token) throw new ZugangFehler(401, 'Nicht angemeldet.')
  const { email, name } = await jwtPruefen(token, team, aud)
  const admins = (process.env.COCKPIT_ADMINS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  let eintrag: BenutzerEintrag | null = null
  try {
    eintrag = ((await dokLaden('benutzer', email))?.daten as BenutzerEintrag | undefined) ?? null
  } catch {
    eintrag = null
  }
  if (eintrag && !eintrag.aktiv && !admins.includes(email)) throw new ZugangFehler(403, 'Zugang gesperrt. Bitte an die Administration wenden.')
  const rolle: Rolle = admins.includes(email) ? 'admin' : eintrag?.rolle ?? STANDARD_ROLLE
  return { email, name: eintrag?.name || name || email, rolle, modus: 'access' }
}

/** Für API-Routen: Benutzer holen und Recht prüfen; liefert bei Fehler eine fertige Response. */
export async function mitRecht(request: Request, recht: Recht): Promise<{ benutzer: Benutzer } | { antwort: Response }> {
  try {
    const benutzer = await benutzerAus(request)
    if (!darf(benutzer, recht)) {
      return { antwort: Response.json({ fehler: 'Dafür fehlt dir die Berechtigung (Rolle: ' + benutzer.rolle + ').' }, { status: 403 }) }
    }
    return { benutzer }
  } catch (e) {
    const status = e instanceof ZugangFehler ? e.status : 401
    return { antwort: Response.json({ fehler: e instanceof Error ? e.message : String(e) }, { status }) }
  }
}
