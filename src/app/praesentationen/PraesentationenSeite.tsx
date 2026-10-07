'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import HandbuchKnopf from '@/components/HandbuchKnopf'
import SpracheUmschalter from '@/components/SpracheUmschalter'

type Eintrag = { verlag?: string; azsCent: number; rspShare: number }
type Modus = 'einzel' | 'verlage' | 'varianten'

function parseCsv(input: string, mitVerlag: boolean): Eintrag[] {
  return input
    .split(/\r?\n/)
    .map((zeile) => zeile.trim())
    .filter((zeile) => zeile && !zeile.startsWith('#'))
    .map((zeile) => {
      const teile = zeile.split(/[;,\t]/).map((t) => t.trim())
      if (mitVerlag) {
        if (teile.length < 3) throw new Error(`Zeile unvollständig: ${zeile}`)
        return { verlag: teile[0], azsCent: Number(teile[1]), rspShare: Number(teile[2]) }
      }
      if (teile.length < 2) throw new Error(`Zeile unvollständig: ${zeile}`)
      return { azsCent: Number(teile[0]), rspShare: Number(teile[1]) }
    })
}

export default function PraesentationenSeite() {
  const { T } = useSprache()
  const [modus, setModus] = useState<Modus>('einzel')
  const [verlag, setVerlag] = useState('')
  const [azs, setAzs] = useState(33)
  const [rsp, setRsp] = useState(70)
  const [csv, setCsv] = useState('')
  const [ohneNotizen, setOhneNotizen] = useState(false)
  const [mitPdf, setMitPdf] = useState(false)
  const [lade, setLade] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function erzeugen() {
    setFehler(null)
    setLade(true)
    try {
      let eintraege: Eintrag[] = []
      if (modus === 'einzel') {
        if (!(azs > 0 && azs < 100) || !(rsp > 0 && rsp < 100)) throw new Error('Konditionen bitte in Cent / Prozent angeben (1–99).')
        eintraege = [{ verlag: verlag.trim() || undefined, azsCent: azs, rspShare: rsp }]
      } else {
        eintraege = parseCsv(csv, modus === 'verlage')
      }
      const res = await fetch('/api/praesentation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ modus, eintraege, ohneNotizen, pdf: mitPdf }),
      })
      if (!res.ok) {
        const txt = await res.text()
        try {
          const j = JSON.parse(txt) as { fehler?: string }
          throw new Error(j.fehler || txt)
        } catch {
          throw new Error(txt || `HTTP ${res.status}`)
        }
      }
      const blob = await res.blob()
      const dateiname = res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] || 'Gewinnspielplan_2027.zip'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = dateiname
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (e) {
      setFehler((e as Error).message)
    } finally {
      setLade(false)
    }
  }

  const kopfKnopf = { color: '#1d1d1f', textDecoration: 'none', fontSize: 12, padding: '5px 10px', border: '1px solid #D2D4DC', borderRadius: 6, background: '#ffffff' } as const
  const label = { fontSize: 13, fontWeight: 700, display: 'block', margin: '12px 0 4px' } as const
  const input = { width: '100%', padding: '8px 10px', border: '1px solid #D2D4DC', borderRadius: 6, fontSize: 14 } as const

  return (
    <div style={{ minHeight: '100dvh', background: '#ffffff', color: '#1d1d1f', fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      <header style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ECEEF2' }}>
        <Link href="/" style={{ ...kopfKnopf }} aria-label="Zurück zur Startseite">← {T('startUebersicht')}</Link>
        <div style={{ display: 'flex', gap: 8 }}><HandbuchKnopf anker="praesentationen" /><SpracheUmschalter /></div>
      </header>
      <main style={{ maxWidth: 920, margin: '24px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: 28, margin: '8px 0 4px' }}>{T('praesTitel')}</h1>
        <p style={{ color: '#4E5260', margin: '0 0 16px' }}>{T('praesUntertitel')}</p>

        <div role="tablist" aria-label="Modus" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
          {(['einzel', 'verlage', 'varianten'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={modus === m}
              onClick={() => setModus(m)}
              style={{
                padding: '8px 14px', borderRadius: 6, border: '1px solid #D2D4DC',
                background: modus === m ? '#1C1B22' : '#ffffff',
                color: modus === m ? '#ffffff' : '#1d1d1f', fontSize: 13, cursor: 'pointer',
              }}
            >
              {T(('praesModus' + m.charAt(0).toUpperCase() + m.slice(1)) as 'praesModusEinzel')}
            </button>
          ))}
        </div>

        {modus === 'einzel' && (
          <section>
            <label style={label}>{T('praesVerlag')}</label>
            <input style={input} value={verlag} onChange={(e) => setVerlag(e.target.value)} placeholder="z. B. SWMH-Gruppe" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={label}>{T('praesAzs')}</label><input style={input} type="number" min={1} max={99} value={azs} onChange={(e) => setAzs(Number(e.target.value))} /></div>
              <div><label style={label}>{T('praesRsp')}</label><input style={input} type="number" min={1} max={99} value={rsp} onChange={(e) => setRsp(Number(e.target.value))} /></div>
            </div>
          </section>
        )}

        {modus === 'verlage' && (
          <section>
            <label style={label}>{T('praesHinweisCsv')}</label>
            <textarea style={{ ...input, minHeight: 160, fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={'SWMH;33;70\nIppen;28;50\nFunke Thüringen;30;60'} />
          </section>
        )}

        {modus === 'varianten' && (
          <section>
            <label style={label}>{T('praesHinweisVarianten')}</label>
            <textarea style={{ ...input, minHeight: 160, fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={'26;60\n32;50\n33;70'} />
          </section>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 4px' }}>
          <input type="checkbox" checked={ohneNotizen} onChange={(e) => setOhneNotizen(e.target.checked)} /> {T('praesOhneNotizen')}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px' }}>
          <input type="checkbox" checked={mitPdf} onChange={(e) => setMitPdf(e.target.checked)} /> {T('praesMitPdf')}
        </label>

        <button
          onClick={erzeugen}
          disabled={lade}
          style={{
            padding: '12px 20px', borderRadius: 8, border: 'none',
            background: lade ? '#9A9CA3' : '#C8102E', color: '#ffffff', fontSize: 15, fontWeight: 700, cursor: lade ? 'wait' : 'pointer',
          }}
        >
          {lade ? T('praesLade') : modus === 'einzel' ? T('praesErzeugen') : T('praesErzeugeMehrere')}
        </button>

        {fehler && (
          <div role="alert" style={{ marginTop: 16, padding: 12, background: '#FBE9EC', border: '1px solid #C8102E', color: '#8E0A20', borderRadius: 6, fontSize: 13 }}>
            <b>{T('praesFehler')}:</b> {fehler}
          </div>
        )}
      </main>
    </div>
  )
}
