'use client'

import { useEffect, useState } from 'react'
import {
  rufnummernFuerPreset,
  rufnummernLaden,
  type ZeitungRufnummern,
} from '@/lib/rufnummern'
import HilfePopover from './HilfePopover'
import { useSprache } from './SpracheProvider'

// Zeigt die Rufnummern zum gerade gewählten Verlag an. Erscheint direkt unter
// der Verlags-Wahl in der ArtefaktWerkstatt.
// Ist keine Nummer bekannt: klare Warnung, keine Erfindung.
// Aktionen: „In CTA-Ebene einsetzen" (überschreibt Textebene id='cta') und
// „Als Notiz speichern" (schreibt einen Notiz-Eintrag mit allen Nummern).

export default function RufnummernInfo({
  presetId,
  onInCta,
  onAlsNotiz,
}: {
  presetId: string
  onInCta?: (nummer: string) => void
  onAlsNotiz?: (notizText: string) => void
}) {
  const { sprache } = useSprache()
  const [eintrag, setEintrag] = useState<ZeitungRufnummern | null | undefined>(undefined)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    setEintrag(undefined)
    rufnummernLaden()
      .then((d) => setEintrag(rufnummernFuerPreset(d, presetId) || null))
      .catch((e) => setFehler(e instanceof Error ? e.message : String(e)))
  }, [presetId])

  if (fehler) {
    return (
      <div style={panel}>
        <p style={{ margin: 0, color: '#fecaca', fontSize: 12 }}>⚠ {fehler}</p>
      </div>
    )
  }

  if (eintrag === undefined) {
    return (
      <div style={panel}>
        <p style={{ margin: 0, opacity: 0.55, fontSize: 12 }}>
          {sprache === 'de' ? 'Lade Rufnummern …' : 'Loading numbers …'}
        </p>
      </div>
    )
  }

  if (eintrag === null) {
    return (
      <div style={{ ...panel, borderColor: 'rgba(252,165,165,0.5)', background: 'rgba(252,165,165,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <strong style={{ fontSize: 12, color: '#fecaca' }}>
            ⚠ {sprache === 'de' ? 'Keine bestätigte Rufnummer' : 'No confirmed phone number'}
          </strong>
          <HilfePopover
            de={'Für diesen Verlag/Titel liegt in rufnummern.json kein Eintrag vor. Bitte manuell mit Yasmina Salah klären — das Tool erfindet nichts.'}
            en={'No entry in rufnummern.json for this publisher/title. Please clarify manually — the tool never invents numbers.'}
            anker="rufnummern"
          />
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 11, opacity: 0.7 }}>
          {sprache === 'de'
            ? `Preset-ID „${presetId}". In /rufnummern nachschlagen oder bei Yasmina Salah nachfragen.`
            : `Preset id "${presetId}". Check /rufnummern or ask Yasmina Salah.`}
        </p>
      </div>
    )
  }

  const wq = eintrag.wissensquiz
  const gr = eintrag.geldregen
  const notiz = (): string => {
    const zeilen: string[] = [`Rufnummern für ${eintrag.zeitung}:`]
    if (wq) {
      zeilen.push(`Wissensquiz (${wq.stamm}):`)
      wq.nummern.forEach((n, i) => zeilen.push(`  ${i + 1}: ${n}`))
      if (wq.serviceHotline) zeilen.push(`  Service: ${wq.serviceHotline}`)
    }
    if (gr) {
      zeilen.push(`Geldregen:`)
      zeilen.push(`  MWN Print: ${gr.mwnPrint || '—'}`)
      zeilen.push(`  MWN Web: ${gr.mwnWeb || '—'}`)
    }
    if (eintrag.hinweis) zeilen.push(`Hinweis: ${eintrag.hinweis}`)
    zeilen.push('(Stand: zu bestätigen durch Yasmina Salah.)')
    return zeilen.join('\n')
  }

  return (
    <div style={panel}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <strong style={{ fontSize: 12 }}>
          ☎ {sprache === 'de' ? 'Rufnummern' : 'Phone numbers'} — {eintrag.zeitung}
        </strong>
        <HilfePopover
          de={'Aus rufnummern.json übernommen. Wissensquiz-Nummern haben Endziffern 1–5 (Frage/Gewinnstufe). MWN-Nummern haben xx = Klasse + Endziffer Antwort 1/2. Vor jedem Druck bestätigen.'}
          en={'From rufnummern.json. Wissensquiz numbers use last digits 1–5 (question/prize). MWN numbers use xx = class + last digit answer 1/2. Confirm before every print run.'}
          anker="rufnummern"
        />
      </div>

      {eintrag.hinweis && (
        <div style={{ marginBottom: 6, fontSize: 11, color: '#fbbf24' }}>
          ℹ {eintrag.hinweis}
        </div>
      )}

      {wq ? (
        <div style={{ marginBottom: 6, fontSize: 11, lineHeight: 1.5 }}>
          <div style={{ opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>
            {sprache === 'de' ? 'Wissensquiz' : 'Wissensquiz'}
          </div>
          <div style={{ fontFamily: 'ui-monospace, monospace' }}>{wq.stamm}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {wq.nummern.map((n, i) => (
              <button
                key={n}
                type="button"
                onClick={() => onInCta?.(n)}
                title={sprache === 'de' ? 'In CTA-Ebene einsetzen' : 'Insert into CTA layer'}
                disabled={!onInCta}
                style={pillKnopf}
              >
                <span style={{ opacity: 0.6, marginRight: 4 }}>{i + 1}</span>
                <span style={{ fontFamily: 'ui-monospace, monospace' }}>{n}</span>
              </button>
            ))}
          </div>
          {wq.serviceHotline && (
            <div style={{ marginTop: 4, opacity: 0.7 }}>
              {sprache === 'de' ? 'Service' : 'Service'}:{' '}
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>{wq.serviceHotline}</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: 6, fontSize: 11, opacity: 0.55 }}>
          {sprache === 'de' ? 'Keine Wissensquiz-Nummern hinterlegt.' : 'No Wissensquiz numbers on file.'}
        </div>
      )}

      {gr ? (
        <div style={{ marginBottom: 6, fontSize: 11, lineHeight: 1.5 }}>
          <div style={{ opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>
            {sprache === 'de' ? 'Geldregen (MWN)' : 'Geldregen (MWN)'}
          </div>
          <div style={{ fontFamily: 'ui-monospace, monospace' }}>
            Print: {gr.mwnPrint || '—'}
          </div>
          <div style={{ fontFamily: 'ui-monospace, monospace' }}>
            Web: {gr.mwnWeb || '—'}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 6, fontSize: 11, opacity: 0.55 }}>
          {sprache === 'de' ? 'Keine Geldregen-Nummern hinterlegt.' : 'No Geldregen numbers on file.'}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button
          type="button"
          onClick={() => onAlsNotiz?.(notiz())}
          disabled={!onAlsNotiz}
          style={aktionKnopf}
        >
          {sprache === 'de' ? '↥ Als Notiz speichern' : '↥ Save as note'}
        </button>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 10, opacity: 0.55 }}>
        {sprache === 'de'
          ? 'Alle Nummern sind „zu bestätigen" — vor jedem Druck einzeln prüfen.'
          : 'All numbers are „to be confirmed" — verify before every print run.'}
      </p>
    </div>
  )
}

const panel: React.CSSProperties = {
  marginTop: 8,
  padding: 10,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
}
const pillKnopf: React.CSSProperties = {
  background: 'rgba(0,0,0,0.35)',
  color: '#f5f5f7',
  border: '1px solid rgba(255,255,255,0.15)',
  padding: '3px 8px',
  borderRadius: 4,
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: 'inherit',
}
const aktionKnopf: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  color: '#f5f5f7',
  border: '1px solid rgba(255,255,255,0.15)',
  padding: '4px 10px',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}
