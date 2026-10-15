'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import { AUSZAHLUNG_TEXT, type Auszahlung, type Kampagne, type Preisstufe, type Spieltag, type SpieltagGewinner } from '@/lib/cockpit/typen'
import { assetSpeichern, assetUrl, spieltagSpeichern } from '@/lib/cockpit/daten-client'
import FotoZuschneider from './FotoZuschneider'
import FotoLinkKnopf from './FotoLinkKnopf'
import { kontextLaden } from '@/lib/cockpit/anzeigen'
import { gewinnplanPruefen } from '@/lib/cockpit/tagesstatus'
import Feld from './Feld'
import Hinweis from './Hinweis'
import Karte from './Karte'
import LeererZustand from './LeererZustand'
import EinfuehrungKarte from './EinfuehrungKarte'
import { gewinnerNachSerie } from '@/lib/cockpit/zu-serie'
import { GELDREGEN_EINTRAG, spielFinden } from '@/lib/serie/spiele'

export const GEWINNERTEXT_MAX_1 = 90
export const GEWINNERTEXT_MAX_4 = 45

type Props = {
  spielId: string
  kampagne?: Kampagne
  spieltag?: Spieltag
  onAendern: () => void
  /** Sofort im Zustand übernehmen + im Hintergrund speichern (Spielseite) */
  onSpeichern?: (s: Spieltag) => void
}

function preisstufen(k: Kampagne): Preisstufe[] {
  if (k.preise.art === 'geldpakete') return k.preise.stufen
  if (k.preise.art === 'tagespreis') {
    const liste: Preisstufe[] = [{ anzahl: 1, betrag: k.preise.tagespreis }]
    if (k.preise.supermittwoch) liste.push({ anzahl: 1, betrag: k.preise.supermittwoch })
    return liste
  }
  // juli
  return k.preise.wochen.flatMap((w): Preisstufe[] => {
    const liste: Preisstufe[] = [{ anzahl: 1, betrag: w.tagespreis }]
    if (w.jackpotAn && w.jackpotBetrag) liste.push({ anzahl: 1, betrag: w.jackpotBetrag })
    return liste
  })
}

export default function GewinnerPanel({ spielId, kampagne, spieltag, onAendern, onSpeichern }: Props) {
  const { sprache } = useSprache()
  const [laedt, setLaedt] = useState(false)
  const [vorschlagLaedt, setVorschlagLaedt] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [zuschnitt, setZuschnitt] = useState<{ gewinnerId: string; url: string; original?: File } | null>(null)

  const stufen = useMemo(() => (kampagne ? preisstufen(kampagne) : []), [kampagne])
  const [zeitungsNamen, setZeitungsNamen] = useState<string[]>([])
  const monat = spieltag?.datum.slice(0, 7)
  useEffect(() => {
    if (!kampagne || !monat) return
    kontextLaden(kampagne, monat).then((k) => setZeitungsNamen(k.zeitungen.map((z) => z.name))).catch(() => setZeitungsNamen([]))
  }, [kampagne, monat])

  if (!kampagne || !spieltag) {
    return (
      <LeererZustand
        titel={sprache === 'de' ? 'Noch kein Spieltag' : 'No game day yet'}
        text={sprache === 'de' ? 'Erst Kampagne + Spieltage anlegen.' : 'Create a campaign and game days first.'}
      />
    )
  }
  if (spieltag.nr === 1) {
    const name = spielId === 'geldregen' ? GELDREGEN_EINTRAG.name : spielFinden(spielId)?.name ?? spielId
    return <EinfuehrungKarte spielId={kampagne.spielId} spielName={name} monat={spieltag.datum.slice(0, 7)} />
  }

  const maxLen = spieltag.gewinner.length >= 2 ? GEWINNERTEXT_MAX_4 : GEWINNERTEXT_MAX_1

  const gewinnerSetzen = async (next: SpieltagGewinner[]) => {
    setLaedt(true)
    const neu: Spieltag = { ...spieltag, gewinner: next, aktualisiertAm: Date.now() }
    if (onSpeichern) { onSpeichern(neu); setLaedt(false); return }
    await spieltagSpeichern(neu)
    // Gewinner (inkl. Zusatztext) in die Anzeigen übernehmen – Serien-Modus liest sie von dort
    await gewinnerNachSerie(kampagne, neu).catch(() => 0)
    onAendern()
    setLaedt(false)
  }

  const hinzu = async () => {
    const neu: SpieltagGewinner = {
      id: crypto.randomUUID(),
      name: '',
      ort: '',
      betrag: stufen[0]?.betrag ?? 0,
      einwilligung: false,
      gewinnertext: '',
    }
    await gewinnerSetzen([...spieltag.gewinner, neu])
  }

  const aendern = async (id: string, teil: Partial<SpieltagGewinner>) => {
    const next = spieltag.gewinner.map((g) => (g.id === id ? { ...g, ...teil } : g))
    await gewinnerSetzen(next)
  }

  const loeschen = async (id: string) => {
    await gewinnerSetzen(spieltag.gewinner.filter((g) => g.id !== id))
  }

  /** Neues Foto: erst zuschneiden lassen (Original wird zusätzlich gespeichert). */
  const foto = (id: string, f: File) => {
    setZuschnitt({ gewinnerId: id, url: URL.createObjectURL(f), original: f })
  }

  const zuschnittFertig = async (blob: Blob) => {
    if (!zuschnitt) return
    const z = zuschnitt
    setZuschnitt(null)
    try {
      setLaedt(true)
      const originalHash = z.original ? await assetSpeichern(z.original) : undefined
      const hash = await assetSpeichern(blob)
      const g = spieltag.gewinner.find((x) => x.id === z.gewinnerId)
      await aendern(z.gewinnerId, { fotoHash: hash, fotoOriginalHash: originalHash ?? g?.fotoOriginalHash ?? g?.fotoHash })
    } catch (e) {
      setFehler((sprache === 'de' ? 'Foto konnte nicht gespeichert werden: ' : 'Photo could not be saved: ') + (e instanceof Error ? e.message : String(e)))
    } finally {
      if (z.original) URL.revokeObjectURL(z.url)
      setLaedt(false)
    }
  }

  const vorschlag = async (id: string, stichworte: string) => {
    setVorschlagLaedt(id)
    setFehler(null)
    try {
      const g = spieltag.gewinner.find((x) => x.id === id)
      if (!g) return
      const res = await fetch('/api/dialog', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nachrichten: [{
            rolle: 'user',
            text: `Formuliere einen freundlichen, kurzen Gewinnertext (maximal ${maxLen} Zeichen, ohne Anführungszeichen) auf Deutsch für eine Zeitungsanzeige. Gewinner: ${g.name || 'Gewinner/in'}${g.ort ? ' aus ' + g.ort : ''}, Betrag ${g.betrag} €. Stichworte vom Anruf: ${stichworte}. Nur einen Satz, keine Höflichkeitsfloskeln.`,
          }],
          systemContext: { modus: 'cockpit-gewinnertext' },
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { antwort?: string }
      const text = (data.antwort ?? '').trim().slice(0, maxLen * 2) // 2× als Sicherheitsmaß, Grenze setzt der Nutzer
      if (text) await aendern(id, { gewinnertext: text })
    } catch (e) {
      setFehler(sprache === 'de' ? `KI-Vorschlag nicht möglich: ${String(e)}` : `AI suggestion failed: ${String(e)}`)
    } finally {
      setVorschlagLaedt(null)
    }
  }

  return (
    <Karte titel={sprache === 'de' ? `Gewinner vom Vortag · Tag ${spieltag.nr}` : `Winners of previous day · Day ${spieltag.nr}`}>
      <Hinweis>
        {sprache === 'de'
          ? 'Hinweis: Foto bis 14:00 Uhr – später kommt ein neutrales Symbol in die Anzeige. Einwilligung ist Pflicht, bevor der Spieltag freigegeben wird.'
          : 'Note: photo by 14:00 – otherwise a neutral icon is used. Consent is required before approval.'}
      </Hinweis>

      {spieltag.gewinner.length === 0 && (
        <div style={{ margin: '12px 0' }}>
          <LeererZustand
            titel={sprache === 'de' ? 'Noch keine Gewinner erfasst' : 'No winners entered yet'}
            text={sprache === 'de' ? 'Je nach Spieltag 1 oder 4 Gewinner anlegen.' : 'Create 1 or 4 winners, depending on the day.'}
            aktion={<button type="button" className="cockpit-knopf primaer" onClick={hinzu}>+ {sprache === 'de' ? 'Gewinner hinzufügen' : 'Add winner'}</button>}
          />
        </div>
      )}

      {spieltag.gewinner.map((g) => {
        const zaehler = { ist: g.gewinnertext.length, max: maxLen }
        return (
          <section key={g.id} style={{ borderTop: '1px solid var(--tm-linie)', paddingTop: 14, marginTop: 14 }}>
            <Feld art="text" label={sprache === 'de' ? 'Name (Pflicht)' : 'Name (required)'} wert={g.name} onAendern={(w) => aendern(g.id, { name: w })} pflicht />
            <Feld art="text" label={sprache === 'de' ? 'Wohnort (freiwillig)' : 'Home town (optional)'} wert={g.ort} onAendern={(w) => aendern(g.id, { ort: w })} />
            <Feld
              art="select"
              label={sprache === 'de' ? 'Betrag (Preisstufe)' : 'Amount (prize tier)'}
              wert={String(g.betrag)}
              onAendern={(w) => aendern(g.id, { betrag: Number(w) })}
              optionen={stufen.map((s) => ({ wert: String(s.betrag), name: `${s.betrag.toLocaleString('de-DE')} €` }))}
              pflicht
            />
            <Feld
              art="select"
              label={sprache === 'de' ? 'Gewonnen über Zeitung' : 'Won via newspaper'}
              wert={g.verlagTitel ?? ''}
              onAendern={(w) => aendern(g.id, { verlagTitel: w })}
              optionen={[
                { wert: '', name: sprache === 'de' ? '– bitte wählen –' : '– please choose –' },
                ...(g.verlagTitel && !zeitungsNamen.includes(g.verlagTitel) ? [{ wert: g.verlagTitel, name: g.verlagTitel }] : []),
                ...zeitungsNamen.map((n) => ({ wert: n, name: n })),
              ]}
              hilfe={sprache === 'de' ? 'Auswahlliste statt Freitext – so bleiben die Daten auswertbar (monday: „Gewinner von Verlag/Titel“).' : 'Pick from the list.'}
            />
            <Feld
              art="eigen"
              label={sprache === 'de' ? 'Foto' : 'Photo'}
              hilfe={g.fotoHash ? (sprache === 'de' ? 'Foto gespeichert. „Zuschneiden“ ändert den runden Ausschnitt.' : 'Photo saved.') : (sprache === 'de' ? 'Noch kein Foto – optional. Nach der Auswahl kannst du den Ausschnitt festlegen.' : 'No photo yet – optional.')}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {g.fotoHash && <img src={assetUrl(g.fotoHash)} alt={sprache === 'de' ? `Foto von ${g.name || 'Gewinner'}` : `Photo of ${g.name || 'winner'}`} className="cockpit-foto-rund" />}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label={sprache === 'de' ? 'Foto auswählen' : 'Choose photo'}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) foto(g.id, f)
                    e.target.value = ''
                  }}
                />
                {g.fotoHash && (
                  <button type="button" className="cockpit-knopf sekundaer" onClick={() => setZuschnitt({ gewinnerId: g.id, url: assetUrl(g.fotoOriginalHash ?? g.fotoHash!) })}>
                    {sprache === 'de' ? 'Zuschneiden' : 'Crop'}
                  </button>
                )}
              </div>
              <FotoLinkKnopf spieltagId={spieltag.id} gewinner={g} />
            </Feld>
            <Feld
              art="select"
              label={sprache === 'de' ? 'Gewinnauszahlung (Status)' : 'Prize payout (status)'}
              wert={g.auszahlung ?? 'daten-fehlen'}
              onAendern={(w) => aendern(g.id, { auszahlung: w as Auszahlung })}
              optionen={(Object.keys(AUSZAHLUNG_TEXT) as Auszahlung[]).map((k) => ({ wert: k, name: AUSZAHLUNG_TEXT[k][sprache === 'de' ? 'de' : 'en'] }))}
              hilfe={sprache === 'de' ? 'Nur der Status – Bankdaten gehören nicht ins Cockpit. Wird mit monday abgeglichen.' : 'Status only – no bank data. Synced with monday.'}
            />
            <Feld
              art="eigen"
              label={sprache === 'de' ? 'Einwilligung' : 'Consent'}
            >
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={g.einwilligung}
                  onChange={(e) => aendern(g.id, { einwilligung: e.target.checked, einwilligungQuelle: e.target.checked ? (g.einwilligungQuelle ?? 'telefon') : undefined, einwilligungAm: e.target.checked ? Date.now() : undefined })}
                />
                {sprache === 'de' ? 'Gewinner einverstanden' : 'Winner consents'}
              </label>
            </Feld>
            <Feld
              art="textarea"
              label={sprache === 'de' ? 'Zusatztext zum Gewinnerbild (freiwillig)' : 'Extra text for the winner photo (optional)'}
              hilfe={sprache === 'de' ? 'Erscheint in der Anzeige unter Name und Betrag – sobald Name und Einwilligung erfasst sind.' : 'Shown in the ad below name and amount – once name and consent are entered.'}
              wert={g.gewinnertext}
              onAendern={(w) => aendern(g.id, { gewinnertext: w })}
              zeilen={2}
              zaehler={zaehler}
              platzhalter={sprache === 'de' ? 'z. B. „Davon kauft sie sich eine neue Waschmaschine."' : 'e.g. "She uses it to buy a new washing machine."'}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder={sprache === 'de' ? 'Stichworte vom Anruf (für Vorschlag)' : 'Call keywords (for suggestion)'}
                aria-label={sprache === 'de' ? 'Stichworte für KI-Vorschlag' : 'Keywords for AI suggestion'}
                style={{ flex: 1, minHeight: 36, padding: '6px 10px', border: '1px solid var(--tm-linie)', borderRadius: 8 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const text = (e.target as HTMLInputElement).value
                    if (text.trim()) void vorschlag(g.id, text)
                  }
                }}
              />
              <button
                type="button"
                className="cockpit-knopf sekundaer"
                disabled={vorschlagLaedt === g.id}
                onClick={(e) => {
                  const input = (e.currentTarget.previousSibling as HTMLInputElement | null)
                  const text = input?.value ?? ''
                  if (text.trim()) void vorschlag(g.id, text)
                }}
              >
                {vorschlagLaedt === g.id ? '…' : (sprache === 'de' ? 'Vorschlag' : 'Suggest')}
              </button>
              <button type="button" className="cockpit-knopf text" onClick={() => loeschen(g.id)}>
                {sprache === 'de' ? 'Entfernen' : 'Remove'}
              </button>
            </div>
          </section>
        )
      })}

      {spieltag.gewinner.length > 0 && (() => {
        const gp = gewinnplanPruefen(kampagne, spieltag)
        return (
          <div className={`cockpit-hinweis${gp.fehler.length ? '' : ' gold'}`} style={{ marginTop: 16 }} role="status">
            <b>{sprache === 'de' ? 'Gewinnsumme dieses Spieltags' : 'Prize total of this day'}: {gp.summe.toLocaleString('de-DE')} €</b>
            {gp.maxSumme !== null && <span> · {sprache === 'de' ? 'Gewinnplan max.' : 'plan max.'} {gp.maxSumme.toLocaleString('de-DE')} €</span>}
            {gp.fehler.map((f, i) => <div key={i}>⚠ {f}</div>)}
          </div>
        )
      })()}

      {spieltag.gewinner.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <button type="button" className="cockpit-knopf primaer" onClick={hinzu}>
            + {sprache === 'de' ? 'Weiterer Gewinner' : 'More winner'}
          </button>
        </div>
      )}

      {fehler && <div style={{ marginTop: 10 }}><Hinweis art="rot">{fehler}</Hinweis></div>}
      {zuschnitt && (
        <FotoZuschneider
          quelle={zuschnitt.url}
          onFertig={(b) => void zuschnittFertig(b)}
          onAbbrechen={() => { if (zuschnitt.original) URL.revokeObjectURL(zuschnitt.url); setZuschnitt(null) }}
        />
      )}
      {laedt && <span className="cockpit-speicherstand aktiv" aria-live="polite">{sprache === 'de' ? 'speichert …' : 'saving …'}</span>}
    </Karte>
  )
}
