'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { jobLaden, jobSpeichern } from '@/lib/db'
import {
  dialogAufrufen,
  jobFuerPrompt,
  type BriefingAntwort,
  type EinstiegAntwort,
  type MCFragenAntwort,
  type RichtungenAntwort,
  type SchrittplanAntwort,
} from '@/lib/dialog-client'
import type {
  Einstiegsweg,
  FrageAntwort,
  Job,
  Nachricht,
  Richtung,
  Schritt,
  VorlagenAnalyse,
} from '@/lib/types'
import ArtefaktWerkstatt from './ArtefaktWerkstatt'
import HandbuchKnopf from './HandbuchKnopf'
import HilfePopover from './HilfePopover'
import KIDialog from './KIDialog'
import KIVerlaufPanel from './KIVerlaufPanel'
import MCFragenPanel, { type MCFrage } from './MCFragenPanel'
import OnboardingTour from './OnboardingTour'
import RichtungenPanel from './RichtungenPanel'
import SchrittplanPanel from './SchrittplanPanel'
import SpracheUmschalter from './SpracheUmschalter'
import { useSprache } from './SpracheProvider'
import VorlagenUpload from './VorlagenUpload'
import WegAuswahl from './WegAuswahl'

// Zentrale Orchestrierung des Job-Editors (Phase 1).
// Zustand steckt in Job selbst und wird nach jeder Änderung mit jobSpeichern
// persistiert (dank Snapshot-Rotation aus Regel 3).

export default function JobEditor({
  jobId,
  onZurueck,
}: {
  jobId: string
  onZurueck: () => void
}) {
  const { T, sprache } = useSprache()
  const [job, setJob] = useState<Job | null>(null)
  const [laden, setLaden] = useState(true)
  const [kiLaedt, setKiLaedt] = useState(false)
  const [dialogFehler, setDialogFehler] = useState<string | null>(null)
  const [mcFragen, setMcFragen] = useState<MCFrage[]>([])
  const [verlaufNonce, setVerlaufNonce] = useState(0)
  const [titelBearbeiten, setTitelBearbeiten] = useState(false)
  const [titelPuffer, setTitelPuffer] = useState('')
  const [tourManuell, setTourManuell] = useState(false)

  useEffect(() => {
    let abgebrochen = false
    setLaden(true)
    jobLaden(jobId)
      .then((j) => {
        if (!abgebrochen) setJob(j || null)
      })
      .finally(() => {
        if (!abgebrochen) setLaden(false)
      })
    return () => {
      abgebrochen = true
    }
  }, [jobId])

  const jobPatch = useCallback(
    async (patch: Partial<Job> | ((alt: Job) => Job)) => {
      setJob((alt) => {
        if (!alt) return alt
        const neu = typeof patch === 'function' ? patch(alt) : { ...alt, ...patch }
        jobSpeichern(neu).catch(() => {})
        return neu
      })
    },
    [],
  )

  const dialogAnhaengen = useCallback(
    async (rolle: Nachricht['rolle'], text: string, metadaten?: Record<string, unknown>) => {
      await jobPatch((alt) => ({
        ...alt,
        dialog: [
          ...alt.dialog,
          {
            id: crypto.randomUUID(),
            rolle,
            text,
            zeitpunkt: Date.now(),
            metadaten,
          },
        ],
      }))
    },
    [jobPatch],
  )

  const historieFuerPrompt = useCallback((j: Job) => {
    return j.dialog
      .filter((n) => n.rolle !== 'system')
      .slice(-12)
      .map((n) => ({ rolle: n.rolle as 'nutzer' | 'ki', text: n.text }))
  }, [])

  // -------------- Weg wählen --------------
  const wegSetzen = useCallback(
    async (weg: Einstiegsweg) => {
      if (!job) return
      await jobPatch({ einstieg: weg })
      if (weg === 'A-ohne-vorstellung' || weg === 'B-vorstellung-im-kopf') {
        // Erste offene Frage vom KI-Interviewer holen
        setKiLaedt(true)
        setDialogFehler(null)
        try {
          const antwort = await dialogAufrufen<BriefingAntwort>('briefing-frage', {
            jobId,
            sprache,
            nutzerText: sprache === 'de' ? 'Starte das Briefing.' : 'Start the briefing.',
            jobKontext: { ...jobFuerPrompt(job), einstieg: weg },
          })
          setVerlaufNonce((n) => n + 1)
          if (antwort.ok && antwort.daten) {
            const frage = antwort.daten.naechsteFrage
            if (frage) await dialogAnhaengen('ki', frage)
          } else {
            setDialogFehler(antwort.fehler || null)
          }
        } catch (e) {
          setDialogFehler(e instanceof Error ? e.message : String(e))
        } finally {
          setKiLaedt(false)
        }
      } else {
        // Weg C: der Nutzer lädt zuerst eine Vorlage hoch
        await dialogAnhaengen(
          'system',
          sprache === 'de'
            ? 'Lade jetzt deine Vorlage hoch. Ich analysiere sie und frage dich anschließend, was wir übernehmen.'
            : 'Upload your reference now. I will analyse it and then ask what to keep.',
        )
      }
    },
    [dialogAnhaengen, job, jobId, jobPatch, sprache],
  )

  // -------------- Nachricht senden (Briefing-Weg A/B) --------------
  const nachrichtSenden = useCallback(
    async (text: string) => {
      if (!job) return
      await dialogAnhaengen('nutzer', text)

      const briefingAntwort: FrageAntwort = {
        id: crypto.randomUUID(),
        frage: job.dialog.filter((n) => n.rolle === 'ki').at(-1)?.text || '—',
        typ: 'offen',
        antwort: text,
        gestelltAm: Date.now(),
        beantwortetAm: Date.now(),
      }
      await jobPatch((alt) => ({ ...alt, briefing: [...alt.briefing, briefingAntwort] }))

      setKiLaedt(true)
      setDialogFehler(null)
      try {
        const kontextJob = { ...job, briefing: [...job.briefing, briefingAntwort] }
        const antwort = await dialogAufrufen<BriefingAntwort>('briefing-frage', {
          jobId,
          sprache,
          nutzerText: text,
          jobKontext: jobFuerPrompt(kontextJob),
          historie: historieFuerPrompt(kontextJob),
        })
        setVerlaufNonce((n) => n + 1)

        if (!antwort.ok || !antwort.daten) {
          setDialogFehler(antwort.fehler || null)
          if (antwort.rohtext) await dialogAnhaengen('system', `${T('dialogRohtext')}\n${antwort.rohtext}`)
          return
        }

        if (antwort.daten.abgeschlossen) {
          const zusammenfassung =
            antwort.daten.zusammenfassung || (sprache === 'de' ? 'Briefing abgeschlossen.' : 'Briefing complete.')
          const empfKanal = antwort.daten.empfohlenerKanal
          await dialogAnhaengen('ki', `✓ ${zusammenfassung}`)
          await jobPatch((alt) => ({
            ...alt,
            kanal:
              empfKanal &&
              (['zeitung','zeitschrift','web-banner-mrec','web-banner-leaderboard','web-banner-skyscraper','web-banner-billboard','web-content','ig-feed','ig-story','ig-reel','fb-post','linkedin-post','x-post','kurzvideo'] as string[]).includes(empfKanal)
                ? (empfKanal as Job['kanal'])
                : alt.kanal,
            status: 'in-arbeit',
          }))
        } else if (antwort.daten.naechsteFrage) {
          await dialogAnhaengen('ki', antwort.daten.naechsteFrage)
        }
      } catch (e) {
        setDialogFehler(e instanceof Error ? e.message : String(e))
      } finally {
        setKiLaedt(false)
      }
    },
    [dialogAnhaengen, historieFuerPrompt, job, jobId, jobPatch, sprache, T],
  )

  // -------------- Drei Richtungen holen (Weg A) --------------
  const richtungenHolen = useCallback(async () => {
    if (!job) return
    setKiLaedt(true)
    setDialogFehler(null)
    try {
      const antwort = await dialogAufrufen<RichtungenAntwort>('drei-richtungen', {
        jobId,
        sprache,
        jobKontext: jobFuerPrompt(job),
      })
      setVerlaufNonce((n) => n + 1)
      if (antwort.ok && antwort.daten?.richtungen) {
        await jobPatch({ richtungen: antwort.daten.richtungen })
        await dialogAnhaengen(
          'ki',
          sprache === 'de'
            ? 'Ich habe drei Richtungen vorbereitet — welche gefällt dir?'
            : 'I have three directions ready — which one do you like?',
        )
      } else {
        setDialogFehler(antwort.fehler || null)
      }
    } catch (e) {
      setDialogFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setKiLaedt(false)
    }
  }, [dialogAnhaengen, job, jobId, jobPatch, sprache])

  const richtungWaehlen = useCallback(
    async (id: string) => {
      if (!job) return
      const gewaehlt = job.richtungen?.find((r) => r.id === id)
      await jobPatch({ gewaehlteRichtung: id })
      await dialogAnhaengen(
        'nutzer',
        sprache === 'de' ? `Ich nehme „${gewaehlt?.name}".` : `I take "${gewaehlt?.name}".`,
      )
      await schrittplanErzeugen()
    },
    [dialogAnhaengen, job, jobPatch, sprache],
  )

  // -------------- Schrittplan erzeugen --------------
  const schrittplanErzeugen = useCallback(async () => {
    if (!job) return
    setKiLaedt(true)
    setDialogFehler(null)
    try {
      const antwort = await dialogAufrufen<SchrittplanAntwort>('schrittplan', {
        jobId,
        sprache,
        jobKontext: jobFuerPrompt(job),
      })
      setVerlaufNonce((n) => n + 1)
      if (antwort.ok && antwort.daten?.schritte) {
        const schritte: Schritt[] = antwort.daten.schritte.map((s, idx) => ({
          id: s.id || crypto.randomUUID(),
          titel: s.titel,
          beschreibung: s.beschreibung,
          reihenfolge: idx,
          status: 'ki-vorschlag',
        }))
        await jobPatch({ schrittplan: schritte })
        await dialogAnhaengen(
          'ki',
          sprache === 'de'
            ? '✓ Schrittplan steht rechts. Hak Schritte ab, wie du sie erledigst.'
            : '✓ Step plan on the right. Tick steps as you complete them.',
        )
      } else {
        setDialogFehler(antwort.fehler || null)
      }
    } catch (e) {
      setDialogFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setKiLaedt(false)
    }
  }, [dialogAnhaengen, job, jobId, jobPatch, sprache])

  // -------------- Vorlage analysiert (Weg C) --------------
  const vorlageFertig = useCallback(
    async ({ hash, analyse }: { hash: string; analyse: VorlagenAnalyse }) => {
      if (!job) return
      await jobPatch({ vorlageRef: hash, vorlagenAnalyse: analyse })
      await dialogAnhaengen(
        'system',
        sprache === 'de'
          ? `Analyse fertig: ${analyse.farben?.length || 0} Farben, ${analyse.schriftKandidaten?.length || 0} Schrift-Kandidaten erkannt.`
          : `Analysis done: ${analyse.farben?.length || 0} colors, ${analyse.schriftKandidaten?.length || 0} font candidates.`,
      )
      // MC-Fragen dazu
      setKiLaedt(true)
      try {
        const antwort = await dialogAufrufen<MCFragenAntwort>('mc-vorlage', {
          jobId,
          sprache,
          jobKontext: { ...jobFuerPrompt(job), vorlagenAnalyse: analyse },
        })
        setVerlaufNonce((n) => n + 1)
        if (antwort.ok && antwort.daten?.fragen) {
          setMcFragen(antwort.daten.fragen)
        } else {
          setDialogFehler(antwort.fehler || null)
        }
      } finally {
        setKiLaedt(false)
      }
    },
    [dialogAnhaengen, job, jobId, jobPatch, sprache],
  )

  const mcAntwort = useCallback(
    async (frageId: string, antwort: string) => {
      setMcFragen((alt) => alt.map((f) => (f.id === frageId ? { ...f, antwort } : f)))
      if (!job) return
      const jetzt = Date.now()
      const eintrag: FrageAntwort = {
        id: frageId,
        frage: mcFragen.find((f) => f.id === frageId)?.frage || '—',
        typ: 'multiple-choice',
        optionen: mcFragen.find((f) => f.id === frageId)?.optionen,
        antwort,
        gestelltAm: jetzt,
        beantwortetAm: jetzt,
      }
      await jobPatch((alt) => {
        const ohne = alt.briefing.filter((b) => b.id !== frageId)
        return { ...alt, briefing: [...ohne, eintrag] }
      })
    },
    [job, jobPatch, mcFragen],
  )

  const schrittStatus = useCallback(
    async (id: string, status: Schritt['status']) => {
      await jobPatch((alt) => ({
        ...alt,
        schrittplan: alt.schrittplan.map((s) => (s.id === id ? { ...s, status } : s)),
      }))
    },
    [jobPatch],
  )

  const titelSpeichern = useCallback(async () => {
    const neu = titelPuffer.trim()
    if (neu) await jobPatch({ titel: neu })
    setTitelBearbeiten(false)
  }, [jobPatch, titelPuffer])

  // Nachrichten für den Chat vorbereiten
  const nachrichten: Nachricht[] = useMemo(() => job?.dialog ?? [], [job])

  const briefingAbgeschlossen = useMemo(() => {
    if (!job) return false
    return job.briefing.length >= 2 && job.dialog.some((n) => n.rolle === 'ki' && n.text.startsWith('✓'))
  }, [job])

  if (laden) {
    return (
      <div style={{ padding: 40, color: '#f5f5f7', textAlign: 'center' }}>
        {sprache === 'de' ? 'Lade Job …' : 'Loading job …'}
      </div>
    )
  }

  if (!job) {
    return (
      <div style={{ padding: 40, color: '#f5f5f7', textAlign: 'center' }}>
        {sprache === 'de' ? 'Job nicht gefunden.' : 'Job not found.'}
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0b0b0f',
        color: '#f5f5f7',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <button
            type="button"
            onClick={onZurueck}
            style={{
              background: 'transparent',
              color: '#f5f5f7',
              border: '1px solid rgba(255,255,255,0.15)',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {T('jobZurueck')}
          </button>
          {titelBearbeiten ? (
            <input
              autoFocus
              value={titelPuffer}
              placeholder={T('jobTitelPlaceholder')}
              onChange={(e) => setTitelPuffer(e.target.value)}
              onBlur={titelSpeichern}
              onKeyDown={(e) => {
                if (e.key === 'Enter') titelSpeichern()
                if (e.key === 'Escape') setTitelBearbeiten(false)
              }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#f5f5f7',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 14,
                fontFamily: 'inherit',
                minWidth: 220,
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTitelPuffer(job.titel)
                setTitelBearbeiten(true)
              }}
              title={T('jobUmbenennen')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f5f5f7',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
            >
              {job.titel} <span style={{ opacity: 0.4, fontSize: 11 }}>✎</span>
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <HandbuchKnopf anker="artefakt" />
          <HilfePopover
            de="Links: KI-Dialog + Editor. Rechts: Schrittplan + KI-Verlauf. Der Titel oben ist editierbar. Titelklick ✎ = umbenennen. Zurück zur Übersicht mit dem Zurück-Knopf."
            en="Left: AI dialog + editor. Right: step plan + AI log. Title editable at top. Back to overview with the back button."
            anker="artefakt"
          />
          <button
            type="button"
            onClick={() => setTourManuell(true)}
            title={sprache === 'de' ? 'Kurz-Tour zeigen' : 'Show short tour'}
            style={{
              width: 26,
              height: 26,
              padding: 0,
              borderRadius: '50%',
              background: 'transparent',
              color: '#f5f5f7',
              border: '1px solid rgba(255,255,255,0.15)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ★
          </button>
          <SpracheUmschalter />
        </div>
      </header>
      <OnboardingTour manuell={tourManuell} onSchliessen={() => setTourManuell(false)} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: 16,
          padding: 16,
          alignItems: 'start',
        }}
      >
        <main style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {!job.einstieg && <WegAuswahl onWahl={wegSetzen} />}

          {job.einstieg === 'C-vorlage' && !job.vorlagenAnalyse && (
            <VorlagenUpload jobId={job.id} onFertig={vorlageFertig} />
          )}

          {job.einstieg && (
            <KIDialog
              nachrichten={nachrichten}
              onSenden={nachrichtSenden}
              laedt={kiLaedt}
              fehler={dialogFehler}
              eingabeAktiv={job.einstieg !== 'C-vorlage' || !!job.vorlagenAnalyse}
            />
          )}

          {mcFragen.length > 0 && <MCFragenPanel fragen={mcFragen} onAntwort={mcAntwort} />}

          {job.einstieg === 'A-ohne-vorstellung' && briefingAbgeschlossen && !job.richtungen && (
            <button
              type="button"
              onClick={richtungenHolen}
              disabled={kiLaedt}
              style={{
                alignSelf: 'flex-start',
                background: '#60a5fa',
                color: '#0b0b0f',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {T('briefingWeiter')} →
            </button>
          )}

          {job.richtungen && (
            <RichtungenPanel
              richtungen={job.richtungen as Richtung[]}
              aktuellGewaehlt={job.gewaehlteRichtung}
              onWaehlen={richtungWaehlen}
            />
          )}

          {job.einstieg === 'B-vorstellung-im-kopf' &&
            briefingAbgeschlossen &&
            job.schrittplan.length === 0 && (
              <button
                type="button"
                onClick={schrittplanErzeugen}
                disabled={kiLaedt}
                style={{
                  alignSelf: 'flex-start',
                  background: '#34d399',
                  color: '#0b0b0f',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {T('briefingSchrittplan')} →
              </button>
            )}

          {(job.schrittplan.length > 0 || job.gewaehlteRichtung) && (
            <ArtefaktWerkstatt job={job} onJobPatch={jobPatch} />
          )}
        </main>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 16 }}>
          <SchrittplanPanel schritte={job.schrittplan} onStatus={schrittStatus} />
          <KIVerlaufPanel jobId={job.id} nonce={verlaufNonce} />
        </aside>
      </div>
    </div>
  )
}
