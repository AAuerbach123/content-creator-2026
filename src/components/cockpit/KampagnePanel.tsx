'use client'

import { useEffect, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import type { Kampagne, Modell, Antwortformat, Preise, Preisstufe } from '@/lib/cockpit/typen'
import { kampagneSpeichern, spieltagSpeichern, kampagneFuerSpiel, spieltageLaden } from '@/lib/db'
import { geldregenImportieren, quellenLaden } from '@/lib/cockpit/import'
import Feld from './Feld'
import Hinweis from './Hinweis'
import Karte from './Karte'
import LeererZustand from './LeererZustand'

type Props = {
  spielId: string
  spielName: string
  spielMonate: string[]
  modellWahl: 'RSP' | 'AZS oder RSP'
  istGeldregen: boolean
  onFertig: (k: Kampagne) => void
}

export default function KampagnePanel({ spielId, spielName, spielMonate, modellWahl, istGeldregen, onFertig }: Props) {
  const { T, sprache } = useSprache()
  const [bestehend, setBestehend] = useState<Kampagne[]>([])
  const [monat, setMonat] = useState<string>(spielMonate[0] ?? '')
  const [modell, setModell] = useState<Modell>(modellWahl === 'RSP' ? 'RSP' : 'AZS')
  const [antwortformat, setAntwortformat] = useState<Antwortformat>(istGeldregen ? 'zwei-endziffer' : 'loesungswort')
  const [tagespreis, setTagespreis] = useState<number>(500)
  const [supermittwoch, setSupermittwoch] = useState<number>(1000)
  const [laedt, setLaedt] = useState(false)
  const [meldung, setMeldung] = useState<string | null>(null)

  useEffect(() => {
    void kampagneFuerSpiel(spielId).then(setBestehend).catch(() => undefined)
  }, [spielId])

  const anlegen = async () => {
    const now = Date.now()
    const preise: Preise = istGeldregen
      ? {
          art: 'geldpakete',
          stufen: [
            { anzahl: 1, betrag: 10000, hotlineEndziffer: 1 },
            { anzahl: 1, betrag: 2500, hotlineEndziffer: 2 },
            { anzahl: 1, betrag: 1000, hotlineEndziffer: 1 },
            { anzahl: 2, betrag: 500, hotlineEndziffer: 2 },
            { anzahl: 4, betrag: 250, hotlineEndziffer: 1 },
            { anzahl: 8, betrag: 100, hotlineEndziffer: 2 },
          ],
        }
      : { art: 'tagespreis', tagespreis, supermittwoch }
    const k: Kampagne = {
      id: crypto.randomUUID(),
      spielId,
      monat,
      verlage: [],
      modell,
      preise,
      antwortformat,
      spielSpezifisch: {},
      erstelltAm: now,
      aktualisiertAm: now,
    }
    await kampagneSpeichern(k)
    setBestehend((v) => [k, ...v])
    onFertig(k)
    setMeldung(sprache === 'de' ? 'Kampagne angelegt – jetzt Spieltage anlegen oder Rätsel.' : 'Campaign created – create game days or puzzles now.')
  }

  const uebernehmen = async () => {
    setLaedt(true)
    setMeldung(null)
    try {
      const q = await quellenLaden()
      const paket = geldregenImportieren(q, monat, [])
      if (!paket) throw new Error(sprache === 'de' ? 'Keine Daten für diesen Monat.' : 'No data for this month.')
      await kampagneSpeichern(paket.kampagne)
      for (const s of paket.spieltage) await spieltagSpeichern(s)
      setBestehend((v) => [paket.kampagne, ...v])
      onFertig(paket.kampagne)
      setMeldung(sprache === 'de' ? `${paket.spieltage.length} Spieltage übernommen.` : `${paket.spieltage.length} game days imported.`)
    } catch (e) {
      setMeldung(String(e))
    } finally {
      setLaedt(false)
    }
  }

  const offene = bestehend.filter((k) => k.monat === monat)

  return (
    <Karte titel={sprache === 'de' ? 'Kampagne einstellen' : 'Set up campaign'}>
      {offene.length > 0 && (
        <Hinweis art="gold">
          {sprache === 'de'
            ? `Es gibt bereits eine Kampagne für ${spielName} ${monat}. Du kannst sie öffnen oder eine zweite anlegen.`
            : `A campaign for ${spielName} ${monat} already exists. Open it or create a second one.`}
        </Hinweis>
      )}

      <Feld
        art="select"
        label={sprache === 'de' ? 'Monat / Zeitraum' : 'Month / period'}
        wert={monat}
        onAendern={setMonat}
        optionen={spielMonate.map((m) => ({ wert: m, name: m }))}
        hilfe={sprache === 'de'
          ? 'Anmeldefrist: 8 Wochen bei Geldregen/Juli, 2 Wochen bei AZS – wird in Phase 2 geprüft.'
          : 'Lead time: 8 weeks for Geldregen/July, 2 weeks for AZS – checked in phase 2.'}
      />

      {modellWahl === 'AZS oder RSP' && (
        <Feld
          art="select"
          label={T('cockpitKampagneModell')}
          wert={modell}
          onAendern={(w) => setModell(w as Modell)}
          optionen={[
            { wert: 'AZS', name: sprache === 'de' ? 'AZS (Auszahlungsspiel)' : 'AZS (payout game)' },
            { wert: 'RSP', name: sprache === 'de' ? 'RSP (Rundum-Sorglos)' : 'RSP (full service)' },
          ]}
        />
      )}

      {!istGeldregen && (
        <>
          <Feld
            art="number"
            label={sprache === 'de' ? 'Tagespreis (€)' : 'Daily prize (€)'}
            wert={String(tagespreis)}
            onAendern={(w) => setTagespreis(Number(w))}
          />
          <Feld
            art="number"
            label={sprache === 'de' ? 'Supermittwoch (€, 0 = keiner)' : 'Super Wednesday (€, 0 = none)'}
            wert={String(supermittwoch)}
            onAendern={(w) => setSupermittwoch(Number(w))}
          />
          <Feld
            art="select"
            label={T('cockpitKampagneAntwortformat')}
            wert={antwortformat}
            onAendern={(w) => setAntwortformat(w as Antwortformat)}
            optionen={[
              { wert: 'loesungswort', name: sprache === 'de' ? 'Lösungswort per Anruf' : 'Solution word by phone' },
              { wert: 'zwei-endziffer', name: sprache === 'de' ? '2 Antworten mit Endziffer 1 / 2' : '2 answers with digits 1 / 2' },
            ]}
          />
        </>
      )}

      {istGeldregen && (
        <Hinweis>
          {sprache === 'de'
            ? 'Geldpakete für Geldregen sind nach der Präsentation 2027 vorbelegt (10.000 €, 2.500 €, 1.000 €, 2× 500 €, 4× 250 €, 8× 100 €). Preis-Editor folgt in Loop 2.'
            : 'Prize packs follow the 2027 presentation (10,000 €, 2,500 €, 1,000 €, 2× 500 €, 4× 250 €, 8× 100 €). Price editor coming in loop 2.'}
        </Hinweis>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button type="button" className="cockpit-knopf primaer" onClick={anlegen}>
          {T('cockpitKampagneAnlegen')}
        </button>
        {istGeldregen && (
          <button type="button" className="cockpit-knopf sekundaer" onClick={uebernehmen} disabled={laedt}>
            {laedt ? '…' : T('cockpitKampagneUebernehmen')}
          </button>
        )}
      </div>

      {meldung && <div style={{ marginTop: 12 }}><Hinweis art="gold">{meldung}</Hinweis></div>}

      {bestehend.length === 0 && (
        <div style={{ marginTop: 16 }}>
          <LeererZustand
            titel={T('cockpitKeineKampagne')}
            text={sprache === 'de' ? 'Noch keine Kampagne für dieses Spiel. Oben einstellen und auf „Kampagne anlegen" klicken.' : 'No campaign yet. Fill the form above and click "Create campaign".'}
          />
        </div>
      )}
    </Karte>
  )
}
