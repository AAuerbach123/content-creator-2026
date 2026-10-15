'use client'

// Foto-Link für einen Gewinner (Vorschlag 4): Link erzeugen, kopieren, per SMS/E-Mail teilen (das Cockpit sendet nie selbst).
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useSprache } from '@/components/SpracheProvider'
import { dokListe, dokSpeichern } from '@/lib/cockpit/daten-client'
import type { FotoLink, SpieltagGewinner } from '@/lib/cockpit/typen'
import { useIch } from './IchKontext'

export default function FotoLinkKnopf({ spieltagId, gewinner }: { spieltagId: string; gewinner: SpieltagGewinner }) {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const { ich } = useIch()
  const [link, setLink] = useState<FotoLink | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [kopiert, setKopiert] = useState(false)

  useEffect(() => {
    dokListe<FotoLink>('fotoLink', { feld: 'gewinnerId', wert: gewinner.id })
      .then((l) => setLink(l.filter((x) => x.aktiv && x.ablaufAm > Date.now()).sort((a, b) => b.erstelltAm - a.erstelltAm)[0] ?? null))
      .catch(() => undefined)
  }, [gewinner.id])

  const url = link ? `${window.location.origin}/foto/${link.token}` : ''
  const erzeugen = async () => {
    const b = new Uint8Array(32)
    crypto.getRandomValues(b)
    const token = Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
    const neu: FotoLink = { token, spieltagId, gewinnerId: gewinner.id, vorname: gewinner.name.trim().split(/\s+/)[0] ?? '', aktiv: true, ablaufAm: Date.now() + 7 * 86400000, erstelltAm: Date.now(), erstelltVon: ich?.benutzer.email ?? '' }
    await dokSpeichern('fotoLink', token, neu)
    setLink(neu)
  }
  const text = de
    ? `Herzlichen Glückwunsch zu Ihrem Gewinn! Bitte laden Sie hier Ihr Foto für die Gewinneranzeige hoch: ${url}`
    : `Congratulations! Please upload your photo here: ${url}`

  if (!gewinner.name.trim()) return null
  return (
    <div className="cockpit-fotolink">
      {gewinner.fotoEingangAm && (
        <span className="cockpit-chip gruen">{de ? 'Foto vom Gewinner eingegangen' : 'Photo received'} · {new Date(gewinner.fotoEingangAm).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</span>
      )}
      {gewinner.einwilligungQuelle === 'gewinner-link' && <span className="cockpit-chip gruen">{de ? 'Einwilligung vom Gewinner bestätigt' : 'Consent confirmed by winner'}</span>}
      {!link ? (
        <button type="button" className="cockpit-knopf sekundaer" onClick={erzeugen}>{de ? 'Foto-Link für den Gewinner' : 'Photo link for winner'}</button>
      ) : (
        <>
          <button type="button" className="cockpit-knopf text" onClick={async () => { await navigator.clipboard.writeText(url).catch(() => undefined); setKopiert(true) }}>{kopiert ? (de ? 'Kopiert ✓' : 'Copied ✓') : (de ? 'Link kopieren' : 'Copy link')}</button>
          <a className="cockpit-knopf text" href={`sms:?&body=${encodeURIComponent(text)}`}>SMS</a>
          <a className="cockpit-knopf text" href={`mailto:?subject=${encodeURIComponent(de ? 'Ihr Gewinnerfoto' : 'Your winner photo')}&body=${encodeURIComponent(text)}`}>{de ? 'E-Mail' : 'Email'}</a>
          <button type="button" className="cockpit-knopf text" onClick={async () => setQr(qr ? null : await QRCode.toDataURL(url, { margin: 1, width: 180 }))}>QR</button>
          <small className="leise">{de ? 'gültig bis' : 'valid until'} {new Date(link.ablaufAm).toLocaleDateString('de-DE')}</small>
          {qr && <img src={qr} alt={de ? 'QR-Code zum Foto-Link' : 'QR code'} width={140} height={140} />}
        </>
      )}
    </div>
  )
}
