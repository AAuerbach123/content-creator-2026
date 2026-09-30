'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
import { assetLaden, assetSpeichern, vorlageSpeichern, vorlagenLaden } from '@/lib/db'
import { copyErzeugen, dialogAufrufen, jobFuerPrompt } from '@/lib/dialog-client'
import { assetRefSicherstellen, ebeneAktualisieren } from '@/lib/artefakt'
import { farbschemaAusBlob } from '@/lib/farbschema'
import { pruefePrint, type PruefHinweis } from '@/lib/pruefungen'
import type { Artefakt, EigeneVorlage, Job } from '@/lib/types'
import { useSprache } from './SpracheProvider'

// Sammelpanel für die kleinen Grafiker-Werkzeuge: QR-Code, UTM-Link,
// Farbschema-Extraktor aus Vorlage, Prüfbericht, Alt-Text-Generator,
// Hashtag-Radar, Vorlagen-Bibliothek, Notizen.

export default function WerkzeugePanel({
  job,
  artefakt,
  onJobPatch,
  onArtefaktPatch,
}: {
  job: Job
  artefakt?: Artefakt
  onJobPatch: (p: Partial<Job>) => void
  onArtefaktPatch?: (neu: Artefakt) => void
}) {
  const { sprache } = useSprache()
  const [notiz, setNotiz] = useState('')
  const [qrText, setQrText] = useState('https://')
  const [qrFehler, setQrFehler] = useState<string | null>(null)
  const [utm, setUtm] = useState({ url: 'https://', source: 'zeitung', medium: 'anzeige', campaign: job.titel, content: '' })
  const [pruefergebnis, setPruefergebnis] = useState<PruefHinweis[]>([])
  const [farbschema, setFarbschema] = useState<string[]>([])
  const [altText, setAltText] = useState<string | null>(null)
  const [altLaedt, setAltLaedt] = useState(false)
  const [hashtags, setHashtags] = useState<string[]>(job.hashtags || [])
  const [hashtagsLaedt, setHashtagsLaedt] = useState(false)
  const [vorlagen, setVorlagen] = useState<EigeneVorlage[]>([])
  const [uebersetzung, setUebersetzung] = useState<string | null>(null)

  const notizHinzufuegen = () => {
    if (!notiz.trim()) return
    onJobPatch({ notizen: [...(job.notizen || []), { id: crypto.randomUUID(), text: notiz.trim(), erstelltAm: Date.now() }] })
    setNotiz('')
  }

  const qrErzeugen = async () => {
    if (!artefakt || !onArtefaktPatch) return
    setQrFehler(null)
    try {
      const svg = await QRCode.toString(qrText, { type: 'svg', margin: 1, width: 400 })
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const hash = await assetSpeichern(blob)
      let neu = artefakt
      // Wenn keine Logo-Ebene existiert, fügen wir ein QR-Feld unten rechts an
      const hatQr = neu.ebenen.find((e) => e.name === 'QR')
      if (hatQr) {
        neu = ebeneAktualisieren(neu, hatQr.id, { assetHash: hash })
      } else {
        const size = Math.min(neu.breite, neu.hoehe) * 0.15
        neu = {
          ...neu,
          ebenen: [
            ...neu.ebenen,
            {
              id: crypto.randomUUID(),
              typ: 'bild',
              name: 'QR',
              x: neu.breite - size - Math.max(6, neu.breite * 0.02),
              y: neu.hoehe - size - Math.max(6, neu.hoehe * 0.02),
              breite: size,
              hoehe: size,
              eigenschaften: { fuellFarbe: '#ffffff' },
              assetHash: hash,
              sichtbar: true,
            },
          ],
        }
      }
      onArtefaktPatch(assetRefSicherstellen(neu, hash))
    } catch (e) {
      setQrFehler(e instanceof Error ? e.message : String(e))
    }
  }

  const utmBauen = () => {
    const params = new URLSearchParams()
    if (utm.source) params.set('utm_source', utm.source)
    if (utm.medium) params.set('utm_medium', utm.medium)
    if (utm.campaign) params.set('utm_campaign', utm.campaign)
    if (utm.content) params.set('utm_content', utm.content)
    const trenner = utm.url.includes('?') ? '&' : '?'
    return `${utm.url}${trenner}${params.toString()}`
  }

  const pruefen = () => {
    if (!artefakt) return
    setPruefergebnis(pruefePrint(artefakt))
  }

  const farbschemaExtrahieren = async () => {
    if (!job.vorlageRef) return
    const asset = await assetLaden(job.vorlageRef)
    if (!asset) return
    const farben = await farbschemaAusBlob(asset.blob, 5)
    setFarbschema(farben)
  }

  const altTextErzeugen = async () => {
    if (!artefakt) return
    const bgEbene = artefakt.ebenen.find((e) => e.typ === 'bild' && e.assetHash)
    if (!bgEbene?.assetHash) return
    const asset = await assetLaden(bgEbene.assetHash)
    if (!asset) return
    setAltLaedt(true)
    try {
      const buf = await asset.blob.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let bin = ''
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
      const base64 = btoa(bin)
      // Wir missbrauchen /api/analyze-template — für Alt-Text reicht die Kurzbeschreibung im „bemerkungen"-Feld.
      const antwortRaw = await fetch('/api/analyze-template', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ base64, mediaType: asset.mimeType, sprache }),
      })
      const daten = await antwortRaw.json()
      const bem = daten.analyse?.bemerkungen as string | undefined
      setAltText(bem || (sprache === 'de' ? 'Kein Alt-Text erzeugt.' : 'No alt text generated.'))
    } finally {
      setAltLaedt(false)
    }
  }

  const hashtagsErzeugen = async () => {
    setHashtagsLaedt(true)
    try {
      const antwort = await copyErzeugen({
        jobId: job.id,
        slot: 'hashtags',
        briefing: job.briefing.map((b) => `${b.frage}: ${b.antwort || ''}`).join('\n'),
        ziel: job.ziel,
        kanal: job.kanal,
        sprache,
        anzahl: 1,
      })
      if (antwort.varianten && antwort.varianten[0]) {
        const tags = antwort.varianten[0].split(/\s+/).map((t) => t.replace(/^#/, '')).filter(Boolean)
        setHashtags(tags)
        onJobPatch({ hashtags: tags })
      }
    } finally {
      setHashtagsLaedt(false)
    }
  }

  const vorlagenLadenAktion = async () => {
    const liste = await vorlagenLaden()
    setVorlagen(liste)
  }

  const alsVorlageSpeichern = async () => {
    if (!artefakt) return
    const name = prompt(sprache === 'de' ? 'Name für Vorlage?' : 'Template name?') || `${job.titel} · ${artefakt.format}`
    const v: EigeneVorlage = {
      id: crypto.randomUUID(),
      name,
      kanal: artefakt.kanal,
      ebenen: artefakt.ebenen,
      breite: artefakt.breite,
      hoehe: artefakt.hoehe,
      einheit: artefakt.einheit,
      erstelltAm: Date.now(),
    }
    await vorlageSpeichern(v)
    await vorlagenLadenAktion()
  }

  const vorlageAnwenden = (v: EigeneVorlage) => {
    if (!onArtefaktPatch || !artefakt) return
    onArtefaktPatch({ ...artefakt, ebenen: v.ebenen, breite: v.breite, hoehe: v.hoehe, einheit: v.einheit })
  }

  const uebersetzen = async () => {
    if (!artefakt) return
    const kontext = jobFuerPrompt(job)
    const texte = artefakt.ebenen.filter((e) => e.typ === 'text').map((e) => ({ id: e.id, text: (e.eigenschaften.text as string) || e.name }))
    const antwort = await dialogAufrufen<{ operationen: { ebeneId: string; operation: string; text: string }[] }>('editor-befehl', {
      jobId: job.id,
      sprache: sprache === 'de' ? 'en' : 'de',
      nutzerText:
        sprache === 'de'
          ? `Übersetze diese Texte ins Englische und schreibe für jede Ebene eine setzeText-Operation zurück: ${JSON.stringify(texte)}.`
          : `Translate these texts into German and return a setzeText operation for each layer: ${JSON.stringify(texte)}.`,
      jobKontext: kontext,
    })
    if (antwort.ok && antwort.daten?.operationen) {
      let neu = artefakt
      for (const op of antwort.daten.operationen) {
        if (op.operation === 'setzeText') {
          const ziel = neu.ebenen.find((e) => e.id === op.ebeneId)
          if (ziel) neu = ebeneAktualisieren(neu, ziel.id, { eigenschaften: { text: op.text } })
        }
      }
      onArtefaktPatch?.(neu)
      setUebersetzung(sprache === 'de' ? '✓ Übersetzt.' : '✓ Translated.')
    } else {
      setUebersetzung(antwort.fehler || 'Fehlgeschlagen')
    }
  }

  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700 }}>{sprache === 'de' ? '🛠 Werkzeuge' : '🛠 Tools'}</div>

      <details>
        <summary style={{ cursor: 'pointer', fontSize: 12 }}>{sprache === 'de' ? 'Notizen' : 'Notes'} ({job.notizen?.length || 0})</summary>
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <textarea
            rows={2}
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            placeholder={sprache === 'de' ? 'Kurze Notiz für dich selbst' : 'Short note to yourself'}
            style={styleInput}
          />
          <button type="button" onClick={notizHinzufuegen} disabled={!notiz.trim()} style={styleKnopfKlein}>
            + {sprache === 'de' ? 'hinzufügen' : 'add'}
          </button>
          {job.notizen?.map((n) => (
            <div key={n.id} style={{ fontSize: 11, padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 5, borderLeft: '2px solid #60a5fa' }}>
              <div style={{ opacity: 0.55, fontSize: 10 }}>{new Date(n.erstelltAm).toLocaleString()}</div>
              {n.text}
            </div>
          ))}
        </div>
      </details>

      <details>
        <summary style={{ cursor: 'pointer', fontSize: 12 }}>{sprache === 'de' ? 'QR-Code aufs Artefakt legen' : 'Place QR code on artifact'}</summary>
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input type="url" value={qrText} onChange={(e) => setQrText(e.target.value)} style={styleInput} />
          <button type="button" onClick={qrErzeugen} disabled={!artefakt} style={styleKnopfKlein}>
            QR unten rechts einsetzen
          </button>
          {qrFehler && <p style={{ margin: 0, color: '#fecaca', fontSize: 11 }}>⚠ {qrFehler}</p>}
        </div>
      </details>

      <details>
        <summary style={{ cursor: 'pointer', fontSize: 12 }}>UTM-Link-Builder</summary>
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11 }}>
          <input placeholder="URL" value={utm.url} onChange={(e) => setUtm({ ...utm, url: e.target.value })} style={styleInput} />
          <input placeholder="source" value={utm.source} onChange={(e) => setUtm({ ...utm, source: e.target.value })} style={styleInput} />
          <input placeholder="medium" value={utm.medium} onChange={(e) => setUtm({ ...utm, medium: e.target.value })} style={styleInput} />
          <input placeholder="campaign" value={utm.campaign} onChange={(e) => setUtm({ ...utm, campaign: e.target.value })} style={styleInput} />
          <input placeholder="content" value={utm.content} onChange={(e) => setUtm({ ...utm, content: e.target.value })} style={styleInput} />
          <input readOnly value={utmBauen()} onFocus={(e) => e.currentTarget.select()} style={{ ...styleInput, opacity: 0.85 }} />
          <button type="button" onClick={() => navigator.clipboard.writeText(utmBauen())} style={styleKnopfKlein}>
            📋 {sprache === 'de' ? 'Kopieren' : 'Copy'}
          </button>
        </div>
      </details>

      <details>
        <summary style={{ cursor: 'pointer', fontSize: 12 }}>{sprache === 'de' ? 'Print-/Barriere-Prüfung' : 'Print/accessibility check'}</summary>
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <button type="button" onClick={pruefen} disabled={!artefakt} style={styleKnopfKlein}>
            {sprache === 'de' ? 'Prüfen' : 'Check'}
          </button>
          {pruefergebnis.map((h, i) => (
            <div
              key={i}
              style={{
                fontSize: 11,
                padding: 6,
                background: h.schwere === 'warnung' ? 'rgba(251,191,36,0.15)' : 'rgba(96,165,250,0.15)',
                borderLeft: `2px solid ${h.schwere === 'warnung' ? '#fbbf24' : '#60a5fa'}`,
                borderRadius: 4,
              }}
            >
              {h.text}
            </div>
          ))}
        </div>
      </details>

      <details>
        <summary style={{ cursor: 'pointer', fontSize: 12 }}>{sprache === 'de' ? 'Farbschema aus Vorlage' : 'Palette from reference'}</summary>
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button type="button" onClick={farbschemaExtrahieren} disabled={!job.vorlageRef} style={styleKnopfKlein}>
            {sprache === 'de' ? 'Extrahieren' : 'Extract'}
          </button>
          {farbschema.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {farbschema.map((f) => (
                <div key={f} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: 32, height: 32, background: f, borderRadius: 4, border: '1px solid rgba(255,255,255,0.15)' }} />
                  <span style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }}>{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>

      <details>
        <summary style={{ cursor: 'pointer', fontSize: 12 }}>{sprache === 'de' ? 'Alt-Text erzeugen' : 'Generate alt text'}</summary>
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button type="button" onClick={altTextErzeugen} disabled={!artefakt || altLaedt} style={styleKnopfKlein}>
            {altLaedt ? '…' : sprache === 'de' ? 'Bild analysieren' : 'Analyze image'}
          </button>
          {altText && <p style={{ margin: 0, fontSize: 11, padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 5 }}>{altText}</p>}
        </div>
      </details>

      <details>
        <summary style={{ cursor: 'pointer', fontSize: 12 }}>{sprache === 'de' ? 'Hashtag-Radar' : 'Hashtag radar'}</summary>
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <button type="button" onClick={hashtagsErzeugen} disabled={hashtagsLaedt} style={styleKnopfKlein}>
            {hashtagsLaedt ? '…' : sprache === 'de' ? 'Vorschlagen' : 'Suggest'}
          </button>
          {hashtags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {hashtags.map((h) => (
                <span
                  key={h}
                  style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 4 }}
                >
                  #{h}
                </span>
              ))}
            </div>
          )}
        </div>
      </details>

      <details>
        <summary style={{ cursor: 'pointer', fontSize: 12 }}>{sprache === 'de' ? 'In andere Sprache übersetzen' : 'Translate to other language'}</summary>
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <button type="button" onClick={uebersetzen} disabled={!artefakt} style={styleKnopfKlein}>
            {sprache === 'de' ? 'DE → EN übersetzen' : 'EN → DE übersetzen'}
          </button>
          {uebersetzung && <p style={{ margin: 0, fontSize: 11 }}>{uebersetzung}</p>}
        </div>
      </details>

      <details onToggle={(e) => e.currentTarget.open && vorlagenLadenAktion()}>
        <summary style={{ cursor: 'pointer', fontSize: 12 }}>{sprache === 'de' ? 'Eigene Vorlagen' : 'Own templates'}</summary>
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <button type="button" onClick={alsVorlageSpeichern} disabled={!artefakt} style={styleKnopfKlein}>
            💾 {sprache === 'de' ? 'Aktuelles als Vorlage speichern' : 'Save current as template'}
          </button>
          {vorlagen.map((v) => (
            <button key={v.id} type="button" onClick={() => vorlageAnwenden(v)} style={{ ...styleKnopfKlein, textAlign: 'left' }}>
              {v.name} · {v.breite}×{v.hoehe} {v.einheit}
            </button>
          ))}
        </div>
      </details>
    </section>
  )
}

const styleInput: React.CSSProperties = {
  background: 'rgba(0,0,0,0.35)',
  color: '#f5f5f7',
  border: '1px solid rgba(255,255,255,0.14)',
  padding: '5px 8px',
  borderRadius: 5,
  fontSize: 11,
  fontFamily: 'inherit',
  outline: 'none',
}
const styleKnopfKlein: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  color: '#f5f5f7',
  border: '1px solid rgba(255,255,255,0.15)',
  padding: '5px 10px',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
}
