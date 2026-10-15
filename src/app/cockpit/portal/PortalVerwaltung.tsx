'use client'

// Cockpit · Kundenportal: Links je Verlagsgruppe (erzeugen, kopieren, QR, sperren) +
// Übersicht Spieltag × Verlagsgruppe mit Status und Kundenkommentaren (bearbeiten, beantworten).

import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { useSprache } from '@/components/SpracheProvider'
import Karte from '@/components/cockpit/Karte'
import Hinweis from '@/components/cockpit/Hinweis'
import { useIch } from '@/components/cockpit/IchKontext'
import { spielName, teilnehmerIds, useZeitungen } from '@/components/cockpit/HeuteZuTun'
import { alleKampagnen, dokListe, dokSpeichern, spieltageLaden, spieltagSpeichern } from '@/lib/cockpit/daten-client'
import { verlagsgruppen } from '@/lib/cockpit/verlagsgruppen'
import { VERLAGS_STATUS_REIHE, VERLAGS_STATUS_TEXT, type Kampagne, type PortalKommentar, type Spieltag, type VerlagsStatus } from '@/lib/cockpit/typen'

type PortalLink = { token: string; gruppe: string; name: string; aktiv: boolean; erstelltAm: number; erstelltVon: string; gesperrtAm?: number; empfaenger?: string }

function neuerToken(): string {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}

export default function PortalVerwaltung() {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const t = (d: string, e: string) => (de ? d : e)
  const { ich, darf } = useIch()
  const basis = useZeitungen()
  const [links, setLinks] = useState<PortalLink[]>([])
  const [qr, setQr] = useState<{ gruppe: string; url: string; bild: string } | null>(null)
  const [meldung, setMeldung] = useState<string | null>(null)
  const [kampagnen, setKampagnen] = useState<Kampagne[]>([])
  const [kampagneId, setKampagneId] = useState('')
  const [tage, setTage] = useState<Spieltag[]>([])
  const [zelle, setZelle] = useState<{ tagId: string; gruppe: string } | null>(null)

  const linksLaden = () => dokListe<PortalLink>('portalLink').then(setLinks).catch(() => undefined)
  useEffect(() => {
    void linksLaden()
    alleKampagnen().then((ks) => { setKampagnen(ks); setKampagneId((a) => a || ks[0]?.id || '') }).catch(() => undefined)
  }, [])
  useEffect(() => {
    if (kampagneId) spieltageLaden(kampagneId).then(setTage).catch(() => setTage([]))
  }, [kampagneId])

  const alleGruppen = useMemo(() => (basis ? verlagsgruppen(basis.daten.zeitungen) : []), [basis])
  const kampagne = kampagnen.find((k) => k.id === kampagneId)
  const kGruppen = useMemo(() => (basis && kampagne ? verlagsgruppen(basis.daten.zeitungen, teilnehmerIds(kampagne, basis)) : []), [basis, kampagne])
  const url = (token: string) => `${window.location.origin}/portal/${token}`

  const erzeugen = async (gruppe: string, name: string) => {
    // bestehende aktive Links dieser Gruppe sperren (nur ein gültiger Link je Gruppe)
    for (const l of links.filter((x) => x.gruppe === gruppe && x.aktiv)) {
      await dokSpeichern('portalLink', l.token, { ...l, aktiv: false, gesperrtAm: Date.now() })
    }
    const token = neuerToken()
    await dokSpeichern('portalLink', token, { token, gruppe, name, aktiv: true, erstelltAm: Date.now(), erstelltVon: ich?.benutzer.email ?? '' })
    await linksLaden()
    setMeldung(t(`Neuer Link für ${name} erzeugt.`, `New link for ${name} created.`))
  }
  const sperren = async (l: PortalLink) => {
    if (!window.confirm(t(`Link für ${l.name} sperren? Der Verlag kommt danach nicht mehr ins Portal.`, `Block link for ${l.name}?`))) return
    await dokSpeichern('portalLink', l.token, { ...l, aktiv: false, gesperrtAm: Date.now() })
    await linksLaden()
  }
  const kopieren = async (l: PortalLink) => {
    await navigator.clipboard.writeText(url(l.token)).catch(() => undefined)
    setMeldung(t(`Link für ${l.name} kopiert – per E-Mail an den Verlag schicken.`, `Link for ${l.name} copied.`))
  }
  const qrZeigen = async (l: PortalLink) => setQr({ gruppe: l.name, url: url(l.token), bild: await QRCode.toDataURL(url(l.token), { margin: 1, width: 220 }) })

  const spieltagAendern = async (s: Spieltag) => {
    setTage((alt) => alt.map((x) => (x.id === s.id ? s : x)))
    await spieltagSpeichern(s)
  }

  const sichtbareTage = tage.filter((s) => s.status === 'freigegeben' || Object.keys(s.verlagsStatus ?? {}).length > 0)
  const aktiv = zelle ? tage.find((s) => s.id === zelle.tagId) : undefined
  const kommentare: PortalKommentar[] = aktiv && zelle ? aktiv.portalKommentare?.[zelle.gruppe] ?? [] : []

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div>
        <h2 style={{ margin: '0 0 6px', fontSize: 24 }}>{t('Kundenportal', 'Client portal')}</h2>
        <p style={{ margin: 0, color: 'var(--tm-grau)', maxWidth: 820 }}>
          {t(
            'Jede Verlagsgruppe bekommt einen eigenen Link. Der Verlag sieht nur seine Anzeigen der freigegebenen Spieltage, markiert Korrekturen direkt in der Anzeige und gibt frei. Ein Link lässt sich jederzeit sperren.',
            'Each publisher group gets its own link. Publishers only see their own ads of approved game days, mark corrections and approve.',
          )}
        </p>
      </div>
      {meldung && <Hinweis art="gold">{meldung}</Hinweis>}

      <Karte titel={t('Links je Verlagsgruppe', 'Links per publisher group')}>
        {!darf('admin') && <p>{t('Links erzeugen und sperren dürfen Admins.', 'Only admins can create and block links.')}</p>}
        <div style={{ overflowX: 'auto' }}>
          <table className="cockpit-tabelle">
            <thead><tr><th>{t('Verlagsgruppe', 'Group')}</th><th>{t('Zeitungen', 'Newspapers')}</th><th>{t('Link', 'Link')}</th><th></th></tr></thead>
            <tbody>
              {alleGruppen.map((g) => {
                const l = links.find((x) => x.gruppe === g.schluessel && x.aktiv)
                return (
                  <tr key={g.schluessel}>
                    <td><b>{g.name}</b></td>
                    <td className="leise" style={{ maxWidth: 360 }}>{g.zeitungen.map((z) => z.name).join(' · ')}</td>
                    <td>
                      {l ? <span className="cockpit-chip gruen">{t('aktiv seit ', 'active since ')}{new Date(l.erstelltAm).toLocaleDateString('de-DE')}</span> : <span className="cockpit-chip grau">{t('kein Link', 'no link')}</span>}
                      {l && darf('admin') && (
                        <input className="cockpit-antwort" style={{ display: 'block', marginTop: 6, minWidth: 220 }} aria-label={t(`E-Mail-Empfänger ${g.name}`, `Email recipients ${g.name}`)}
                          placeholder={t('E-Mail-Empfänger (Komma-getrennt)', 'Email recipients')} defaultValue={l.empfaenger ?? ''}
                          onBlur={async (e) => { if ((l.empfaenger ?? '') === e.target.value) return; await dokSpeichern('portalLink', l.token, { ...l, empfaenger: e.target.value.trim() }); await linksLaden() }} />
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {l && <button type="button" className="cockpit-knopf text" onClick={() => kopieren(l)}>{t('Kopieren', 'Copy')}</button>}
                      {l && <button type="button" className="cockpit-knopf text" onClick={() => qrZeigen(l)}>QR</button>}
                      {l && <a className="cockpit-knopf text" href={url(l.token)} target="_blank" rel="noreferrer">{t('Ansehen', 'Open')}</a>}
                      {darf('admin') && <button type="button" className="cockpit-knopf text" onClick={() => erzeugen(g.schluessel, g.name)}>{l ? t('Neuer Link', 'New link') : t('Link erzeugen', 'Create link')}</button>}
                      {darf('admin') && l && <button type="button" className="cockpit-knopf text" onClick={() => sperren(l)}>{t('Sperren', 'Block')}</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {qr && (
          <div className="cockpit-hinweis gold" style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <img src={qr.bild} alt={t(`QR-Code zum Portal ${qr.gruppe}`, `QR code for ${qr.gruppe}`)} width={160} height={160} />
            <div>
              <b>{qr.gruppe}</b>
              <p style={{ wordBreak: 'break-all', fontSize: 13 }}>{qr.url}</p>
              <button type="button" className="cockpit-knopf text" onClick={() => setQr(null)}>{t('Schliessen', 'Close')}</button>
            </div>
          </div>
        )}
      </Karte>

      <Karte
        titel={t('Freigaben der Verlage', 'Publisher approvals')}
        aktion={
          <select aria-label={t('Kampagne', 'Campaign')} value={kampagneId} onChange={(e) => { setKampagneId(e.target.value); setZelle(null) }} className="cockpit-auswahl">
            {kampagnen.map((k) => <option key={k.id} value={k.id}>{spielName(k.spielId)} · {k.monat}{k.monatBis ? '–' + k.monatBis.slice(5) : ''}</option>)}
          </select>
        }
      >
        {sichtbareTage.length === 0 ? (
          <p>{t('Noch keine freigegebenen Spieltage – sie erscheinen hier, sobald Telemedia sie in Schritt 5 freigibt.', 'No approved game days yet.')}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="cockpit-tabelle cockpit-matrix">
              <thead>
                <tr><th>{t('Spieltag', 'Day')}</th>{kGruppen.map((g) => <th key={g.schluessel}>{g.name}</th>)}</tr>
              </thead>
              <tbody>
                {sichtbareTage.map((s) => (
                  <tr key={s.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{s.nr} · {new Date(s.datum + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}</td>
                    {kGruppen.map((g) => {
                      const st = s.verlagsStatus?.[g.schluessel]
                      const k = (s.portalKommentare?.[g.schluessel] ?? []).filter((c) => !c.erledigt).length
                      const info = st ? VERLAGS_STATUS_TEXT[st] : null
                      const gewaehlt = zelle?.tagId === s.id && zelle.gruppe === g.schluessel
                      return (
                        <td key={g.schluessel}>
                          <button type="button" className={`cockpit-chip ${info?.farbe ?? 'grau'}${gewaehlt ? ' gewaehlt' : ''}`} onClick={() => setZelle({ tagId: s.id, gruppe: g.schluessel })}>
                            {info ? info[sprache] : '—'}{k ? ` · ${k} ✎` : ''}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {aktiv && zelle && (
          <div className="cockpit-zelldetail">
            <h3>{t('Spieltag', 'Day')} {aktiv.nr} · {kGruppen.find((g) => g.schluessel === zelle.gruppe)?.name}</h3>
            <div className="cockpit-feld" style={{ maxWidth: 320 }}>
              <label htmlFor="pv-status">{t('Status', 'Status')}</label>
              <select id="pv-status" value={aktiv.verlagsStatus?.[zelle.gruppe] ?? ''} disabled={!darf('bearbeiten')}
                onChange={(e) => void spieltagAendern({ ...aktiv, verlagsStatus: { ...(aktiv.verlagsStatus ?? {}), [zelle.gruppe]: e.target.value as VerlagsStatus }, aktualisiertAm: Date.now() })}>
                <option value="" disabled>—</option>
                {VERLAGS_STATUS_REIHE.map((v) => <option key={v} value={v}>{VERLAGS_STATUS_TEXT[v][sprache]}</option>)}
              </select>
            </div>
            {kommentare.length === 0 ? <p className="leise">{t('Keine Kommentare.', 'No comments.')}</p> : (
              <ol className="cockpit-kommentarliste">
                {kommentare.map((c) => (
                  <li key={c.id} className={c.erledigt ? 'erledigt' : ''}>
                    <div><b>{c.von}</b> <small>{new Date(c.am).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}{c.zeitungId ? ` · ${basis?.daten.zeitungen.find((z) => z.id === c.zeitungId)?.name ?? c.zeitungId}` : ''}{c.x !== undefined ? t(' · Markierung in der Anzeige', ' · marked in ad') : ''}</small></div>
                    <div>{c.text}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                        <input type="checkbox" checked={Boolean(c.erledigt)} disabled={!darf('bearbeiten')} onChange={(e) => {
                          const liste = kommentare.map((x) => (x.id === c.id ? { ...x, erledigt: e.target.checked } : x))
                          void spieltagAendern({ ...aktiv, portalKommentare: { ...(aktiv.portalKommentare ?? {}), [zelle.gruppe]: liste }, aktualisiertAm: Date.now() })
                        }} />
                        {t('erledigt', 'done')}
                      </label>
                      <input className="cockpit-antwort" placeholder={t('Antwort an den Verlag (optional)', 'Reply (optional)')} defaultValue={c.antwort ?? ''} disabled={!darf('bearbeiten')}
                        onBlur={(e) => {
                          if ((c.antwort ?? '') === e.target.value) return
                          const liste = kommentare.map((x) => (x.id === c.id ? { ...x, antwort: e.target.value } : x))
                          void spieltagAendern({ ...aktiv, portalKommentare: { ...(aktiv.portalKommentare ?? {}), [zelle.gruppe]: liste }, aktualisiertAm: Date.now() })
                        }} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </Karte>

      <p style={{ fontSize: 13, color: 'var(--tm-grau)' }}>
        {t('Hinweis: Damit Verlage den Link ohne Telemedia-Anmeldung öffnen können, muss Cloudflare Access für das Portal eine Ausnahme haben (siehe Anleitung „Einrichtung Login und Kunden“).', 'Note: Cloudflare Access needs a bypass for the portal (see setup guide).')}
      </p>
    </div>
  )
}
