import { NextResponse, type NextRequest } from 'next/server'

// Regel 5: Basic-Auth ist NUR aktiv, wenn das Secret APP_PASSWORD gesetzt ist (und Cloudflare Access nicht eingerichtet ist).
// Lokal (ohne .env.local / .dev.vars) laeuft alles offen; online (Cloudflare) schuetzt es.
// Next.js 16 hat die frühere "middleware"-Konvention in "proxy" umbenannt.
const REALM = 'ContentCreator2026'

// Öffentliche Kunden-Routen (Token-geschützt):
//  - /review/<token>: Kunden-Ansicht der Freigabe (Job-Editor)
//  - /api/freigabe:   GET/PATCH nur mit korrektem Token (siehe route.ts)
//  - /portal/<token>: Kunden-Korrekturportal je Verlagsgruppe (Cockpit)
//  - /api/portal:     Daten nur mit gültigem, nicht gesperrtem Verlags-Token
// Ohne diese Ausnahme wären Kunden hinter dem Login gefangen.
function istOeffentlicheReviewRoute(pfad: string): boolean {
  if (pfad.startsWith('/review/') || pfad === '/api/freigabe' || pfad.startsWith('/portal/') || pfad === '/api/portal' || pfad.startsWith('/foto/') || pfad === '/api/foto') return true
  // Für die Darstellung der Anzeigen im Kundenportal: nur Bilder/Schriften und die Zeitungsdaten (stehen ohnehin in der Anzeige).
  // NICHT öffentlich: /serie/fragen_2027.json (künftige Rätsel + Lösungen) und /serie/tnb_referenz.json.
  return pfad.startsWith('/serie/assets/') || pfad === '/serie/zeitungen.json' || pfad === '/serie/zeitungen-weitere.json' || pfad === '/telemedia-logo.png'
}

export function proxy(request: NextRequest) {
  // Mit Cloudflare Access (CF_ACCESS_TEAM_DOMAIN + CF_ACCESS_AUD) übernimmt Access die Anmeldung am Rand
  // des Netzes; die API-Routen prüfen das Access-Token zusätzlich selbst (src/lib/server/zugang.ts).
  // Ein zusätzliches Basic-Auth-Passwort wäre dann eine doppelte Anmeldung.
  if (process.env.CF_ACCESS_TEAM_DOMAIN && process.env.CF_ACCESS_AUD) {
    const pfadA = request.nextUrl.pathname
    if (istOeffentlicheReviewRoute(pfadA)) return NextResponse.next()
    // Schutz bei Fehlkonfiguration: ohne Access-Token kein Zugriff (volle Signaturprüfung in den Cockpit-APIs).
    const hatToken = request.headers.get('cf-access-jwt-assertion') || request.cookies.get('CF_Authorization')?.value
    if (!hatToken) return new NextResponse('Bitte über die Telemedia-Anmeldung (Cloudflare Access) öffnen.', { status: 401 })
    return NextResponse.next()
  }

  const password = process.env.APP_PASSWORD
  if (!password) return NextResponse.next()

  const pfad = request.nextUrl.pathname
  if (istOeffentlicheReviewRoute(pfad)) return NextResponse.next()

  const header = request.headers.get('authorization')
  if (header?.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6))
      const colon = decoded.indexOf(':')
      const provided = colon >= 0 ? decoded.slice(colon + 1) : decoded
      if (sicherVergleichen(provided, password)) return NextResponse.next()
    } catch {
      // fällt durch auf 401
    }
  }

  return new NextResponse('Passwort erforderlich', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"` },
  })
}

// Zeitkonstanter Vergleich (verhindert Timing-Angriffe auf das Passwort).
function sicherVergleichen(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
