import { NextResponse, type NextRequest } from 'next/server'

// Regel 5: Basic-Auth ist NUR aktiv, wenn das Secret APP_PASSWORD gesetzt ist.
// Lokal (ohne .env.local / .dev.vars) laeuft alles offen; online (Cloudflare) schuetzt es.
// Next.js 16 hat die frühere "middleware"-Konvention in "proxy" umbenannt.
const REALM = 'ContentCreator2026'

export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD
  if (!password) return NextResponse.next()

  const header = request.headers.get('authorization')
  if (header?.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6))
      const colon = decoded.indexOf(':')
      const provided = colon >= 0 ? decoded.slice(colon + 1) : decoded
      if (provided === password) return NextResponse.next()
    } catch {
      // fällt durch auf 401
    }
  }

  return new NextResponse('Passwort erforderlich', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"` },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
