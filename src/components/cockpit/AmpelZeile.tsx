'use client'

// Ampel-Punkte eines Spieltags (Rätsel ✓ · Gewinner 2 · Fotos 1/2 …); Klick springt zur passenden Phase.
import Link from 'next/link'
import type { Ampel } from '@/lib/cockpit/tagesstatus'

export default function AmpelZeile({ ampel, de, basisLink }: { ampel: Ampel; de: boolean; basisLink?: string }) {
  return (
    <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {ampel.punkte.map((p) => {
        const klasse = `cockpit-chip ${p.ok ? 'gruen' : p.teil ? 'gelb' : 'grau'}`
        const inhalt = (
          <>
            <span aria-hidden>{p.ok ? '✓' : p.teil ? '◐' : '○'}</span>
            <span>{de ? p.textDe : p.textEn}</span>
          </>
        )
        return basisLink && !p.ok ? (
          <Link key={p.schluessel} href={`${basisLink}&phase=${p.phase}`} className={klasse} style={{ textDecoration: 'none' }}>{inhalt}</Link>
        ) : (
          <span key={p.schluessel} className={klasse}>{inhalt}</span>
        )
      })}
    </span>
  )
}
