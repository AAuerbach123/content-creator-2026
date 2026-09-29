'use client'

import { useEffect, useState } from 'react'
import { verlagePresetsLaden, verlagFarbenPalette } from '@/lib/verlage'
import type { Artefakt, Ebene } from '@/lib/types'
import { useSprache } from './SpracheProvider'

// Rechte Seitenleiste: bearbeitbare Eigenschaften der ausgewählten Ebene.
// CI-Farben (aus dem gerade oder zuletzt angewendeten Verlags-Preset) stehen
// im Farbwähler zuerst — Regel „Konva-Editor: CI-Farben zuerst".

export default function EbenenInspektor({
  artefakt,
  ausgewaehlteId,
  onAendern,
}: {
  artefakt: Artefakt
  ausgewaehlteId?: string
  onAendern: (neu: Artefakt) => void
}) {
  const { sprache } = useSprache()
  const ebene = artefakt.ebenen.find((e) => e.id === ausgewaehlteId)
  const [ciFarben, setCiFarben] = useState<string[]>([])

  useEffect(() => {
    // Nimm die Farbwelt aus den ersten drei Verlags-Presets als „CI-Farben zuerst";
    // sobald wir Brand-Kits pro Job persistieren, kommt die richtige CI hierhin.
    verlagePresetsLaden()
      .then((liste) => {
        const set = new Set<string>()
        for (const v of liste.slice(0, 6)) {
          for (const f of verlagFarbenPalette(v)) set.add(f)
        }
        setCiFarben(Array.from(set).slice(0, 12))
      })
      .catch(() => {})
  }, [])

  if (!ebene) {
    return (
      <section
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: 12,
          fontSize: 12,
          opacity: 0.55,
        }}
      >
        {sprache === 'de' ? 'Kein Element ausgewählt.' : 'No element selected.'}
      </section>
    )
  }

  const p = ebene.eigenschaften as Record<string, unknown>
  const patchen = (aend: Partial<Ebene>) => {
    onAendern({
      ...artefakt,
      ebenen: artefakt.ebenen.map((e) =>
        e.id === ebene.id
          ? {
              ...e,
              ...aend,
              eigenschaften: { ...e.eigenschaften, ...(aend.eigenschaften || {}) },
            }
          : e,
      ),
    })
  }
  const eigenschaftSetzen = (key: string, wert: unknown) => patchen({ eigenschaften: { [key]: wert } })

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
      <div style={{ fontSize: 13, fontWeight: 700 }}>
        {sprache === 'de' ? 'Eigenschaften' : 'Properties'}
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, opacity: 0.85 }}>
        {sprache === 'de' ? 'Name' : 'Name'}
        <input
          value={ebene.name}
          onChange={(e) => patchen({ name: e.target.value })}
          style={styleInput}
        />
      </label>

      <div style={{ display: 'flex', gap: 6 }}>
        <label style={{ ...spalte, fontSize: 11 }}>
          X
          <input
            type="number"
            value={Math.round(ebene.x)}
            onChange={(e) => patchen({ x: parseFloat(e.target.value) || 0 })}
            style={styleInput}
          />
        </label>
        <label style={{ ...spalte, fontSize: 11 }}>
          Y
          <input
            type="number"
            value={Math.round(ebene.y)}
            onChange={(e) => patchen({ y: parseFloat(e.target.value) || 0 })}
            style={styleInput}
          />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <label style={{ ...spalte, fontSize: 11 }}>
          {sprache === 'de' ? 'Breite' : 'Width'}
          <input
            type="number"
            value={Math.round(ebene.breite)}
            onChange={(e) => patchen({ breite: parseFloat(e.target.value) || 1 })}
            style={styleInput}
          />
        </label>
        <label style={{ ...spalte, fontSize: 11 }}>
          {sprache === 'de' ? 'Höhe' : 'Height'}
          <input
            type="number"
            value={Math.round(ebene.hoehe)}
            onChange={(e) => patchen({ hoehe: parseFloat(e.target.value) || 1 })}
            style={styleInput}
          />
        </label>
        <label style={{ ...spalte, fontSize: 11 }}>
          °
          <input
            type="number"
            value={Math.round(ebene.drehung || 0)}
            onChange={(e) => patchen({ drehung: parseFloat(e.target.value) || 0 })}
            style={styleInput}
          />
        </label>
      </div>

      {ebene.typ === 'text' && (
        <>
          <label style={{ ...spalte, fontSize: 11 }}>
            {sprache === 'de' ? 'Text' : 'Text'}
            <textarea
              value={(p.text as string) || ''}
              onChange={(e) => eigenschaftSetzen('text', e.target.value)}
              rows={3}
              style={{ ...styleInput, resize: 'vertical', minHeight: 60 }}
            />
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <label style={{ ...spalte, fontSize: 11 }}>
              {sprache === 'de' ? 'Größe' : 'Size'}
              <input
                type="number"
                value={Math.round((p.schriftgroesse as number) || 24)}
                onChange={(e) => eigenschaftSetzen('schriftgroesse', parseFloat(e.target.value) || 12)}
                style={styleInput}
              />
            </label>
            <label style={{ ...spalte, fontSize: 11 }}>
              {sprache === 'de' ? 'Gewicht' : 'Weight'}
              <select
                value={String(p.schriftgewicht ?? 400)}
                onChange={(e) => eigenschaftSetzen('schriftgewicht', parseInt(e.target.value, 10))}
                style={styleInput}
              >
                <option value="400">400</option>
                <option value="600">600</option>
                <option value="700">700</option>
                <option value="900">900</option>
              </select>
            </label>
          </div>
          <FarbFeld
            label={sprache === 'de' ? 'Textfarbe' : 'Text color'}
            wert={(p.farbe as string) || '#111111'}
            onWechsel={(v) => eigenschaftSetzen('farbe', v)}
            palette={ciFarben}
          />
          <FarbFeld
            label={sprache === 'de' ? 'Hintergrund' : 'Background'}
            wert={(p.hintergrund as string) || ''}
            onWechsel={(v) => eigenschaftSetzen('hintergrund', v)}
            palette={ciFarben}
            optional
          />
        </>
      )}

      {(ebene.typ === 'bild' || ebene.typ === 'logo') && (
        <FarbFeld
          label={sprache === 'de' ? 'Füll-Farbe (Platzhalter)' : 'Fill (placeholder)'}
          wert={(p.fuellFarbe as string) || ''}
          onWechsel={(v) => eigenschaftSetzen('fuellFarbe', v)}
          palette={ciFarben}
          optional
        />
      )}
    </section>
  )
}

const spalte: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }
const styleInput: React.CSSProperties = {
  background: 'rgba(0,0,0,0.35)',
  color: '#f5f5f7',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 5,
  padding: '5px 8px',
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
}

function FarbFeld({
  label,
  wert,
  onWechsel,
  palette,
  optional,
}: {
  label: string
  wert: string
  onWechsel: (v: string) => void
  palette: string[]
  optional?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, opacity: 0.85, flex: 1 }}>{label}</span>
        <input
          type="color"
          value={wert || '#000000'}
          onChange={(e) => onWechsel(e.target.value)}
          style={{ width: 24, height: 24, background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 4, padding: 0 }}
        />
        {optional && wert && (
          <button
            type="button"
            onClick={() => onWechsel('')}
            title="entfernen"
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', color: '#f5f5f7', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer' }}
          >
            ✕
          </button>
        )}
      </div>
      {palette.length > 0 && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {palette.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => onWechsel(c)}
              style={{ width: 16, height: 16, borderRadius: 3, background: c, border: '1px solid rgba(0,0,0,0.4)', cursor: 'pointer', padding: 0 }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
