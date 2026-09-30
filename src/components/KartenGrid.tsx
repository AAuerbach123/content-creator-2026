'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { alleJobsLaden, jobErstellen } from '@/lib/db'
import HilfePopover from './HilfePopover'
import { useSprache } from './SpracheProvider'
import type { Schluessel } from '@/lib/i18n'

type KartenDef = {
  titel: Schluessel
  hinweis: Schluessel
  icon: string
  aktiv: boolean
  onClick?: () => void | Promise<void>
  badge?: string
  hilfeDe: string
  hilfeEn: string
  anker: string
}

export default function KartenGrid({
  onJobAngelegt,
  onJobOeffnen,
}: {
  onJobAngelegt?: () => void
  onJobOeffnen?: (id: string) => void
}) {
  const { T, sprache } = useSprache()
  const router = useRouter()
  const [jobAnzahl, setJobAnzahl] = useState(0)
  const [zeigeListe, setZeigeListe] = useState(false)

  const nachladen = useCallback(async () => {
    setJobAnzahl((await alleJobsLaden()).length)
  }, [])

  useEffect(() => {
    nachladen()
  }, [nachladen])

  const neuerJob = useCallback(async () => {
    const nummer = (await alleJobsLaden()).length + 1
    const job = await jobErstellen(
      sprache === 'de' ? `Job #${nummer}` : `Job #${nummer}`,
      '',
    )
    await nachladen()
    onJobAngelegt?.()
    onJobOeffnen?.(job.id)
  }, [nachladen, onJobAngelegt, onJobOeffnen, sprache])

  const karten: KartenDef[] = [
    {
      titel: 'cardNewJob',
      hinweis: 'cardNewJobHint',
      icon: '＋',
      aktiv: true,
      onClick: neuerJob,
      hilfeDe: 'Legt sofort einen leeren Job an und öffnet den JobEditor. Nutze das KI-Zentrum darüber, wenn du der KI dein Ziel mitteilen willst.',
      hilfeEn: 'Creates a blank job and opens the JobEditor right away. Use the AI centre above if you want the AI to hear your goal first.',
      anker: 'karten',
    },
    {
      titel: 'cardActiveJobs',
      hinweis: 'cardActiveJobsHint',
      icon: '▤',
      aktiv: jobAnzahl > 0,
      badge: jobAnzahl > 0 ? String(jobAnzahl) : undefined,
      onClick: () => setZeigeListe((v) => !v),
      hilfeDe: 'Klapp die Liste deiner Jobs aus (nur wenn welche existieren). Jobs leben in IndexedDB (Store „jobs") und bleiben zwischen Sitzungen erhalten.',
      hilfeEn: 'Unfolds your list of jobs (only when some exist). Jobs live in IndexedDB (store „jobs") and persist across sessions.',
      anker: 'karten',
    },
    {
      titel: 'cardBrandKits',
      hinweis: 'cardBrandKitsHint',
      icon: '◐',
      aktiv: false,
      hilfeDe: 'Für Farben, Schriften und Logos deiner Verlage. Aktuell laufen die 46 Verlags-Presets über „Verlag / Brand-Kit anwenden" in der ArtefaktWerkstatt.',
      hilfeEn: 'For publisher colours, fonts and logos. Currently the 46 publisher presets are applied via "Apply publisher / brand kit" in the artifact workshop.',
      anker: 'karten',
    },
    {
      titel: 'cardTemplates',
      hinweis: 'cardTemplatesHint',
      icon: '▧',
      aktiv: false,
      hilfeDe: 'Eigene wiederverwendbare Vorlagen (Store „vorlagen"). Kommt bald als eigene Seite; bis dahin kannst du im Werkzeuge-Panel im Job eine Vorlage speichern.',
      hilfeEn: 'Your reusable templates (store „vorlagen"). Own page coming soon; until then you can save a template from the tools panel inside a job.',
      anker: 'karten',
    },
    {
      titel: 'cardAssets',
      hinweis: 'cardAssetsHint',
      icon: '⬒',
      aktiv: false,
      hilfeDe: 'Bilder, Videos, Audios (Store „assets", content-adressiert per SHA-256, Regel 2). Kommt bald als eigene Seite; im Job siehst du sie als Ebenen.',
      hilfeEn: 'Images, videos, audios (store „assets", content-addressed by SHA-256, Rule 2). Own page coming soon; inside a job they appear as layers.',
      anker: 'karten',
    },
    {
      titel: 'cardExports',
      hinweis: 'cardExportsHint',
      icon: '↥',
      aktiv: false,
      hilfeDe: 'Zusammenfassung fertiger Abgaben je Kanal. Aktuell exportierst du je Job aus dem Editor (Panel „Exporte") und siehst dort direkt das Gewicht.',
      hilfeEn: 'Summary of finished deliverables per channel. Currently you export per job from the editor („Exports" panel) with the file weight shown right there.',
      anker: 'exporte',
    },
    {
      titel: 'cardRufnummern',
      hinweis: 'cardRufnummernHint',
      icon: '☎',
      aktiv: true,
      onClick: () => router.push('/rufnummern'),
      hilfeDe: 'Wissensquiz-Nummern (Endziffer 1–5) und Geldregen-Nummern (MWN Print/Web) je Zeitung — Tabelle nach Gruppe, Suche, Hinweise, Quellen. Bei Verlagswahl im Job werden die passenden Nummern automatisch übernommen; fehlende Nummern werden gewarnt, nie erfunden.',
      hilfeEn: 'Wissensquiz numbers (last digit 1–5) and Geldregen numbers (MWN Print/Web) per newspaper — table by group, search, hints, sources. Publisher choice in a job auto-fills the matching numbers; missing numbers show a warning, never invented.',
      anker: 'rufnummern',
    },
  ]

  return (
    <section
      aria-label={sprache === 'de' ? 'Startkarten' : 'Start cards'}
      style={{
        width: '100%',
        maxWidth: 960,
        marginTop: 28,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
      }}
    >
      {karten.map((karte) => (
        <div
          key={karte.titel}
          style={{ position: 'relative' }}
        >
          <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
            <HilfePopover de={karte.hilfeDe} en={karte.hilfeEn} anker={karte.anker} />
          </div>
          <button
            type="button"
            onClick={karte.onClick}
            disabled={!karte.aktiv}
            style={{
              width: '100%',
              textAlign: 'left',
              background: karte.aktiv
                ? 'rgba(255,255,255,0.85)'
                : 'rgba(255,255,255,0.55)',
              border: `1px solid ${
                karte.aktiv ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)'
              }`,
              borderRadius: 14,
              padding: '18px 16px',
              color: '#0b0b0f',
              cursor: karte.aktiv ? 'pointer' : 'not-allowed',
              transition: 'background 120ms ease, border-color 120ms ease',
              opacity: karte.aktiv ? 1 : 0.55,
              fontFamily: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              minHeight: 108,
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (karte.aktiv) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.98)'
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.22)'
              }
            }}
            onMouseLeave={(e) => {
              if (karte.aktiv) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.85)'
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'
              }
            }}
          >
            <span aria-hidden style={{ fontSize: 22, opacity: 0.85 }}>
              {karte.icon}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{T(karte.titel)}</span>
            <span style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.35 }}>{T(karte.hinweis)}</span>

            {karte.badge && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 12,
                  right: 12,
                  background: '#0b0b0f',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 999,
                  minWidth: 20,
                  textAlign: 'center',
                }}
              >
                {karte.badge}
              </span>
            )}

            {!karte.aktiv && karte.titel !== 'cardActiveJobs' && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 10,
                  right: 12,
                  fontSize: 10,
                  opacity: 0.5,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {T('cardComingSoon')}
              </span>
            )}
          </button>
        </div>
      ))}
    </section>
  )
}
