'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import HandbuchKnopf from '@/components/HandbuchKnopf'
import SpracheUmschalter from '@/components/SpracheUmschalter'
import { useSprache } from '@/components/SpracheProvider'

type Korrektur = {
  id: string
  grp: string
  paper: string
  variant: string
  winner: string
  kategorie: string
  status: string
  text: string
  autor: string
  ts: number
}

type Einordnung = {
  id: string
  feld: 'frage' | 'antwort' | 'name' | 'ort' | 'telefon' | 'logo' | 'tnb' | 'format' | 'unklar'
  ziel: { zeitung?: string; monat?: string; spieltag?: number; vorschlag?: 'A' | 'B' | 'C' }
  sicherheit: number
  automatisch: boolean
  begruendung: string
}

const SPEICHER = 'content-creator-2026:korrekturen-status'
type GespeicherterStatus = Record<string, 'offen' | 'erledigt' | 'ignoriert' | 'rueckfrage'>

function statusLaden(): GespeicherterStatus {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(SPEICHER) ?? '{}') as GespeicherterStatus } catch { return {} }
}
function statusSpeichern(s: GespeicherterStatus) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SPEICHER, JSON.stringify(s))
}

export default function KorrekturenSeite() {
  const { T } = useSprache()
  const [liste, setListe] = useState<Korrektur[]>([])
  const [einordnungen, setEinordnungen] = useState<Record<string, Einordnung>>({})
  const [status, setStatus] = useState<GespeicherterStatus>({})
  const [fehler, setFehler] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(false)
  const [sortiert, setSortiert] = useState<'alle' | 'offen' | 'erledigt' | 'rueckfrage'>('offen')

  useEffect(() => { setStatus(statusLaden()) }, [])

  const laden = useCallback(async () => {
    setLaedt(true); setFehler(null)
    try {
      const res = await fetch('/api/korrekturen', { cache: 'no-store' })
      const data = (await res.json()) as { korrekturen?: Korrektur[]; fehler?: string }
      if (!res.ok || !data.korrekturen) throw new Error(data.fehler || `HTTP ${res.status}`)
      setListe(data.korrekturen)
    } catch (e) { setFehler((e as Error).message) }
    finally { setLaedt(false) }
  }, [])

  useEffect(() => { laden() }, [laden])

  const einordnen = useCallback(async () => {
    if (!liste.length) return
    setLaedt(true); setFehler(null)
    try {
      const res = await fetch('/api/korrekturen/einordnen', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ korrekturen: liste }),
      })
      const data = (await res.json()) as { einordnungen?: Einordnung[]; fehler?: string }
      if (!res.ok || !data.einordnungen) throw new Error(data.fehler || `HTTP ${res.status}`)
      const map: Record<string, Einordnung> = {}
      data.einordnungen.forEach((e) => { map[e.id] = e })
      setEinordnungen(map)
    } catch (e) { setFehler((e as Error).message) }
    finally { setLaedt(false) }
  }, [liste])

  const setzeStatus = (id: string, s: GespeicherterStatus[string]) => {
    const neu = { ...status, [id]: s }
    setStatus(neu); statusSpeichern(neu)
  }

  const gefiltert = useMemo(() => {
    const aktuell = (id: string) => status[id] ?? 'offen'
    return sortiert === 'alle' ? liste : liste.filter((k) => aktuell(k.id) === sortiert)
  }, [liste, status, sortiert])

  const kopfKnopf = { color: '#1d1d1f', textDecoration: 'none', fontSize: 12, padding: '5px 10px', border: '1px solid #D2D4DC', borderRadius: 6, background: '#ffffff' } as const
  const tag = (bg: string, color: string) => ({ display: 'inline-block', padding: '2px 7px', borderRadius: 10, background: bg, color, fontSize: 11, fontWeight: 700 } as const)

  return (
    <div style={{ minHeight: '100dvh', background: '#ffffff', color: '#1d1d1f', fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      <header style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ECEEF2' }}>
        <Link href="/erweitert" style={{ ...kopfKnopf }}>← {T('startUebersicht')}</Link>
        <div style={{ display: 'flex', gap: 8 }}><HandbuchKnopf anker="korrekturen" /><SpracheUmschalter /></div>
      </header>
      <main style={{ maxWidth: 1100, margin: '24px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: 28, margin: '8px 0 4px' }}>{T('korrTitel')}</h1>
        <p style={{ color: '#4E5260', margin: '0 0 16px' }}>{T('korrUntertitel')}</p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
          <button onClick={laden} disabled={laedt} style={{ ...kopfKnopf, cursor: laedt ? 'wait' : 'pointer' }}>{T('korrNeuLaden')}</button>
          <button onClick={einordnen} disabled={laedt || !liste.length} style={{ ...kopfKnopf, cursor: laedt ? 'wait' : 'pointer' }}>{T('korrEinordnen')}</button>
          <div role="tablist" aria-label="Filter" style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            {(['offen', 'rueckfrage', 'erledigt', 'alle'] as const).map((s) => (
              <button key={s} onClick={() => setSortiert(s)} style={{ ...kopfKnopf, background: sortiert === s ? '#1C1B22' : '#ffffff', color: sortiert === s ? '#ffffff' : '#1d1d1f' }}>
                {T(('korrFilter' + s.charAt(0).toUpperCase() + s.slice(1)) as 'korrFilterOffen')}
              </button>
            ))}
          </div>
        </div>

        {fehler && <div role="alert" style={{ padding: 12, background: '#FBE9EC', border: '1px solid #C8102E', color: '#8E0A20', borderRadius: 6, fontSize: 13, marginBottom: 16 }}><b>{T('korrFehler')}:</b> {fehler}</div>}

        {!liste.length && !laedt && !fehler && (
          <div style={{ padding: 16, border: '1px dashed #D2D4DC', borderRadius: 8, color: '#4E5260', fontSize: 13 }}>
            {T('korrKeine')}
          </div>
        )}

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {gefiltert.map((k) => {
            const e = einordnungen[k.id]
            const aktuell = status[k.id] ?? 'offen'
            const istOk = k.status === 'ok'
            const istTnb = e?.feld === 'tnb' || e?.feld === 'telefon'
            return (
              <li key={k.id} style={{ padding: 14, border: '1px solid #ECEEF2', borderRadius: 8, marginBottom: 10, background: '#FAFBFC' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                  <span style={tag('#1C1B22', '#ffffff')}>{k.grp}</span>
                  <span style={tag('#ECEEF2', '#1d1d1f')}>V{k.variant} · {k.winner}</span>
                  {k.kategorie && <span style={tag('#64748B', '#ffffff')}>{k.kategorie}</span>}
                  {istOk ? <span style={tag('#22C55E', '#ffffff')}>passt so</span> : <span style={tag('#F59E0B', '#ffffff')}>Änderung</span>}
                  <span style={{ marginLeft: 'auto', color: '#64748B', fontSize: 11 }}>{new Date(k.ts).toLocaleString('de-DE')}</span>
                </div>
                <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{k.paper}</div>
                <div style={{ fontSize: 14, marginBottom: 8 }}>{k.text || <em style={{ color: '#64748B' }}>(ohne Text)</em>}</div>
                <div style={{ fontSize: 12, color: '#4E5260', marginBottom: 6 }}>— {k.autor || 'anonym'}</div>

                {e && (
                  <div style={{ padding: 10, border: '1px solid #D2D4DC', borderRadius: 6, background: '#ffffff', marginBottom: 8, fontSize: 13 }}>
                    <b>Zuordnung:</b> {e.feld}{' '}
                    {e.ziel.zeitung && <>· Zeitung {e.ziel.zeitung} </>}
                    {e.ziel.monat && <>· {e.ziel.monat} </>}
                    {e.ziel.spieltag && <>· Spieltag {e.ziel.spieltag} </>}
                    {e.ziel.vorschlag && <>· Vorschlag {e.ziel.vorschlag} </>}
                    · Sicherheit {Math.round(e.sicherheit * 100)}%
                    {' '}
                    {istTnb ? <span style={tag('#C8102E', '#ffffff')}>nur manuell</span> : (e.automatisch ? <span style={tag('#22C55E', '#ffffff')}>automatisch</span> : <span style={tag('#F59E0B', '#ffffff')}>Rückfrage</span>)}
                    <div style={{ color: '#64748B', marginTop: 4 }}>{e.begruendung}</div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => setzeStatus(k.id, 'erledigt')} disabled={aktuell === 'erledigt'} style={{ ...kopfKnopf, background: aktuell === 'erledigt' ? '#22C55E' : '#ffffff', color: aktuell === 'erledigt' ? '#ffffff' : '#1d1d1f' }}>{T('korrErledigt')}</button>
                  <button onClick={() => setzeStatus(k.id, 'rueckfrage')} disabled={aktuell === 'rueckfrage'} style={{ ...kopfKnopf, background: aktuell === 'rueckfrage' ? '#F59E0B' : '#ffffff', color: aktuell === 'rueckfrage' ? '#ffffff' : '#1d1d1f' }}>{T('korrRueckfrage')}</button>
                  <button onClick={() => setzeStatus(k.id, 'ignoriert')} disabled={aktuell === 'ignoriert'} style={{ ...kopfKnopf }}>{T('korrIgnorieren')}</button>
                  <button onClick={() => setzeStatus(k.id, 'offen')} style={{ ...kopfKnopf }}>{T('korrZurueck')}</button>
                </div>
              </li>
            )
          })}
        </ul>
      </main>
    </div>
  )
}
