'use client'

import { useCallback, useEffect, useState } from 'react'
import HilfePopover from '@/components/HilfePopover'
import MikrofonKnopf from '@/components/MikrofonKnopf'
import { useSprache } from '@/components/SpracheProvider'
import { serienVarianteLoeschen, serienVarianteSpeichern, serienVariantenLaden } from '@/lib/db'
import { kiTextVerbessern, kiVariantenHolen } from '@/lib/serie/serie-client'
import { sichtbar, spielMitText, textOverrideVon, type GespeicherteVariante, type SerieVariante, type TextFeld, type TextOverride } from '@/lib/serie/serie-ki'
import type { SpielDef } from '@/lib/serie/spiele/typen'
import type { Vorschlag } from '@/lib/serie/types'
import AnzeigeVorschau, { PruefAmpel, type PruefStatus } from './AnzeigeVorschau'
import { GRAU_TEXT, HELLGRAU, ROT, eingabe, gesperrt, hinweisGelb, hinweisRot, karte, kartenTitel, knopf, knopfKlein, knopfPrimaer, label } from './stil'

// „Neues Spiel aufsetzen“: Die KI schlägt mit den Zusatzvorgaben des Grafikers drei Umsetzungsvarianten (A/B/C) vor.
// Jede Variante wird als Live-Vorschau gezeigt (Text-Overrides auf das SpielDef + Gestaltungsfamilie A/B/C).
// „Übernehmen“ setzt die Variante in die Hauptvorschau und speichert sie in IndexedDB (Store serienVarianten).
// Darunter: Texte selbst bearbeiten, „Text verbessern (KI)“, gespeicherte Varianten anwenden/löschen.

type Bauer = (spiel: SpielDef, vorschlag: Vorschlag) => string

export default function NeuesSpielPanel({
  spiel,
  zeitungName,
  override,
  setOverride,
  setVorschlag,
  bauen,
  hoehe,
  breit,
}: {
  /** Original-SpielDef aus dem Katalog (ohne Overrides); null = Geldregen */
  spiel: SpielDef | null
  zeitungName: string
  override: TextOverride | null
  setOverride: (o: TextOverride | null) => void
  setVorschlag: (v: Vorschlag) => void
  bauen: Bauer
  hoehe: number
  breit: boolean
}) {
  const { T } = useSprache()
  const [zusatz, setZusatz] = useState('')
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [varianten, setVarianten] = useState<SerieVariante[] | null>(null)
  const [pruef, setPruef] = useState<Record<string, PruefStatus>>({})
  const [gespeichert, setGespeichert] = useState<GespeicherteVariante[]>([])
  const [meldung, setMeldung] = useState<string | null>(null)
  const [eigenerName, setEigenerName] = useState('')
  const [offen, setOffen] = useState(false)

  const spielId = spiel?.id ?? ''

  const neuLaden = useCallback(async () => {
    if (!spielId) return setGespeichert([])
    try {
      setGespeichert(await serienVariantenLaden(spielId))
    } catch {
      setGespeichert([])
    }
  }, [spielId])

  useEffect(() => {
    setVarianten(null)
    setOffen(false)
    setFehler(null)
    setMeldung(null)
    void neuLaden()
  }, [neuLaden])

  // Esc schließt das Vorschau-Fenster (Hook vor jedem frühen return – Hook-Reihenfolge)
  useEffect(() => {
    if (!offen) return
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') setOffen(false) }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [offen])

  if (!spiel) {
    return (
      <section style={karte}>
        <h2 style={kartenTitel}>
          {T('serieNeuTitel')}
          <HilfePopover de={HILFE_DE} en={HILFE_EN} anker="serie-ki" ausrichtung="links" />
        </h2>
        <div style={{ fontSize: 13, color: GRAU_TEXT }}>{T('serieNeuGeldregen')}</div>
      </section>
    )
  }

  const aktuell = spielMitText(spiel, override)
  const text = textOverrideVon(aktuell)

  const holen = async () => {
    setLaedt(true)
    setFehler(null)
    setMeldung(null)
    const d = await kiVariantenHolen({ spielId: spiel.id, zeitung: zeitungName, zusatz })
    setLaedt(false)
    if (!d.ok || !d.varianten) {
      setFehler(d.fehler || T('serieKiFehler'))
      return
    }
    setVarianten(d.varianten)
    setOffen(true) // Vorschläge sofort öffnen (Andreas 05.10.)
  }

  const speichern = async (v: SerieVariante, quelle: 'ki' | 'manuell') => {
    try {
      await serienVarianteSpeichern({ ...v, id: crypto.randomUUID(), spielId: spiel.id, quelle, zusatzvorgaben: zusatz || undefined, erstelltAm: Date.now() })
      await neuLaden()
      setMeldung(T('serieNeuGespeichert'))
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    }
  }

  const uebernehmen = async (v: SerieVariante) => {
    const o: TextOverride = { titel: v.titel, unterzeile: v.unterzeile, schritte: v.schritte, hinweis: v.hinweis }
    setOverride(o)
    setVorschlag(v.vorschlag)
    await speichern(v, 'ki')
    setOffen(false)
  }

  const feldSetzen = (teil: Partial<TextOverride>) => setOverride({ ...text, ...teil })

  return (
    <section style={karte}>
      <h2 style={kartenTitel}>
        {T('serieNeuTitel')}
        <HilfePopover de={HILFE_DE} en={HILFE_EN} anker="serie-ki" ausrichtung="links" />
      </h2>
      <div style={{ fontSize: 13, color: GRAU_TEXT, marginBottom: 6 }}>
        {T('serieNeuBasis')} <b style={{ color: '#1d1d1f' }}>{spiel.name}</b>
      </div>
      <label style={label} htmlFor="neu-zusatz">
        {T('serieZusatz')}
      </label>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <textarea
          id="neu-zusatz"
          value={zusatz}
          onChange={(e) => setZusatz(e.target.value)}
          rows={2}
          placeholder={T('serieNeuZusatzPlatzhalter')}
          style={{ ...eingabe, flex: '1 1 260px', resize: 'vertical' }}
        />
        <MikrofonKnopf onText={(t) => setZusatz((z) => (z ? z + ' ' : '') + t)} />
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" onClick={holen} disabled={laedt} style={{ ...knopfPrimaer, ...(laedt ? gesperrt : {}) }}>
          ✦ {laedt ? T('serieKiLaedt') : T('serieNeuKnopf')}
        </button>
        {override && (
          <button type="button" style={knopf} onClick={() => setOverride(null)}>
            {T('serieNeuOriginal')}
          </button>
        )}
      </div>
      {fehler && <div style={{ ...hinweisRot, marginTop: 8 }}>{fehler}</div>}
      {meldung && <div style={{ marginTop: 8, fontSize: 12, color: '#1E8E3E' }}>{meldung}</div>}

      {varianten && !offen && (
        <button type="button" style={{ ...knopf, marginTop: 10 }} onClick={() => setOffen(true)}>
          {T('serieVorschlaegeOeffnen')}
        </button>
      )}

      {varianten && offen && (
        // Vollbild-Fenster: öffnet sich sofort, sobald die Vorschläge da sind; ✕/Esc/Klick daneben schließt.
        <div
          role="dialog"
          aria-modal="true"
          aria-label={T('serieVorschlaegeTitel')}
          onClick={(e) => { if (e.target === e.currentTarget) setOffen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(20,10,14,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'min(2vw,18px)' }}
        >
          <div style={{ background: '#fff', borderRadius: 16, borderTop: `5px solid ${ROT}`, width: '100%', maxWidth: 1800, maxHeight: '100%', overflow: 'auto', padding: '16px 18px 18px', boxShadow: '0 30px 80px rgba(0,0,0,.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <h2 style={{ ...kartenTitel, margin: 0, flex: '1 1 auto', fontSize: 22 }}>
                {T('serieVorschlaegeTitel')} · {spiel.name}
              </h2>
              <button type="button" style={knopf} onClick={async () => { for (const v of varianten) await speichern(v, 'ki') }}>
                {T('serieAlleSpeichern')}
              </button>
              <button type="button" aria-label={T('serieVorschlaegeSchliessen')} title={T('serieVorschlaegeSchliessen')} onClick={() => setOffen(false)}
                style={{ ...knopf, fontSize: 20, lineHeight: 1, padding: '6px 13px' }}>
                ✕
              </button>
            </div>
            {meldung && <div style={{ marginBottom: 8, fontSize: 13, color: '#1E8E3E' }}>{meldung}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: breit ? 'repeat(3, minmax(0,1fr))' : 'minmax(0,1fr)', gap: 14 }}>
              {varianten.map((v) => (
                <div key={v.vorschlag} style={{ border: `1px solid ${HELLGRAU}`, borderRadius: 10, padding: 10, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>
                    {T('serieVorschlag')} {v.vorschlag} · {v.name}
                  </div>
                  <div style={{ fontSize: 13, color: GRAU_TEXT }}>{v.begruendung}</div>
                  <AnzeigeVorschau
                    html={bauen(spielMitText(spiel, v), v.vorschlag)}
                    hoehe={Math.max(hoehe, 360)}
                    titel={`${T('serieVorschlag')} ${v.vorschlag}`}
                    onPruefung={(s) => setPruef((p) => ({ ...p, [v.vorschlag]: s }))}
                  />
                  <PruefAmpel status={pruef[v.vorschlag] ?? { laedt: true, ergebnis: null }} kompakt />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" style={knopfPrimaer} onClick={() => uebernehmen(v)}>
                      {T('serieUebernehmen')}
                    </button>
                    <button type="button" style={knopf} onClick={() => speichern(v, 'ki')}>
                      {T('serieNurSpeichern')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <details style={{ marginTop: 14 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>{T('serieNeuTexteBearbeiten')}</summary>
        <TextFeldZeile feld="titel" name={T('serieFeldTitel')} wert={text.titel} setzen={(w) => feldSetzen({ titel: w })} spielId={spiel.id} zusatz={zusatz} />
        <TextFeldZeile feld="unterzeile" name={T('serieFeldUnterzeile')} wert={text.unterzeile} setzen={(w) => feldSetzen({ unterzeile: w })} spielId={spiel.id} zusatz={zusatz} />
        {text.schritte.map((s, i) => (
          <TextFeldZeile
            key={i}
            feld="schritt"
            name={`${T('serieFeldSchritt')} ${i + 1}`}
            wert={s}
            setzen={(w) => feldSetzen({ schritte: text.schritte.map((x, k) => (k === i ? w : x)) })}
            spielId={spiel.id}
            zusatz={zusatz}
          />
        ))}
        <TextFeldZeile feld="titel" name={T('serieFeldHinweisTitel')} wert={text.hinweis.titel} setzen={(w) => feldSetzen({ hinweis: { ...text.hinweis, titel: w } })} spielId={spiel.id} zusatz={zusatz} ohneKi />
        <TextFeldZeile feld="hinweis" name={T('serieFeldHinweisText')} wert={text.hinweis.text} setzen={(w) => feldSetzen({ hinweis: { ...text.hinweis, text: w } })} spielId={spiel.id} zusatz={zusatz} mehrzeilig />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
          <input value={eigenerName} onChange={(e) => setEigenerName(e.target.value)} placeholder={T('serieNeuNamePlatzhalter')} style={{ ...eingabe, flex: '1 1 200px', width: 'auto' }} />
          <button
            type="button"
            style={knopf}
            onClick={() => speichern({ ...text, vorschlag: 'A', name: eigenerName.trim() || T('serieNeuEigeneTexte'), begruendung: T('serieNeuManuell') }, 'manuell')}
          >
            {T('serieNeuSpeichern')}
          </button>
        </div>
      </details>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{T('serieNeuGespeicherte')}</div>
        {!gespeichert.length ? (
          <div style={{ fontSize: 12, color: GRAU_TEXT, marginTop: 4 }}>{T('serieNeuKeineGespeicherten')}</div>
        ) : (
          <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {gespeichert.map((g) => (
              <li key={g.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, borderBottom: `1px solid ${HELLGRAU}`, paddingBottom: 6 }}>
                <span style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <b>{g.name}</b> · {g.quelle === 'ki' ? `${T('serieKiKurz')} · ${T('serieVorschlag')} ${g.vorschlag}` : T('serieNeuManuell')} · {new Date(g.erstelltAm).toLocaleString()}
                  <br />
                  <span style={{ color: GRAU_TEXT }}>{sichtbar(g.titel)} – {sichtbar(g.unterzeile)}</span>
                </span>
                <button
                  type="button"
                  style={knopfKlein}
                  onClick={() => {
                    setOverride({ titel: g.titel, unterzeile: g.unterzeile, schritte: g.schritte, hinweis: g.hinweis })
                    if (g.quelle === 'ki') setVorschlag(g.vorschlag)
                  }}
                >
                  {T('serieAnwenden')}
                </button>
                <button
                  type="button"
                  style={knopfKlein}
                  onClick={async () => {
                    if (!window.confirm(T('serieNeuLoeschenFrage'))) return
                    await serienVarianteLoeschen(g.id)
                    await neuLaden()
                  }}
                >
                  {T('serieLoeschen')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {override && <div style={{ ...hinweisGelb, marginTop: 10 }}>{T('serieNeuOverrideAktiv')}</div>}
    </section>
  )
}

function TextFeldZeile({
  feld,
  name,
  wert,
  setzen,
  spielId,
  zusatz,
  ohneKi,
  mehrzeilig,
}: {
  feld: TextFeld
  name: string
  wert: string
  setzen: (w: string) => void
  spielId: string
  zusatz: string
  ohneKi?: boolean
  mehrzeilig?: boolean
}) {
  const { T } = useSprache()
  const [laedt, setLaedt] = useState(false)
  const [vorschlaege, setVorschlaege] = useState<string[] | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  const verbessern = async () => {
    setLaedt(true)
    setFehler(null)
    setVorschlaege(null)
    const d = await kiTextVerbessern({ spielId, feld, text: wert, zusatz })
    setLaedt(false)
    if (!d.ok || !d.vorschlaege) setFehler(d.fehler || T('serieKiFehler'))
    else setVorschlaege(d.vorschlaege)
  }

  return (
    <div style={{ marginTop: 8 }}>
      <label style={label}>{name}</label>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {mehrzeilig ? (
          <textarea value={wert} rows={2} onChange={(e) => setzen(e.target.value)} style={{ ...eingabe, flex: '1 1 240px', width: 'auto', resize: 'vertical' }} />
        ) : (
          <input value={wert} onChange={(e) => setzen(e.target.value)} style={{ ...eingabe, flex: '1 1 240px', width: 'auto' }} />
        )}
        {!ohneKi && (
          <button type="button" onClick={verbessern} disabled={laedt} style={{ ...knopfKlein, ...(laedt ? gesperrt : {}) }}>
            ✦ {laedt ? T('serieKiLaedt') : T('serieTextVerbessern')}
          </button>
        )}
      </div>
      {fehler && <div style={{ ...hinweisRot, marginTop: 4 }}>{fehler}</div>}
      {vorschlaege && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          <div style={{ fontSize: 11, color: GRAU_TEXT }}>{T('serieKiVorschlagKlick')}</div>
          {vorschlaege.map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setzen(v)
                setVorschlaege(null)
              }}
              style={{ ...knopfKlein, textAlign: 'left' }}
            >
              {sichtbar(v)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const HILFE_DE =
  'Beim Aufsetzen eines Spiels schlägt die KI drei Umsetzungsvarianten vor – je eine pro Gestaltungsfamilie A, B, C – mit Titel, Unterzeile, Schritten und Hinweis-Kasten. Deine Zusatzvorgaben (tippen oder sprechen, z. B. „jünger, Titel kürzer“) fließen ein. Die Mechanik, Beträge und Rufnummern bleiben unangetastet; erfundene Beträge, Telefonnummern oder Rechtsaussagen lehnt das Tool ab. „Übernehmen“ setzt die Variante in die Vorschau und speichert sie im Browser.'
const HILFE_EN =
  'When setting up a game, the AI proposes three implementation variants – one per design family A, B, C – with title, subline, steps and info box. Your extra instructions (typed or spoken, e.g. “younger, shorter title”) are taken into account. Mechanics, amounts and phone numbers stay untouched; invented amounts, phone numbers or legal claims are rejected. “Apply” puts the variant into the preview and saves it in the browser.'
