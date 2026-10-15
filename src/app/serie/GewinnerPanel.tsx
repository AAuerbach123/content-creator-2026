'use client'

// Gewinnerinnen und Gewinner einfügen (Andreas 05.10.): je Spieltag Foto, Name, Ort, Betrag und Text.
// Die Einträge ersetzen in der Anzeige die Dummy-Porträts (1 Gewinner = erster Eintrag, 4 Gewinner = bis zu vier).
// Foto → Assets-Store (Hash, Regel 2); der Datensatz enthält nur den Hash. Text: max. 110 Zeichen (wie monday „Textlänge“).
// Gilt wahlweise für alle Zeitungen oder nur für die aktuell gezeigte Zeitung.

import { useEffect, useState } from 'react'
import HilfePopover from '@/components/HilfePopover'
import { useSprache } from '@/components/SpracheProvider'
import type { SerienGewinner } from '@/lib/db'
import { assetAlsDataUrl, assetSpeichern, serienGewinnerLoeschen, serienGewinnerSpeichern } from '@/lib/cockpit/daten-client'
import type { Inhalt } from '@/lib/serie/spiele/typen'
import type { Zeitung } from '@/lib/serie/types'
import { GRAU_TEXT, HELLGRAU, eingabe, hinweisRot, karte, kartenTitel, knopf, knopfKlein, knopfPrimaer, label } from './stil'

export const GEWINNER_TEXT_MAX = 110

/** Foto-Hash → data:-URL (für die Vorschau im iframe und den Export) – zentral gespeichert, Altdaten aus dem Browser als Rückfall */
export async function fotoUrl(hash: string): Promise<string | undefined> {
  return assetAlsDataUrl(hash)
}

const HILFE_DE =
  'Hier trägst du echte Gewinnerinnen und Gewinner ein: Spieltag wählen (in dessen Anzeige sie erscheinen), Foto, Name, Ort, Betrag und einen kurzen Text (max. 110 Zeichen). Bei „1 Gewinner“ zeigt die Anzeige den ersten Eintrag, bei „4 Gewinner“ bis zu vier. Ohne Einträge bleiben die Muster-Porträts. Fotos werden so beschnitten, dass der Kopf oben sichtbar bleibt.'
const HILFE_EN =
  'Enter real winners here: choose the game day (whose ad shows them), photo, name, town, amount and a short text (max. 110 characters). “1 winner” shows the first entry, “4 winners” up to four. Without entries the sample portraits remain. Photos are cropped so the head at the top stays visible.'

export default function GewinnerPanel({
  spielId,
  monat,
  inhalte,
  tagAktuell,
  z,
  liste,
  neuLaden,
}: {
  spielId: string
  monat: string
  inhalte: Inhalt[]
  tagAktuell: number
  z: Zeitung | undefined
  liste: SerienGewinner[]
  neuLaden: () => Promise<void>
}) {
  const { T } = useSprache()
  const [tag, setTag] = useState(tagAktuell)
  const [name, setName] = useState('')
  const [ort, setOrt] = useState('')
  const [betrag, setBetrag] = useState('')
  const [text, setText] = useState('')
  const [nurDiese, setNurDiese] = useState(false)
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoVorschau, setFotoVorschau] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => setTag(tagAktuell), [tagAktuell])
  useEffect(() => {
    if (!foto) return setFotoVorschau(null)
    const u = URL.createObjectURL(foto)
    setFotoVorschau(u)
    return () => URL.revokeObjectURL(u)
  }, [foto])

  const zuLang = text.length > GEWINNER_TEXT_MAX
  const bereit = !!name.trim() && !!betrag.trim() && !zuLang

  const speichern = async () => {
    setFehler(null)
    try {
      const fotoHash = foto ? await assetSpeichern(foto) : undefined
      await serienGewinnerSpeichern({
        id: crypto.randomUUID(),
        spielId,
        monat,
        tag,
        zeitungen: nurDiese && z ? [z.id] : [],
        name: name.trim(),
        ort: ort.trim(),
        betrag: betrag.trim(),
        text: text.trim(),
        fotoHash,
        erstelltAm: Date.now(),
      })
      setName('')
      setOrt('')
      setBetrag('')
      setText('')
      setFoto(null)
      await neuLaden()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    }
  }

  const loeschen = async (id: string) => {
    if (!window.confirm(T('serieGewLoeschenFrage'))) return
    await serienGewinnerLoeschen(id)
    await neuLaden()
  }

  return (
    <section style={karte}>
      <h2 style={kartenTitel}>
        {T('serieGewTitel')}
        <HilfePopover de={HILFE_DE} en={HILFE_EN} anker="serie-gewinner" ausrichtung="links" />
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
        <div>
          <label style={label} htmlFor="gew-tag">{T('serieSpieltag')}</label>
          <select id="gew-tag" value={tag} onChange={(e) => setTag(Number(e.target.value))} style={eingabe}>
            {inhalte.map((i) => (
              <option key={i.tag} value={i.tag}>
                {i.tag}. – {i.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={label} htmlFor="gew-name">{T('serieGewName')}</label>
          <input id="gew-name" value={name} onChange={(e) => setName(e.target.value)} style={eingabe} />
        </div>
        <div>
          <label style={label} htmlFor="gew-ort">{T('serieGewOrt')}</label>
          <input id="gew-ort" value={ort} onChange={(e) => setOrt(e.target.value)} style={eingabe} />
        </div>
        <div>
          <label style={label} htmlFor="gew-betrag">{T('serieGewBetrag')}</label>
          <input id="gew-betrag" value={betrag} onChange={(e) => setBetrag(e.target.value)} placeholder="1.000 €" style={eingabe} />
        </div>
      </div>

      <label style={{ ...label, marginTop: 8 }} htmlFor="gew-text">
        {T('serieGewText')} ({text.length}/{GEWINNER_TEXT_MAX})
      </label>
      <textarea id="gew-text" value={text} onChange={(e) => setText(e.target.value)} rows={2} style={{ ...eingabe, resize: 'vertical', borderColor: zuLang ? '#C8102E' : undefined }} />
      {zuLang && <div style={{ ...hinweisRot, marginTop: 4 }}>{T('serieGewTextZuLang')}</div>}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
        <label style={{ ...knopf, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          📷 {T('serieGewFoto')}
          <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
        </label>
        {fotoVorschau && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fotoVorschau} alt="" style={{ width: 56, height: 56, objectFit: 'cover', objectPosition: 'center 22%', borderRadius: '50%', border: `2px solid ${HELLGRAU}` }} />
        )}
        <label style={{ fontSize: 13, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={nurDiese} onChange={(e) => setNurDiese(e.target.checked)} />
          {T('serieGewNurDiese')} {z ? `(${z.name})` : ''}
        </label>
        <button type="button" disabled={!bereit} onClick={speichern} style={{ ...knopfPrimaer, opacity: bereit ? 1 : 0.45 }}>
          {T('serieGewHinzufuegen')}
        </button>
      </div>
      {fehler && <div style={{ ...hinweisRot, marginTop: 8 }}>{fehler}</div>}

      <div style={{ marginTop: 12 }}>
        {!liste.length ? (
          <div style={{ fontSize: 12, color: GRAU_TEXT }}>{T('serieGewKeine')}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {liste.map((g) => (
                <tr key={g.id} style={{ borderTop: `1px solid ${HELLGRAU}` }}>
                  <td style={{ padding: '5px 4px', whiteSpace: 'nowrap' }}>{g.tag}.</td>
                  <td style={{ padding: '5px 4px' }}>
                    <b>{g.name}</b>
                    {g.ort ? `, ${g.ort}` : ''} · {g.betrag}
                    {g.fotoHash ? ' · 📷' : ''}
                    {g.zeitungen.length ? ` · ${g.zeitungen.join(', ')}` : ''}
                    {g.text && <div style={{ color: GRAU_TEXT }}>{g.text}</div>}
                  </td>
                  <td style={{ padding: '5px 4px', textAlign: 'right' }}>
                    <button type="button" style={knopfKlein} onClick={() => loeschen(g.id)}>
                      {T('serieGewLoeschen')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
