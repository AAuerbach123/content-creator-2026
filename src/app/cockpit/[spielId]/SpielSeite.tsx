'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSprache } from '@/components/SpracheProvider'
import { GELDREGEN_EINTRAG, SPIELE } from '@/lib/serie/spiele'
import { cockpitVorlageLaden, cockpitVorlagenLaden, kampagneFuerSpiel, spieltageLaden, spieltagSpeichern } from '@/lib/cockpit/daten-client'
import { gewinnerNachSerie } from '@/lib/cockpit/zu-serie'
import { heuteZuTun } from '@/lib/cockpit/tagesstatus'
import SpieltagLeiste from '@/components/cockpit/SpieltagLeiste'
import { geldregenNovDezSicherstellen } from '@/lib/cockpit/import'
import VorschauSpalte from '@/components/cockpit/VorschauSpalte'
import type { CockpitVorlage, Kampagne, Spieltag } from '@/lib/cockpit/typen'
import Schrittleiste from '@/components/cockpit/Schrittleiste'
import StatusChip from '@/components/cockpit/StatusChip'
import VorlagePanel from '@/components/cockpit/VorlagePanel'
import VorschlagWahl from '@/components/cockpit/VorschlagWahl'
import KampagnePanel from '@/components/cockpit/KampagnePanel'
import ZeitungenKurzinfo from '@/components/cockpit/ZeitungenKurzinfo'
import RaetselPanel from '@/components/cockpit/RaetselPanel'
import GewinnerPanel from '@/components/cockpit/GewinnerPanel'
import FreigabePanel from '@/components/cockpit/FreigabePanel'
import LeererZustand from '@/components/cockpit/LeererZustand'

type Props = { spielId: string }

export default function SpielSeite({ spielId }: Props) {
  const { T, sprache } = useSprache()
  const [phase, setPhase] = useState(0)
  const [kampagne, setKampagne] = useState<Kampagne | undefined>(undefined)
  const [vorlage, setVorlage] = useState<CockpitVorlage | undefined>(undefined)
  const [spieltage, setSpieltage] = useState<Spieltag[]>([])
  const [aktiverSpieltag, setAktiverSpieltag] = useState<string | undefined>(undefined)
  const sprung = useRef<{ tag?: string; phase?: number }>({})
  const syncTimer = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Direkter Sprung aus „Heute zu tun“ / Kalender: ?tag=<spieltagId>&phase=<0..4>
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const ph = Number(p.get('phase'))
    sprung.current = { tag: p.get('tag') ?? undefined, phase: Number.isFinite(ph) && ph >= 0 && ph <= 4 ? ph : undefined }
    if (sprung.current.phase !== undefined) setPhase(sprung.current.phase)
  }, [])

  /** Änderung sofort anzeigen, im Hintergrund speichern; Gewinner verzögert in die Anzeigen spiegeln. */
  const spieltagAktualisieren = useCallback((neu: Spieltag) => {
    setSpieltage((alt) => alt.map((x) => (x.id === neu.id ? neu : x)))
    void spieltagSpeichern(neu).catch(() => undefined)
    if (kampagne) {
      clearTimeout(syncTimer.current[neu.id])
      syncTimer.current[neu.id] = setTimeout(() => { void gewinnerNachSerie(kampagne, neu).catch(() => undefined) }, 1200)
    }
  }, [kampagne])

  const meta = useMemo(() => {
    if (spielId === 'geldregen') return { name: GELDREGEN_EINTRAG.name, monate: GELDREGEN_EINTRAG.monate, modell: GELDREGEN_EINTRAG.modell as 'RSP' | 'AZS oder RSP', beschreibung: GELDREGEN_EINTRAG.beschreibung, istGeldregen: true }
    const s = SPIELE.find((x) => x.id === spielId)
    if (!s) return undefined
    return { name: s.name, monate: s.monate, modell: s.modell, beschreibung: s.beschreibung, istGeldregen: false }
  }, [spielId])

  useEffect(() => {
    void (spielId === 'geldregen' ? geldregenNovDezSicherstellen().catch(() => false) : Promise.resolve(false)).then(() => kampagneFuerSpiel(spielId)).then(async (ks) => {
      const aktuell = ks[0]
      setKampagne(aktuell)
      if (aktuell) {
        const st = await spieltageLaden(aktuell.id)
        setSpieltage(st)
        const gewuenscht = sprung.current.tag && st.find((x) => x.id === sprung.current.tag)
        const { ueberfaellig, naechster } = heuteZuTun(st)
        const start = gewuenscht || ueberfaellig[0] || naechster || st[0]
        if (start) setAktiverSpieltag(start.id)
        if (aktuell.vorlageId) {
          const v = await cockpitVorlageLaden(aktuell.vorlageId)
          setVorlage(v)
        } else {
          const alle = await cockpitVorlagenLaden()
          if (alle.length) setVorlage(alle[0])
        }
      }
    })
  }, [spielId])

  if (!meta) {
    return (
      <LeererZustand
        titel={sprache === 'de' ? 'Spiel nicht gefunden' : 'Game not found'}
        text={spielId}
        aktion={<Link href="/cockpit" className="cockpit-knopf primaer">{T('cockpitZurueck')}</Link>}
      />
    )
  }

  const spieltag = spieltage.find((s) => s.id === aktiverSpieltag) ?? spieltage[0]

  return (
    <>
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/cockpit" className="cockpit-knopf text" aria-label={T('cockpitZurueck')}>←</Link>
          <h2 style={{ margin: 0, fontSize: 22 }}>{meta.name}</h2>
          <StatusChip status={kampagne ? 'vorbereitet' : 'raetsel-fehlt'} sprache={sprache} />
          <Link href={`/cockpit/zeitungen?spiel=${encodeURIComponent(spielId)}`} className="cockpit-knopf text" style={{ marginLeft: 'auto' }}>
            {sprache === 'de' ? 'Zeitungen & Rufnummern' : 'Newspapers & numbers'}
          </Link>
        </div>
        <p style={{ color: 'var(--tm-grau)', margin: '4px 0 0 0' }}>{meta.beschreibung}</p>
      </header>

      <Schrittleiste
        schritte={[
          { nr: '1', name: T('cockpitPhase1') },
          { nr: '2', name: T('cockpitPhase2') },
          { nr: '3', name: T('cockpitPhase3') },
          { nr: '4', name: T('cockpitPhase4') },
          { nr: '5', name: T('cockpitPhase5') },
        ]}
        aktiv={phase}
        onWechsel={setPhase}
      />

      {phase === 0 && (
        <VorlagePanel
          vorlage={vorlage}
          onGespeichert={(v) => setVorlage(v)}
          startAbc={Boolean(kampagne?.vorlageAbc)}
          abcWahl={kampagne ? (
            <VorschlagWahl
              kampagne={kampagne}
              spieltage={spieltage}
              spieltag={spieltag}
              onGewaehlt={(k, geaendert) => {
                setKampagne(k)
                if (geaendert.length) setSpieltage((alt) => alt.map((x) => geaendert.find((g) => g.id === x.id) ?? x))
              }}
            />
          ) : undefined}
        />
      )}

      {phase === 1 && <div style={{ marginBottom: 16 }}><ZeitungenKurzinfo spielId={spielId} /></div>}
      {phase === 1 && (
        <KampagnePanel
          spielId={spielId}
          spielName={meta.name}
          spielMonate={meta.monate}
          modellWahl={meta.modell}
          istGeldregen={meta.istGeldregen}
          vorschlag={vorlage?.quelle === 'abc' ? vorlage.abc : undefined}
          onFertig={async (k) => {
            setKampagne(k)
            const st = await spieltageLaden(k.id)
            setSpieltage(st)
          }}
        />
      )}

      {phase >= 2 && spieltage.length > 0 && kampagne && (
        <SpieltagLeiste kampagne={kampagne} spieltage={spieltage} aktiv={spieltag?.id} onWahl={setAktiverSpieltag} />
      )}

      <div className={phase >= 2 && kampagne && spieltag ? 'cockpit-mit-vorschau' : ''}>
      <div className="formular">
      {phase === 2 && (
        <RaetselPanel
          spielId={spielId}
          kampagne={kampagne}
          spieltage={spieltage}
          aktiverSpieltag={aktiverSpieltag}
          onAendern={async (id) => {
            setAktiverSpieltag(id)
            if (kampagne) setSpieltage(await spieltageLaden(kampagne.id))
          }}
          onSpeichern={spieltagAktualisieren}
        />
      )}

      {phase === 3 && (
        <GewinnerPanel
          spielId={spielId}
          kampagne={kampagne}
          spieltag={spieltag}
          onAendern={async () => {
            if (kampagne) setSpieltage(await spieltageLaden(kampagne.id))
          }}
          onSpeichern={spieltagAktualisieren}
        />
      )}

      {phase === 4 && (
        <FreigabePanel
          spielId={spielId}
          kampagne={kampagne}
          spieltag={spieltag}
          onAendern={async () => {
            if (kampagne) setSpieltage(await spieltageLaden(kampagne.id))
          }}
          onSpeichern={spieltagAktualisieren}
        />
      )}
      </div>
      {phase >= 2 && kampagne && spieltag && <VorschauSpalte kampagne={kampagne} spieltag={spieltag} onGestaltungAendern={() => setPhase(0)} />}
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
        {phase > 0 && (
          <button type="button" className="cockpit-knopf sekundaer" onClick={() => setPhase((p) => Math.max(0, p - 1))}>
            {T('cockpitZurueck')}
          </button>
        )}
        {phase < 4 && (
          <button type="button" className="cockpit-knopf primaer" onClick={() => setPhase((p) => Math.min(4, p + 1))}>
            {T('cockpitWeiter')}
          </button>
        )}
      </div>
    </>
  )
}
