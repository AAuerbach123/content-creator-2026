'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import HandbuchKnopf from '@/components/HandbuchKnopf'
import HilfePopover from '@/components/HilfePopover'
import SpracheUmschalter from '@/components/SpracheUmschalter'
import { useSprache } from '@/components/SpracheProvider'
import {
  rufnummernGruppieren,
  rufnummernLaden,
  rufnummernSuchen,
  type RufnummernDatei,
  type ZeitungRufnummern,
} from '@/lib/rufnummern'

// Übersicht der Wissensquiz- und Geldregen-Rufnummern je Zeitung.
// Nach Gruppe sortiert, mit Suche und (i)-Hilfe. Status „zu bestätigen" oben
// deutlich markiert; Hinweise je Zeitung (z. B. „läuft unter …") stehen fett.
// Fehlende Nummern werden als „—" gerendert — keine Erfindung.

export default function RufnummernSeite() {
  const { sprache } = useSprache()
  const [daten, setDaten] = useState<RufnummernDatei | null>(null)
  const [suche, setSuche] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    rufnummernLaden()
      .then(setDaten)
      .catch((e) => setFehler(e instanceof Error ? e.message : String(e)))
  }, [])

  const gefiltert = useMemo<ZeitungRufnummern[]>(() => {
    if (!daten) return []
    return rufnummernSuchen(daten.zeitungen, suche)
  }, [daten, suche])

  const gruppen = useMemo(() => rufnummernGruppieren(gefiltert), [gefiltert])

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0b0b0f',
        color: '#f5f5f7',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Roboto, sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link href="/" style={{ color: '#f5f5f7', textDecoration: 'none', fontSize: 13 }}>
          ← ContentCreator2026
        </Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <HandbuchKnopf anker="rufnummern" />
          <SpracheUmschalter />
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 26 }}>
                {sprache === 'de' ? 'Rufnummern je Zeitung' : 'Phone numbers per newspaper'}
              </h1>
              <HilfePopover
                de={'Wissensquiz-Nummern (Endziffer 1–5 = Frage-/Gewinnstufe) und Geldregen-Nummern (MWN Print/Web, xx = Klasse + Endziffer Antwort 1/2). Bei Verlagswahl im Job werden die passenden Nummern automatisch übernommen. Fehlt eine Nummer, gibt es eine Warnung — nie eine erfundene Nummer.'}
                en={'Wissensquiz numbers (last digit 1–5 = question/prize) and Geldregen numbers (MWN Print/Web, xx = class + last digit answer 1/2). Publisher choice inside a job auto-fills the matching numbers. Missing numbers show a warning — never invented.'}
                anker="rufnummern"
              />
            </div>
            {daten && (
              <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.65 }}>
                {sprache === 'de'
                  ? `Stand ${daten.stand} · Status: ${daten.status}. Online-Nummern (Handy / Laptop-QR) bei Yasmina Salah angefragt.`
                  : `Updated ${daten.stand} · status: ${daten.status}. Online numbers (mobile / laptop QR) pending confirmation.`}
              </p>
            )}
          </div>
          <input
            type="search"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder={sprache === 'de' ? 'Suchen (Titel, Gruppe, Nummer, Preset-ID) …' : 'Search (title, group, number, preset id) …'}
            style={{
              background: 'rgba(0,0,0,0.35)',
              color: '#f5f5f7',
              border: '1px solid rgba(255,255,255,0.14)',
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 13,
              fontFamily: 'inherit',
              minWidth: 280,
            }}
          />
        </div>

        {daten && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: 8, fontSize: 12 }}>
            ⚠{' '}
            {sprache === 'de'
              ? 'Alle Nummern stammen aus alten Listen (Ad-Creator + monday-Board) und sind von Yasmina Salah zu bestätigen. Vor jedem Druck einzeln prüfen.'
              : 'All numbers come from legacy lists (Ad-Creator + monday board) and are to be confirmed by Yasmina Salah. Verify before every print run.'}
          </div>
        )}

        {fehler && <p style={{ color: '#fecaca', marginTop: 20 }}>⚠ {fehler}</p>}
        {!daten && !fehler && (
          <p style={{ marginTop: 20, opacity: 0.55, fontSize: 13 }}>
            {sprache === 'de' ? 'Lade Rufnummern …' : 'Loading …'}
          </p>
        )}

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(gruppen)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([gruppe, liste]) => (
              <section key={gruppe}>
                <h2
                  style={{
                    margin: '0 0 8px',
                    fontSize: 12,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    opacity: 0.6,
                  }}
                >
                  {gruppe} · {liste.length}
                </h2>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  {liste.map((z) => (
                    <RufnummerZeile key={z.zeitung} z={z} sprache={sprache} />
                  ))}
                </div>
              </section>
            ))}
        </div>

        {daten && (
          <p style={{ marginTop: 32, fontSize: 11, opacity: 0.55 }}>
            {sprache === 'de' ? 'Quellen: ' : 'Sources: '}
            <a
              href={daten.quellen.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#93c5fd' }}
            >
              monday 2. Projektdetails
            </a>{' '}
            · {daten.quellen.wissensquiz} · {daten.quellen.geldregen}
          </p>
        )}
      </main>
    </div>
  )
}

function RufnummerZeile({ z, sprache }: { z: ZeitungRufnummern; sprache: 'de' | 'en' }) {
  const wq = z.wissensquiz
  const gr = z.geldregen
  return (
    <div
      style={{
        padding: '10px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 1.2fr) minmax(240px, 1.4fr) minmax(160px, 1fr)',
        gap: 12,
        alignItems: 'flex-start',
        fontSize: 12,
      }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{z.zeitung}</div>
        {z.presetIds.length > 0 && (
          <div style={{ marginTop: 3, opacity: 0.55, fontFamily: 'ui-monospace, monospace', fontSize: 10, lineHeight: 1.4 }}>
            {z.presetIds.join(' · ')}
          </div>
        )}
        {z.hinweis && (
          <div style={{ marginTop: 5, fontSize: 11, color: '#fbbf24' }}>ℹ {z.hinweis}</div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.55 }}>
          {sprache === 'de' ? 'Wissensquiz (Endziffer 1–5)' : 'Wissensquiz (last digit 1–5)'}
        </div>
        {wq ? (
          <>
            <div style={{ fontFamily: 'ui-monospace, monospace', marginTop: 3 }}>
              {wq.stamm}
            </div>
            <ol
              style={{
                margin: '4px 0 0',
                padding: 0,
                listStyle: 'none',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 3,
              }}
            >
              {wq.nummern.map((n, idx) => (
                <li key={n} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, opacity: 0.85 }}>
                  <span style={{ opacity: 0.55, marginRight: 4 }}>{idx + 1}:</span>
                  {n}
                </li>
              ))}
            </ol>
            {wq.serviceHotline && (
              <div style={{ marginTop: 5, fontSize: 11, opacity: 0.7 }}>
                {sprache === 'de' ? 'Service' : 'Service'}: <span style={{ fontFamily: 'ui-monospace, monospace' }}>{wq.serviceHotline}</span>
              </div>
            )}
          </>
        ) : (
          <div style={{ marginTop: 3, opacity: 0.4 }}>—</div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.55 }}>
          {sprache === 'de' ? 'Geldregen (MWN Print / Web)' : 'Geldregen (MWN Print / Web)'}
        </div>
        <div style={{ marginTop: 3, fontFamily: 'ui-monospace, monospace' }}>
          Print: {gr?.mwnPrint || '—'}
        </div>
        <div style={{ fontFamily: 'ui-monospace, monospace' }}>
          Web: {gr?.mwnWeb || '—'}
        </div>
      </div>
    </div>
  )
}
