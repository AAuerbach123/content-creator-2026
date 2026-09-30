'use client'

import { useCallback, useMemo, useState } from 'react'
import { assetLaden, assetSpeichern } from '@/lib/db'
import type { Artefakt, Job, Kanal } from '@/lib/types'
import { assetRefSicherstellen, ebeneAktualisieren, ebenenEigenschaftSetzen, neuesArtefakt } from '@/lib/artefakt'
import { bildErzeugen, copyErzeugen } from '@/lib/dialog-client'
import { kanalById } from '@/lib/kanaele'
import ArtefaktRenderer from './ArtefaktRenderer'
import BildErzeugung from './BildErzeugung'
import CopyErzeugung from './CopyErzeugung'
import EditorAnsicht from './EditorAnsicht'
import ExportPanel from './ExportPanel'
import GrafikerPinAnsicht from './GrafikerPinAnsicht'
import KanalWahl from './KanalWahl'
import KorrekturportalPanel from './KorrekturportalPanel'
import RufnummernInfo from './RufnummernInfo'
import VerlagWahl from './VerlagWahl'
import VideoStudio from './VideoStudio'
import WerkzeugePanel from './WerkzeugePanel'
import HilfePopover from './HilfePopover'
import { useSprache } from './SpracheProvider'

// Phase-2-Panel: Artefakt erzeugen und Layer per Bild-/Text-Vorschlägen füllen.
// Kern: „KI-Rundum-Vorschlag" — auf einen Klick werden Motiv, Headline, Sub, CTA
// von der KI vorgeschlagen und in die richtigen Ebenen geschrieben.

async function orientierungFuerKanal(kanal: Kanal | undefined): Promise<'landscape' | 'portrait' | 'square'> {
  const p = kanalById(kanal)
  if (!p) return 'square'
  const ratio = p.breite / p.hoehe
  if (ratio > 1.1) return 'landscape'
  if (ratio < 0.9) return 'portrait'
  return 'square'
}

export default function ArtefaktWerkstatt({
  job,
  onJobPatch,
}: {
  job: Job
  onJobPatch: (patch: Partial<Job> | ((alt: Job) => Job)) => void
}) {
  const { sprache } = useSprache()
  const [aktuelleId, setAktuelleId] = useState<string | undefined>(job.artefakte[0]?.id)
  const [rundumLaedt, setRundumLaedt] = useState(false)
  const [rundumFehler, setRundumFehler] = useState<string | null>(null)
  const [modus, setModus] = useState<'vorschau' | 'editor'>('vorschau')
  const [letzterVerlagId, setLetzterVerlagId] = useState<string | null>(null)

  const aktuellesArtefakt = useMemo(
    () => job.artefakte.find((a) => a.id === aktuelleId) || job.artefakte[0],
    [aktuelleId, job.artefakte],
  )

  const artefaktSetzen = useCallback(
    (patch: (a: Artefakt) => Artefakt) => {
      if (!aktuellesArtefakt) return
      onJobPatch((alt) => ({
        ...alt,
        artefakte: alt.artefakte.map((a) => (a.id === aktuellesArtefakt.id ? patch(a) : a)),
      }))
    },
    [aktuellesArtefakt, onJobPatch],
  )

  const kanalAendern = useCallback(
    async (k: Kanal) => {
      const richtungFarben = job.richtungen?.find((r) => r.id === job.gewaehlteRichtung)?.farbwelt
      const neu = neuesArtefakt(k, richtungFarben)
      onJobPatch((alt) => ({
        ...alt,
        kanal: k,
        artefakte:
          alt.artefakte.length === 0
            ? [neu]
            : alt.artefakte.map((a) => (a.id === aktuelleId ? { ...neu, id: a.id } : a)),
      }))
      setAktuelleId(neu.id)
    },
    [aktuelleId, job.gewaehlteRichtung, job.richtungen, onJobPatch],
  )

  const neuesArtefaktAnlegen = useCallback(() => {
    if (!job.kanal) return
    const richtungFarben = job.richtungen?.find((r) => r.id === job.gewaehlteRichtung)?.farbwelt
    const neu = neuesArtefakt(job.kanal, richtungFarben)
    onJobPatch((alt) => ({ ...alt, artefakte: [...alt.artefakte, neu] }))
    setAktuelleId(neu.id)
  }, [job.gewaehlteRichtung, job.kanal, job.richtungen, onJobPatch])

  // Banner-Set: alle IAB-Standardgrößen aus dem aktuellen Design ableiten.
  const bannerSetAnlegen = useCallback(() => {
    const richtungFarben = job.richtungen?.find((r) => r.id === job.gewaehlteRichtung)?.farbwelt
    const groessen: import('@/lib/types').Kanal[] = [
      'web-banner-mrec',
      'web-banner-leaderboard',
      'web-banner-skyscraper',
      'web-banner-billboard',
    ]
    const neueArtefakte = groessen.map((g) => neuesArtefakt(g, richtungFarben))
    // Wenn ein aktuelles Artefakt Text-Inhalte hat, in die neuen übernehmen
    if (aktuellesArtefakt) {
      const texte: Record<string, string> = {}
      for (const e of aktuellesArtefakt.ebenen) {
        if (e.typ === 'text') texte[e.id] = (e.eigenschaften.text as string) || ''
      }
      const hg = aktuellesArtefakt.ebenen.find((e) => e.id === 'bg')
      for (const a of neueArtefakte) {
        for (const e of a.ebenen) {
          if (e.typ === 'text' && texte[e.id]) e.eigenschaften.text = texte[e.id]
          if (e.id === 'bg' && hg?.assetHash) {
            e.assetHash = hg.assetHash
            a.assetRefs.push(hg.assetHash)
          }
        }
      }
    }
    onJobPatch((alt) => ({ ...alt, artefakte: [...alt.artefakte, ...neueArtefakte] }))
    setAktuelleId(neueArtefakte[0].id)
  }, [aktuellesArtefakt, job.gewaehlteRichtung, job.richtungen, onJobPatch])

  // KI-Rundum-Vorschlag: Motiv aus Ziel + Richtung ableiten, Bild + Copy parallel
  const rundumVorschlag = useCallback(async () => {
    if (!aktuellesArtefakt) return
    setRundumLaedt(true)
    setRundumFehler(null)
    try {
      const briefingText = job.briefing
        .map((b) => `${b.frage} → ${b.antwort || '—'}`)
        .join('\n')
      const richtung = job.richtungen?.find((r) => r.id === job.gewaehlteRichtung)
      const motiv = `${job.ziel || job.titel}${richtung ? `, Tonalität: ${richtung.tonalitaet}` : ''}`
      const stil = 'fotorealistisch'
      const orient = await orientierungFuerKanal(job.kanal)

      const [bild, headline, sub, cta] = await Promise.all([
        bildErzeugen({ jobId: job.id, motiv, stil, orientierung: orient }),
        copyErzeugen({ jobId: job.id, slot: 'headline', briefing: briefingText, ziel: job.ziel, kanal: job.kanal, sprache, ton: 'nuechtern', anzahl: 1 }),
        copyErzeugen({ jobId: job.id, slot: 'subline', briefing: briefingText, ziel: job.ziel, kanal: job.kanal, sprache, ton: 'nuechtern', anzahl: 1 }),
        copyErzeugen({ jobId: job.id, slot: 'cta', briefing: briefingText, ziel: job.ziel, kanal: job.kanal, sprache, ton: 'werblich', anzahl: 1 }),
      ])

      let hash: string | undefined
      if (bild.dataUrl) {
        const komma = bild.dataUrl.indexOf(',')
        const b64 = komma >= 0 ? bild.dataUrl.slice(komma + 1) : bild.dataUrl
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
        const blob = new Blob([bytes], { type: 'image/png' })
        hash = await assetSpeichern(blob)
      }

      artefaktSetzen((a) => {
        let neu = a
        if (hash) {
          neu = ebeneAktualisieren(neu, 'bg', { assetHash: hash, eigenschaften: { motiv, stil } })
          neu = assetRefSicherstellen(neu, hash)
        }
        if (headline.varianten?.[0]) neu = ebenenEigenschaftSetzen(neu, 'headline', 'text', headline.varianten[0])
        if (sub.varianten?.[0]) neu = ebenenEigenschaftSetzen(neu, 'subline', 'text', sub.varianten[0])
        if (cta.varianten?.[0]) neu = ebenenEigenschaftSetzen(neu, 'cta', 'text', cta.varianten[0])
        return neu
      })

      const fehlerListe = [bild, headline, sub, cta].map((r) => r.fehler).filter(Boolean)
      if (fehlerListe.length) {
        setRundumFehler(fehlerListe.join(' · '))
      }
    } catch (e) {
      setRundumFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setRundumLaedt(false)
    }
  }, [aktuellesArtefakt, artefaktSetzen, job, sprache])

  const bildUebernehmen = useCallback(
    ({ hash }: { hash: string; dataUrl: string; motiv: string; stil: string }) => {
      artefaktSetzen((a) => assetRefSicherstellen(ebeneAktualisieren(a, 'bg', { assetHash: hash }), hash))
    },
    [artefaktSetzen],
  )

  const copyUebernehmen = useCallback(
    (slot: 'headline' | 'subline' | 'cta' | 'body' | 'caption' | 'hashtags', text: string) => {
      const ziel = slot === 'body' ? 'subline' : slot === 'caption' ? 'subline' : slot === 'hashtags' ? 'subline' : slot
      artefaktSetzen((a) => ebenenEigenschaftSetzen(a, ziel, 'text', text))
    },
    [artefaktSetzen],
  )

  // Wird nach „In CTA einsetzen" im RufnummernInfo aufgerufen
  const nummerInCta = useCallback(
    (nummer: string) => {
      artefaktSetzen((a) => ebenenEigenschaftSetzen(a, 'cta', 'text', nummer))
    },
    [artefaktSetzen],
  )

  // Wird nach „Als Notiz speichern" aufgerufen
  const nummerAlsNotiz = useCallback(
    (text: string) => {
      onJobPatch((alt) => ({
        ...alt,
        notizen: [
          ...(alt.notizen || []),
          { id: crypto.randomUUID(), text, erstelltAm: Date.now() },
        ],
      }))
    },
    [onJobPatch],
  )

  const verlagAnwenden = useCallback(
    async (v: import('@/lib/verlage').VerlagsPreset) => {
      setLetzterVerlagId(v.id)
      // Logo in den Asset-Store laden (falls URL), Farben auf die Ebenen anwenden
      let logoHash: string | undefined
      if (v.logoUrl) {
        try {
          const res = await fetch(v.logoUrl)
          if (res.ok) {
            const blob = await res.blob()
            logoHash = await assetSpeichern(blob)
          }
        } catch {}
      }
      const primaer = v.colors.title || '#0b0b0f'
      const akzent = v.colors.prize || v.colors.phone || '#f5f5f7'

      artefaktSetzen((a) => {
        let neu = a
        neu = ebenenEigenschaftSetzen(neu, 'headline', 'farbe', primaer)
        neu = ebenenEigenschaftSetzen(neu, 'headline', 'schriftfamilie', v.fontFamily)
        neu = ebenenEigenschaftSetzen(neu, 'subline', 'farbe', primaer)
        neu = ebenenEigenschaftSetzen(neu, 'subline', 'schriftfamilie', v.fontFamily)
        neu = ebenenEigenschaftSetzen(neu, 'cta', 'hintergrund', akzent)
        if (logoHash) {
          neu = ebeneAktualisieren(neu, 'logo', { assetHash: logoHash })
          neu = assetRefSicherstellen(neu, logoHash)
        } else if (v.logoUrl) {
          neu = ebenenEigenschaftSetzen(neu, 'logo', 'logoUrl', v.logoUrl)
        }
        return neu
      })
    },
    [artefaktSetzen],
  )

  if (!job.kanal || job.artefakte.length === 0) {
    return (
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>
          {sprache === 'de' ? 'Artefakt vorbereiten' : 'Prepare artifact'}
        </div>
        <KanalWahl aktueller={job.kanal} onWahl={kanalAendern} />
      </section>
    )
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{sprache === 'de' ? 'Artefakt' : 'Artifact'}</span>
          <HilfePopover
            de={'Ein Artefakt ist EIN Motiv (Anzeige, Post, Kachel, Video-Rahmen). Ein Job kann mehrere Artefakte enthalten (z. B. IG-Post + Zeitungsanzeige). Umschalter oben rechts: Vorschau ↔ Editor. Der Knopf „KI-Design" füllt Bild + Text in einem Rutsch. Kanal wechseln passt Maße und Safe-Zones an.'}
            en={'An artifact is ONE piece of artwork (ad, post, tile, video frame). A job can hold several artifacts (e.g. IG post + newspaper ad). Toggle at top right: preview ↔ editor. The „AI design" button fills image + text in one go. Changing channel adjusts size and safe zones.'}
            ausrichtung="links"
            anker="artefakt"
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {job.artefakte.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAktuelleId(a.id)}
              style={{
                background: a.id === aktuellesArtefakt?.id ? '#f5f5f7' : 'transparent',
                color: a.id === aktuellesArtefakt?.id ? '#0b0b0f' : '#f5f5f7',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '3px 10px',
                borderRadius: 5,
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {a.format.split(' ')[0]}
            </button>
          ))}
          <button
            type="button"
            onClick={neuesArtefaktAnlegen}
            style={{
              background: 'transparent',
              color: '#f5f5f7',
              border: '1px dashed rgba(255,255,255,0.2)',
              padding: '3px 10px',
              borderRadius: 5,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            +
          </button>
          {job.kanal?.startsWith('web-banner') && (
            <button
              type="button"
              onClick={bannerSetAnlegen}
              title={sprache === 'de' ? 'IAB-Banner-Set (MRec, Leaderboard, Skyscraper, Billboard) aus dem Design' : 'IAB banner set from this design'}
              style={{
                background: '#60a5fa',
                color: '#0b0b0f',
                border: 'none',
                padding: '3px 10px',
                borderRadius: 5,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              📐 Banner-Set
            </button>
          )}
        </div>
      </div>

      {aktuellesArtefakt && (
        <>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['vorschau', 'editor'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModus(m)}
                style={{
                  background: modus === m ? '#f5f5f7' : 'transparent',
                  color: modus === m ? '#0b0b0f' : '#f5f5f7',
                  border: '1px solid rgba(255,255,255,0.15)',
                  padding: '4px 12px',
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {m === 'vorschau'
                  ? sprache === 'de'
                    ? 'Vorschau'
                    : 'Preview'
                  : sprache === 'de'
                    ? 'Editor'
                    : 'Editor'}
              </button>
            ))}
          </div>
          {modus === 'vorschau' ? (
            <ArtefaktRenderer artefakt={aktuellesArtefakt} maxBreite={560} />
          ) : (
            <EditorAnsicht
              jobId={job.id}
              artefakt={aktuellesArtefakt}
              onAendern={(neu) =>
                onJobPatch((alt) => ({
                  ...alt,
                  artefakte: alt.artefakte.map((a) => (a.id === aktuellesArtefakt.id ? neu : a)),
                }))
              }
            />
          )}
        </>
      )}

      <button
        type="button"
        onClick={rundumVorschlag}
        disabled={rundumLaedt}
        style={{
          background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
          color: '#0b0b0f',
          border: 'none',
          padding: '10px 16px',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 14,
          cursor: rundumLaedt ? 'not-allowed' : 'pointer',
          opacity: rundumLaedt ? 0.6 : 1,
          alignSelf: 'flex-start',
        }}
      >
        {rundumLaedt
          ? sprache === 'de'
            ? '🧠 KI arbeitet …'
            : '🧠 AI is working …'
          : sprache === 'de'
            ? '✨ KI schlägt komplettes Design vor'
            : '✨ AI proposes complete design'}
      </button>
      {rundumFehler && (
        <p style={{ margin: 0, color: '#fecaca', fontSize: 12 }}>⚠ {rundumFehler}</p>
      )}

      <details>
        <summary style={{ cursor: 'pointer', fontSize: 13, opacity: 0.7 }}>
          {sprache === 'de' ? 'Bilder erzeugen' : 'Generate images'}
        </summary>
        <div style={{ marginTop: 8 }}>
          <BildErzeugung
            jobId={job.id}
            vorschlagMotiv={job.ziel || job.titel}
            onUebernehmen={bildUebernehmen}
          />
        </div>
      </details>

      <details>
        <summary style={{ cursor: 'pointer', fontSize: 13, opacity: 0.7 }}>
          {sprache === 'de' ? 'Text erzeugen' : 'Generate copy'}
        </summary>
        <div style={{ marginTop: 8 }}>
          <CopyErzeugung
            jobId={job.id}
            briefing={job.briefing.map((b) => `${b.frage}: ${b.antwort || ''}`).join('\n')}
            ziel={job.ziel}
            kanal={job.kanal}
            onUebernehmen={copyUebernehmen}
          />
        </div>
      </details>

      <details>
        <summary style={{ cursor: 'pointer', fontSize: 13, opacity: 0.7 }}>
          {sprache === 'de' ? 'Verlag / Brand-Kit anwenden' : 'Apply publisher / brand kit'}
        </summary>
        <div style={{ marginTop: 8 }}>
          <VerlagWahl onWahl={verlagAnwenden} />
          {letzterVerlagId && (
            <RufnummernInfo
              presetId={letzterVerlagId}
              onInCta={nummerInCta}
              onAlsNotiz={nummerAlsNotiz}
            />
          )}
        </div>
      </details>

      <details>
        <summary style={{ cursor: 'pointer', fontSize: 13, opacity: 0.7 }}>
          {sprache === 'de' ? 'Kanal wechseln' : 'Change channel'}
        </summary>
        <div style={{ marginTop: 8 }}>
          <KanalWahl aktueller={job.kanal} onWahl={kanalAendern} />
        </div>
      </details>

      {job.kanal === 'kurzvideo' && <VideoStudio job={job} onJobPatch={onJobPatch} />}

      <ExportPanel job={job} artefakt={aktuellesArtefakt} />

      <KorrekturportalPanel job={job} artefaktId={aktuellesArtefakt?.id} />

      {aktuellesArtefakt && (
        <GrafikerPinAnsicht jobId={job.id} artefaktId={aktuellesArtefakt.id} artefakt={aktuellesArtefakt} />
      )}

      <WerkzeugePanel
        job={job}
        artefakt={aktuellesArtefakt}
        onJobPatch={(p) => onJobPatch(p)}
        onArtefaktPatch={(neu) =>
          aktuellesArtefakt &&
          onJobPatch((alt) => ({
            ...alt,
            artefakte: alt.artefakte.map((a) => (a.id === aktuellesArtefakt.id ? neu : a)),
          }))
        }
      />
    </section>
  )
}
