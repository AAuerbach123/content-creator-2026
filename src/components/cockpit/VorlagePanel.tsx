'use client'

import { useEffect, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import type { CockpitVorlage } from '@/lib/cockpit/typen'
import { assetSpeichern } from '@/lib/db'
import { cockpitVorlageSpeichern } from '@/lib/db'
import Feld from './Feld'
import Hinweis from './Hinweis'
import Karte from './Karte'
import LeererZustand from './LeererZustand'
import StatusChip from './StatusChip'

type Props = {
  vorlage?: CockpitVorlage
  onGespeichert: (v: CockpitVorlage) => void
}

export default function VorlagePanel({ vorlage, onGespeichert }: Props) {
  const { T, sprache } = useSprache()
  const [weg, setWeg] = useState<'abc' | 'importiert' | undefined>(vorlage?.quelle)
  const [abc, setAbc] = useState<'A' | 'B' | 'C'>(vorlage?.abc ?? 'A')
  const [name, setName] = useState(vorlage?.name ?? '')
  const [analyse, setAnalyse] = useState<{ farben?: string[]; schriften?: string[]; textgefaesse?: Array<{ art: string; textProbe: string }> } | null>(null)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    if (vorlage) {
      setWeg(vorlage.quelle)
      if (vorlage.abc) setAbc(vorlage.abc)
      setName(vorlage.name)
    }
  }, [vorlage])

  const datei = async (f: File) => {
    setLaedt(true)
    setFehler(null)
    try {
      // Datei im Assets-Store ablegen (Regel 2)
      const hash = await assetSpeichern(f)
      // Analyse via vorhandene Route /api/analyze-template (Claude Vision)
      const fd = new FormData()
      fd.append('bild', f)
      const res = await fetch('/api/analyze-template', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json() as { farben?: string[]; schriften?: string[]; textgefaesse?: Array<{ art: string; textProbe: string }> }
      setAnalyse(data)
      const neue: CockpitVorlage = {
        id: vorlage?.id ?? crypto.randomUUID(),
        name: name || f.name,
        quelle: 'importiert',
        datasetHash: hash,
        farben: data.farben ? { primaer: data.farben[0], sekundaer: data.farben[1], akzent: data.farben[2] } : undefined,
        schriften: data.schriften,
        gesperrt: false,
        erstelltAm: vorlage?.erstelltAm ?? Date.now(),
      }
      await cockpitVorlageSpeichern(neue)
      setWeg('importiert')
      onGespeichert(neue)
    } catch (e) {
      setFehler(String(e))
    } finally {
      setLaedt(false)
    }
  }

  const abcSpeichern = async () => {
    const neue: CockpitVorlage = {
      id: vorlage?.id ?? crypto.randomUUID(),
      name: name || `Vorschlag ${abc}`,
      quelle: 'abc',
      abc,
      gesperrt: false,
      erstelltAm: vorlage?.erstelltAm ?? Date.now(),
    }
    await cockpitVorlageSpeichern(neue)
    setWeg('abc')
    onGespeichert(neue)
  }

  const sperren = async () => {
    if (!vorlage) return
    const g: CockpitVorlage = { ...vorlage, gesperrt: true }
    await cockpitVorlageSpeichern(g)
    onGespeichert(g)
  }

  return (
    <Karte
      titel={T('cockpitVorlageTitel')}
      aktion={vorlage?.gesperrt ? <StatusChip status="freigegeben" sprache={sprache} /> : undefined}
    >
      {!weg && (
        <>
          <p style={{ margin: '0 0 10px' }}><strong>{T('cockpitVorlageFrageJa')}</strong></p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="cockpit-knopf primaer" onClick={() => setWeg('importiert')}>
              {T('cockpitVorlageJa')}
            </button>
            <button type="button" className="cockpit-knopf sekundaer" onClick={() => setWeg('abc')}>
              {T('cockpitVorlageNein')}
            </button>
          </div>
        </>
      )}

      {weg === 'importiert' && (
        <>
          <Feld
            art="eigen"
            label={sprache === 'de' ? 'Datei (PDF, PNG oder JPG)' : 'File (PDF, PNG or JPG)'}
            hilfe={sprache === 'de' ? 'IDML wird derzeit nicht verarbeitet – offen in OFFENE_PUNKTE.md' : 'IDML not supported yet – see OFFENE_PUNKTE.md'}
          >
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              disabled={laedt || vorlage?.gesperrt}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void datei(f)
              }}
            />
          </Feld>
          <Feld
            art="text"
            label={sprache === 'de' ? 'Name der Vorlage' : 'Template name'}
            wert={name}
            onAendern={setName}
            platzhalter={sprache === 'de' ? 'z. B. Geldregen 2027 – Standard' : 'e.g. Geldregen 2027 – standard'}
          />
          {laedt && <Hinweis art="gold">{sprache === 'de' ? 'Vorlage wird analysiert …' : 'Analysing template …'}</Hinweis>}
          {fehler && <Hinweis art="rot">{fehler}</Hinweis>}
          {analyse && (
            <div style={{ marginTop: 12 }}>
              <strong>{sprache === 'de' ? 'Erkannt' : 'Detected'}</strong>
              <ul style={{ paddingLeft: 16 }}>
                {analyse.farben && <li>{sprache === 'de' ? 'Farben' : 'Colours'}: {analyse.farben.join(' · ')}</li>}
                {analyse.schriften && <li>{sprache === 'de' ? 'Schriften' : 'Fonts'}: {analyse.schriften.join(' · ')}</li>}
                {analyse.textgefaesse && (
                  <li>{sprache === 'de' ? 'Textblöcke' : 'Text blocks'}: {analyse.textgefaesse.length}</li>
                )}
              </ul>
            </div>
          )}
        </>
      )}

      {weg === 'abc' && (
        <>
          <Feld
            art="select"
            label={sprache === 'de' ? 'Vorschlag wählen' : 'Choose proposal'}
            wert={abc}
            onAendern={(w) => setAbc(w as 'A' | 'B' | 'C')}
            optionen={[
              { wert: 'A', name: 'A' },
              { wert: 'B', name: 'B' },
              { wert: 'C', name: 'C' },
            ]}
          />
          <Feld
            art="text"
            label={sprache === 'de' ? 'Name der Vorlage' : 'Template name'}
            wert={name}
            onAendern={setName}
            platzhalter={sprache === 'de' ? `z. B. Vorschlag ${abc}` : `e.g. proposal ${abc}`}
          />
          <button type="button" className="cockpit-knopf primaer" onClick={abcSpeichern}>
            {sprache === 'de' ? 'Vorlage übernehmen' : 'Use template'}
          </button>
        </>
      )}

      {weg && (
        <section style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--tm-linie)' }}>
          <strong>{T('cockpitVorlageMusterdaten')}</strong>
          <p style={{ fontSize: 13, color: 'var(--tm-grau)', margin: '4px 0 10px' }}>
            {sprache === 'de'
              ? 'Vorschau mit 0 / 1 / 4 Gewinnern, längstem Text und längstem Zeitungsnamen folgt in der Spiel-Seite rechts – siehe Phase 4.'
              : 'Preview with 0 / 1 / 4 winners, longest text and longest newspaper name follows in the game page – see Phase 4.'
            }
          </p>
          {!vorlage?.gesperrt && weg && (
            <button type="button" className="cockpit-knopf primaer" onClick={sperren} disabled={!vorlage}>
              {T('cockpitVorlageSperren')}
            </button>
          )}
          {vorlage?.gesperrt && (
            <Hinweis art="gold">{T('cockpitVorlageGesperrt')}</Hinweis>
          )}
        </section>
      )}

      {!weg && !vorlage && (
        <LeererZustand
          titel={sprache === 'de' ? 'Noch keine Vorlage' : 'No template yet'}
          text={sprache === 'de' ? 'Oben Weg wählen – „Ja" oder „Nein".' : 'Choose "Yes" or "No" above.'}
        />
      )}
    </Karte>
  )
}
