// /api/cockpit/ich – wer ist angemeldet, welche Rolle, welcher Speicher-Modus.
import { umgebung } from '@/lib/server/speicher'
import { benutzerAus, darf, darfVarianten, ZugangFehler } from '@/lib/server/zugang'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const b = await benutzerAus(request)
    const u = await umgebung()
    return Response.json({
      benutzer: b,
      rechte: {
        bearbeiten: darf(b, 'bearbeiten'),
        gestalten: darf(b, 'gestalten'),
        freigeben: darf(b, 'freigeben'),
        admin: darf(b, 'admin'),
        varianten: darfVarianten(b),
      },
      speicher: u.modus,
    })
  } catch (e) {
    const status = e instanceof ZugangFehler ? e.status : 500
    return Response.json({ fehler: e instanceof Error ? e.message : String(e) }, { status })
  }
}
