'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { assetLaden } from '@/lib/db'
import type { Job } from '@/lib/types'
import type { StimmProbe, Storyboard, Szene } from '@/lib/video-types'
import { STANDARDANNEKE_ID, STANDARDANNEKE_NAME } from '@/lib/video-types'
import { mp4Rendern, sfxErzeugen, sprechtextPruefen, ttsAlsAsset } from '@/lib/video-client'
import type { RenderErgebnis } from '@/lib/video-client'
import { videoAbmessungen } from '@/remotion/VideoKomposition'
import HilfePopover from './HilfePopover'
import { useSprache } from './SpracheProvider'

// Der @remotion/player nutzt DOM-APIs beim Import — deshalb dynamic mit ssr:false.
const RemotionPlayer = dynamic(() => import('./RemotionPlayerWrapper'), { ssr: false })

function neuesLeeresStoryboard(): Storyboard {
  return {
    seitenverhaeltnis: '9:16',
    ziellaengeSekunden: 30,
    szenen: [
      { id: crypto.randomUUID(), typ: 'logo-einflug', dauerSekunden: 2, reihenfolge: 0, wooosch: true, hintergrundFarbe: '#0b0b0f' },
      { id: crypto.randomUUID(), typ: 'text-reveal', dauerSekunden: 8, reihenfolge: 1, titel: 'Was heute wichtig ist', aufzaehlung: ['Punkt eins', 'Punkt zwei', 'Punkt drei'], hintergrundFarbe: '#0b0b0f', textFarbe: '#f5f5f7', akzentFarbe: '#60a5fa' },
      { id: crypto.randomUUID(), typ: 'logo-outro', dauerSekunden: 2, reihenfolge: 2, abbinderText: 'Danke fürs Zuschauen.' },
    ],
  }
}

export default function VideoStudio({
  job,
  onJobPatch,
}: {
  job: Job
  onJobPatch: (patch: Partial<Job> | ((alt: Job) => Job)) => void
}) {
  const { sprache } = useSprache()
  const storyboard = job.videoStoryboard || neuesLeeresStoryboard()
  const [voiceoverLaedt, setVoiceoverLaedt] = useState(false)
  const [proben, setProben] = useState<StimmProbe[] | undefined>(storyboard.stimmproben)
  const [probenLaedt, setProbenLaedt] = useState(false)
  const [probenFehler, setProbenFehler] = useState<string | null>(null)
  const [sprechtext, setSprechtext] = useState(storyboard.voiceover?.text || '')
  const [voiceover, setVoiceover] = useState(storyboard.voiceover)
  const [voiceoverFehler, setVoiceoverFehler] = useState<string | null>(null)
  const [pruefbericht, setPruefbericht] = useState<string[]>([])
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({})
  const [renderLaeuft, setRenderLaeuft] = useState(false)
  const [renderErgebnisse, setRenderErgebnisse] = useState<RenderErgebnis[]>([])
  const [renderFehler, setRenderFehler] = useState<string | null>(null)
  const [renderAuswahl, setRenderAuswahl] = useState<Array<'9:16' | '1:1' | '16:9'>>(['9:16'])

  const patch = useCallback(
    (p: Partial<Storyboard>) => {
      const neu: Storyboard = { ...storyboard, ...p }
      onJobPatch((alt) => ({ ...alt, videoStoryboard: neu }))
    },
    [onJobPatch, storyboard],
  )

  const dauerGesamt = useMemo(() => storyboard.szenen.reduce((s, z) => s + z.dauerSekunden, 0), [storyboard])

  // Asset-URLs für alle im Storyboard referenzierten Hashes bereitstellen — der
  // Player braucht echte URLs; wir mappen `asset://<hash>` via ein Interceptor
  // im Wrapper. Wir bauen hier eine Nachschlage-Tabelle.
  useEffect(() => {
    const hashes = new Set<string>()
    for (const s of storyboard.szenen) {
      if ('logoAssetHash' in s && s.logoAssetHash) hashes.add(s.logoAssetHash)
      if ('bildAssetHash' in s && s.bildAssetHash) hashes.add(s.bildAssetHash)
      if ('bildAssetHashes' in s && s.bildAssetHashes) s.bildAssetHashes.forEach((h) => hashes.add(h))
    }
    if (storyboard.voiceover?.assetHash) hashes.add(storyboard.voiceover.assetHash)
    if (proben) proben.forEach((p) => p.assetHash && hashes.add(p.assetHash))

    const eintraege: Record<string, string> = {}
    const revoke: string[] = []
    Promise.all(
      Array.from(hashes).map(async (h) => {
        const a = await assetLaden(h)
        if (a) {
          const url = URL.createObjectURL(a.blob)
          eintraege[h] = url
          revoke.push(url)
        }
      }),
    ).then(() => setAssetUrls(eintraege))

    return () => {
      revoke.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [proben, storyboard.szenen, storyboard.voiceover?.assetHash])

  // Szenen-Aktionen
  const szeneHinzufuegen = (typ: Szene['typ']) => {
    const naechste: Szene =
      typ === 'logo-einflug'
        ? { id: crypto.randomUUID(), typ, dauerSekunden: 2, reihenfolge: storyboard.szenen.length, wooosch: true }
        : typ === 'text-reveal'
          ? { id: crypto.randomUUID(), typ, dauerSekunden: 5, reihenfolge: storyboard.szenen.length, titel: 'Neuer Text', aufzaehlung: [] }
          : typ === 'bild-ken-burns'
            ? { id: crypto.randomUUID(), typ, dauerSekunden: 4, reihenfolge: storyboard.szenen.length, zoomStart: 1.05, zoomEnde: 1.25, richtung: 'zentrum' }
            : typ === 'karussell-swipe'
              ? { id: crypto.randomUUID(), typ, dauerSekunden: 6, reihenfolge: storyboard.szenen.length, bildAssetHashes: [] }
              : { id: crypto.randomUUID(), typ, dauerSekunden: 2, reihenfolge: storyboard.szenen.length, abbinderText: 'Danke fürs Zuschauen.' }
    patch({ szenen: [...storyboard.szenen, naechste] })
  }

  const szeneAktualisieren = (id: string, aend: Partial<Szene>) => {
    patch({ szenen: storyboard.szenen.map((s) => (s.id === id ? ({ ...s, ...aend } as Szene) : s)) })
  }

  const szeneLoeschen = (id: string) => patch({ szenen: storyboard.szenen.filter((s) => s.id !== id).map((s, i) => ({ ...s, reihenfolge: i })) })

  const szeneVerschieben = (id: string, delta: number) => {
    const idx = storyboard.szenen.findIndex((s) => s.id === id)
    if (idx < 0) return
    const neu = [...storyboard.szenen]
    const ziel = Math.max(0, Math.min(neu.length - 1, idx + delta))
    if (ziel === idx) return
    const [entfernt] = neu.splice(idx, 1)
    neu.splice(ziel, 0, entfernt)
    patch({ szenen: neu.map((s, i) => ({ ...s, reihenfolge: i })) })
  }

  // Voiceover erzeugen
  const voiceoverErzeugen = async () => {
    if (!sprechtext.trim()) return
    setVoiceoverLaedt(true)
    setVoiceoverFehler(null)
    try {
      const voiceId = storyboard.gewaehlteStimme || STANDARDANNEKE_ID
      const res = await ttsAlsAsset(sprechtext, voiceId, job.id)
      if (res.fehler || !res.info) {
        setVoiceoverFehler(res.fehler || 'Fehlgeschlagen')
        return
      }
      const info = {
        ...res.info,
        voiceName: voiceId === STANDARDANNEKE_ID ? STANDARDANNEKE_NAME : storyboard.stimmproben?.find((p) => p.voiceId === voiceId)?.name || '',
      }
      setVoiceover(info)
      patch({ voiceover: info })
    } catch (e) {
      setVoiceoverFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setVoiceoverLaedt(false)
    }
  }

  // Stimmproben (3F + 3M) mit gemeinsamem Text
  const stimmprobenErzeugen = async () => {
    if (!sprechtext.trim()) return
    setProbenLaedt(true)
    setProbenFehler(null)
    try {
      const voices = await fetch('/api/tts-voices').then((r) => r.json())
      if (!voices.ok) throw new Error(voices.fehler || 'Voices konnten nicht geladen werden')
      type VoiceRaw = { voice_id: string; name: string; labels?: Record<string, string> }
      const alle = (voices.voices as VoiceRaw[]) || []
      const filtern = (geschlecht: 'female' | 'male') =>
        alle.filter((v) => {
          const l = v.labels || {}
          const lang = (l.language || '').toLowerCase()
          const acc = (l.accent || '').toLowerCase()
          const g = (l.gender || '').toLowerCase()
          if (g !== geschlecht) return false
          if (lang && lang !== 'de' && lang !== 'german' && !lang.includes('german')) return false
          if (acc.includes('bayern') || acc.includes('bavaria')) return false
          return true
        })
      const frauen = filtern('female').slice(0, 3)
      const maenner = filtern('male').slice(0, 3)
      const auswahl = [
        ...frauen.map((v) => ({ voice_id: v.voice_id, name: v.name, geschlecht: 'weiblich' as const })),
        ...maenner.map((v) => ({ voice_id: v.voice_id, name: v.name, geschlecht: 'maennlich' as const })),
      ]

      const proben: StimmProbe[] = []
      for (const stimme of auswahl) {
        const res = await ttsAlsAsset(sprechtext, stimme.voice_id, job.id)
        proben.push({
          id: crypto.randomUUID(),
          voiceId: stimme.voice_id,
          name: stimme.name,
          geschlecht: stimme.geschlecht,
          assetHash: res.info?.assetHash,
          text: sprechtext,
        })
      }
      setProben(proben)
      patch({ stimmproben: proben })
    } catch (e) {
      setProbenFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setProbenLaedt(false)
    }
  }

  const wooschErzeugen = async () => {
    const einflug = storyboard.szenen.find((s) => s.typ === 'logo-einflug')
    if (!einflug) return
    const res = await sfxErzeugen({
      prompt: 'Cinematic whoosh, deep and full, no hissing, ends abruptly, 2 seconds',
      dauerSekunden: einflug.dauerSekunden,
      jobId: job.id,
    })
    if (res.hash) {
      patch({ szenen: storyboard.szenen.map((s) => (s.id === einflug.id ? ({ ...s, logoAssetHash: (s as any).logoAssetHash } as Szene) : s)) })
    }
  }

  const pruefen = () => {
    const folientexte: string[] = []
    for (const s of storyboard.szenen) {
      if ('titel' in s && (s as any).titel) folientexte.push((s as any).titel)
      if ('aufzaehlung' in s && (s as any).aufzaehlung) folientexte.push(...(s as any).aufzaehlung)
      if ('abbinderText' in s && (s as any).abbinderText) folientexte.push((s as any).abbinderText)
      if ('overlayText' in s && (s as any).overlayText) folientexte.push((s as any).overlayText)
    }
    const bericht: string[] = []
    if (voiceover?.text) {
      const p = sprechtextPruefen(voiceover.text, folientexte, storyboard.ziellaengeSekunden || dauerGesamt)
      bericht.push(...p.hinweise)
      // Sync-Check: Voiceover-Ende vs. Video-Ende (≤ 50 ms)
      if (voiceover.dauerSekunden !== undefined) {
        const diffMs = Math.round(Math.abs(dauerGesamt - voiceover.dauerSekunden - 2.3) * 1000)
        if (diffMs > 50) {
          bericht.push(`⚠ Voiceover-Ende weicht ${diffMs} ms vom Video-Ende ab (Ziel ≤ 50 ms). Dauern der Szenen anpassen.`)
        }
      }
    }
    // Umlaut-Check auf allen Text-Feldern
    for (const t of folientexte) {
      if (/(ae|oe|ue|ss)(?=[a-z])/.test(t.toLowerCase())) {
        bericht.push(`⚠ Ersatzschreibung entdeckt: „${t}" — bitte echte Umlaute / ß verwenden.`)
      }
    }
    if (storyboard.seitenverhaeltnis === '9:16') {
      bericht.push(`ℹ 9:16 Safe-Zones: Untertitel ≤ 1610 px (unten), Kopfbereich ≥ 250 px (oben).`)
    }
    if (!bericht.length) bericht.push('✓ Alles im grünen Bereich.')
    setPruefbericht(bericht)
  }

  const mp4Erzeugen = async () => {
    setRenderLaeuft(true)
    setRenderFehler(null)
    setRenderErgebnisse([])
    try {
      const antwort = await mp4Rendern({
        storyboard,
        seitenverhaeltnisse: renderAuswahl,
        dateiname: (job.titel || 'reel').toLowerCase().replace(/\s+/g, '-'),
        jobId: job.id,
      })
      if (!antwort.ok || !antwort.ergebnisse) {
        setRenderFehler(typeof antwort.fehler === 'string' ? antwort.fehler : JSON.stringify(antwort.fehler))
      } else {
        setRenderErgebnisse(antwort.ergebnisse)
        if (Array.isArray(antwort.fehler)) {
          setRenderFehler(antwort.fehler.map((f) => `${f.ratio}: ${f.fehler}`).join(' · '))
        }
      }
    } catch (e) {
      setRenderFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setRenderLaeuft(false)
    }
  }

  const dims = videoAbmessungen(storyboard.seitenverhaeltnis)
  const playerBreite = 320
  const playerHoehe = Math.round((dims.hoehe / dims.breite) * playerBreite)
  const dauerFrames = Math.max(30, Math.round(dauerGesamt * 30))

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{sprache === 'de' ? '🎬 Video-Studio' : '🎬 Video studio'}</span>
        <HilfePopover
          de={'Fünf Szenen-Templates: Logo-Einflug (2 s + Woooosch), Text-Reveal (Aufzählung fliegt synchron zur Stimme), Bild-Ken-Burns, Karussell, Logo-Outro. Stimme Anneke ist Standard; Stimmproben-Knopf liefert 3+3 Alternativen. Prüfbericht vor Export prüft Sync, Untertitel-Safe-Zone, echte Umlaute und die Regel „nicht ablesen". MP4 rendert lokal (Remotion + headless Chrome).'}
          en={'Five templates: logo intro (2 s + whoosh), text reveal (bullets synced to voice), image Ken Burns, carousel, logo outro. Anneke is the default voice; sample button gives 3+3 options. Pre-export check verifies sync, subtitle safe-zone, real umlauts and the „do not read" rule. MP4 renders locally (Remotion + headless Chrome).'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `${playerBreite}px 1fr`, gap: 16, alignItems: 'start' }}>
        <div>
          <RemotionPlayer
            storyboard={storyboard}
            breite={playerBreite}
            hoehe={playerHoehe}
            dauerFrames={dauerFrames}
            assetUrls={assetUrls}
          />
          <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6, textAlign: 'center' }}>
            {storyboard.seitenverhaeltnis} · {dauerGesamt.toFixed(1)} s
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <select
            value={storyboard.seitenverhaeltnis}
            onChange={(e) => patch({ seitenverhaeltnis: e.target.value as Storyboard['seitenverhaeltnis'] })}
            style={styleInput}
          >
            <option value="9:16">9:16 (Reel, Story, TikTok)</option>
            <option value="1:1">1:1</option>
            <option value="16:9">16:9</option>
          </select>

          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {(['logo-einflug', 'text-reveal', 'bild-ken-burns', 'karussell-swipe', 'logo-outro'] as Szene['typ'][]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => szeneHinzufuegen(t)}
                style={{ ...styleKnopf, fontSize: 11 }}
              >
                + {t}
              </button>
            ))}
          </div>

          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {storyboard.szenen.map((s, idx) => (
              <li
                key={s.id}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6,
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
                  <span style={{ opacity: 0.5 }}>#{idx + 1}</span>
                  <strong style={{ flex: 1 }}>{s.typ}</strong>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={s.dauerSekunden}
                    onChange={(e) => szeneAktualisieren(s.id, { dauerSekunden: parseFloat(e.target.value) || 1 })}
                    style={{ ...styleInput, width: 60, padding: '3px 6px' }}
                  />
                  <span style={{ opacity: 0.55 }}>s</span>
                  <button type="button" onClick={() => szeneVerschieben(s.id, -1)} style={styleKleiner}>↑</button>
                  <button type="button" onClick={() => szeneVerschieben(s.id, 1)} style={styleKleiner}>↓</button>
                  <button type="button" onClick={() => szeneLoeschen(s.id)} style={{ ...styleKleiner, color: '#fca5a5' }}>✕</button>
                </div>
                {s.typ === 'text-reveal' && (
                  <>
                    <input
                      type="text"
                      value={(s as any).titel || ''}
                      placeholder="Titel"
                      onChange={(e) => szeneAktualisieren(s.id, { titel: e.target.value } as any)}
                      style={styleInput}
                    />
                    <textarea
                      rows={3}
                      value={((s as any).aufzaehlung || []).join('\n')}
                      placeholder="Aufzählung (eine Zeile = ein Punkt)"
                      onChange={(e) => szeneAktualisieren(s.id, { aufzaehlung: e.target.value.split('\n').filter(Boolean) } as any)}
                      style={{ ...styleInput, resize: 'vertical', minHeight: 60 }}
                    />
                  </>
                )}
                {s.typ === 'logo-outro' && (
                  <input
                    type="text"
                    value={(s as any).abbinderText || ''}
                    placeholder="Abbinder-Text"
                    onChange={(e) => szeneAktualisieren(s.id, { abbinderText: e.target.value } as any)}
                    style={styleInput}
                  />
                )}
                {s.typ === 'bild-ken-burns' && (
                  <input
                    type="text"
                    value={(s as any).overlayText || ''}
                    placeholder="Overlay-Text (optional)"
                    onChange={(e) => szeneAktualisieren(s.id, { overlayText: e.target.value } as any)}
                    style={styleInput}
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <details open>
        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: 0.85 }}>
          {sprache === 'de' ? '🎙 Voiceover' : '🎙 Voiceover'}
        </summary>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            rows={4}
            value={sprechtext}
            onChange={(e) => setSprechtext(e.target.value)}
            placeholder={sprache === 'de'
              ? 'Sprechtext (nicht ablesen, was im Bild steht — höchstens 4 Wörter am Stück)'
              : 'Voiceover text (do not read the on-screen text — max 4 words in a row)'}
            style={{ ...styleInput, resize: 'vertical', minHeight: 80 }}
          />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 11, opacity: 0.75 }}>
              {sprache === 'de' ? 'Ziellänge (s)' : 'Target length (s)'}
              <input
                type="number"
                min={5}
                value={storyboard.ziellaengeSekunden || 30}
                onChange={(e) => patch({ ziellaengeSekunden: parseInt(e.target.value, 10) })}
                style={{ ...styleInput, marginLeft: 6, width: 70 }}
              />
            </label>
            <span style={{ fontSize: 11, opacity: 0.55 }}>
              {sprache === 'de' ? 'Geschätzt' : 'Estimated'}: {(sprechtext.split(/\s+/).filter(Boolean).length / 2.5).toFixed(1)} s
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" onClick={voiceoverErzeugen} disabled={voiceoverLaedt || !sprechtext.trim()} style={{ ...styleKnopfPrimaer }}>
              {voiceoverLaedt ? '…' : sprache === 'de' ? 'Voiceover erzeugen (Anneke)' : 'Generate voiceover (Anneke)'}
            </button>
            <button type="button" onClick={stimmprobenErzeugen} disabled={probenLaedt || !sprechtext.trim()} style={styleKnopf}>
              {probenLaedt ? '…' : sprache === 'de' ? 'Stimmproben (3+3)' : 'Voice samples (3+3)'}
            </button>
            <button type="button" onClick={wooschErzeugen} style={styleKnopf}>
              {sprache === 'de' ? 'Woooosch erzeugen (2 s)' : 'Whoosh (2 s)'}
            </button>
          </div>
          {voiceoverFehler && <p style={{ margin: 0, fontSize: 11, color: '#fecaca' }}>⚠ {voiceoverFehler}</p>}
          {voiceover?.assetHash && assetUrls[voiceover.assetHash] && (
            <audio controls src={assetUrls[voiceover.assetHash]} style={{ width: '100%' }} />
          )}
          {proben && proben.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 6 }}>
              {proben.map((p) => (
                <div key={p.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 10, opacity: 0.55 }}>{p.geschlecht}</div>
                  {p.assetHash && assetUrls[p.assetHash] && <audio controls src={assetUrls[p.assetHash]} style={{ width: '100%' }} />}
                  <button
                    type="button"
                    onClick={() => patch({ gewaehlteStimme: p.voiceId })}
                    style={{
                      background: storyboard.gewaehlteStimme === p.voiceId ? '#f5f5f7' : 'transparent',
                      color: storyboard.gewaehlteStimme === p.voiceId ? '#0b0b0f' : '#f5f5f7',
                      border: '1px solid rgba(255,255,255,0.15)',
                      padding: '4px 10px',
                      borderRadius: 5,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {storyboard.gewaehlteStimme === p.voiceId ? '✓' : sprache === 'de' ? 'Nehmen' : 'Use'}
                  </button>
                </div>
              ))}
            </div>
          )}
          {probenFehler && <p style={{ margin: 0, fontSize: 11, color: '#fecaca' }}>⚠ {probenFehler}</p>}
        </div>
      </details>

      <details>
        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: 0.85 }}>
          {sprache === 'de' ? '✅ Prüfbericht' : '✅ Check report'}
        </summary>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button type="button" onClick={pruefen} style={styleKnopf}>
            {sprache === 'de' ? 'Vor Export prüfen' : 'Run pre-export checks'}
          </button>
          {pruefbericht.length > 0 && (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {pruefbericht.map((h, i) => (
                <li key={i} style={{ fontSize: 12, padding: '5px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: 5, color: h.startsWith('⚠') ? '#fecaca' : h.startsWith('ℹ') ? '#93c5fd' : '#86efac' }}>
                  {h}
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      <details open>
        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: 0.85 }}>
          {sprache === 'de' ? '💾 MP4 erzeugen' : '💾 Render MP4'}
        </summary>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
          <p style={{ margin: 0, opacity: 0.75 }}>
            {sprache === 'de'
              ? 'Der Render läuft lokal (per Remotion + headless Chrome). Beim ersten Aufruf dauert das Bundling ca. 30–60 s, danach ist es schnell.'
              : 'Render runs locally (Remotion + headless Chrome). First bundle takes ~30–60 s, then it is fast.'}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11 }}>
            {(['9:16', '1:1', '16:9'] as const).map((r) => (
              <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="checkbox"
                  checked={renderAuswahl.includes(r)}
                  onChange={(e) => {
                    setRenderAuswahl((alt) => (e.target.checked ? Array.from(new Set([...alt, r])) : alt.filter((x) => x !== r)))
                  }}
                />
                {r}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={mp4Erzeugen}
            disabled={renderLaeuft || renderAuswahl.length === 0}
            style={{ ...styleKnopfPrimaer, alignSelf: 'flex-start' }}
          >
            {renderLaeuft
              ? sprache === 'de'
                ? 'Rendere …'
                : 'Rendering …'
              : sprache === 'de'
                ? 'MP4 erzeugen'
                : 'Render MP4'}
          </button>
          {renderFehler && <p style={{ margin: 0, fontSize: 11, color: '#fecaca' }}>⚠ {renderFehler}</p>}
          {renderErgebnisse.length > 0 && (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {renderErgebnisse.map((r) => (
                <li
                  key={r.dateiname}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 5,
                    padding: '6px 10px',
                  }}
                >
                  <span style={{ fontSize: 11 }}>
                    {r.ratio} · {(r.bytes / (1024 * 1024)).toFixed(2)} MB
                  </span>
                  <a
                    href={r.download}
                    download={r.dateiname}
                    style={{
                      background: '#f5f5f7',
                      color: '#0b0b0f',
                      textDecoration: 'none',
                      padding: '3px 10px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {sprache === 'de' ? 'Herunterladen' : 'Download'}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p style={{ margin: 0, opacity: 0.55, fontSize: 11 }}>
            {sprache === 'de'
              ? 'Die MP4 liegen zusätzlich im Ordner out/. Für Cloudflare-Deploy: der Render läuft nur lokal — auf dem Worker fehlt Chromium.'
              : 'MP4 files are also written to out/. Cloudflare deployment: render only works locally — Workers has no local Chromium.'}
          </p>
        </div>
      </details>
    </section>
  )
}

const styleInput: React.CSSProperties = {
  background: 'rgba(0,0,0,0.35)',
  color: '#f5f5f7',
  border: '1px solid rgba(255,255,255,0.14)',
  padding: '6px 10px',
  borderRadius: 5,
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
}
const styleKnopf: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  color: '#f5f5f7',
  border: '1px solid rgba(255,255,255,0.15)',
  padding: '6px 12px',
  borderRadius: 5,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}
const styleKnopfPrimaer: React.CSSProperties = {
  ...styleKnopf,
  background: '#f5f5f7',
  color: '#0b0b0f',
}
const styleKleiner: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#f5f5f7',
  padding: '2px 6px',
  borderRadius: 3,
  fontSize: 11,
  cursor: 'pointer',
}
