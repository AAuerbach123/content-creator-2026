'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { alleJobsLaden, jobErstellen } from '@/lib/db'
import HilfePopover from './HilfePopover'
import { useSprache } from './SpracheProvider'
import type { Schluessel } from '@/lib/i18n'

// Startkarten der Startseite. Zwei Darstellungen:
//  • layout="kreis"  (Laptop/Desktop ≥ 1100 px): Karten als runde Kacheln auf einer
//    Kreisbahn (per Trigonometrie), die KI-Eingabe (`zentrum`) steht in der Mitte.
//    Der Kreis wird so bemessen, dass er in die Fensterhöhe passt.
//  • layout="raster" (Tablet/Handy): KI-Eingabe oben, darunter ein Raster
//    (2 Spalten ab 560 px, sonst 1 Spalte). Nichts läuft horizontal über.
// Die KI-Eingabe bleibt in beiden Layouts an derselben Stelle im React-Baum,
// damit getippter Text beim Umschalten (Fenster ziehen) nicht verloren geht.

// Telemedia-Farben (Logo): Rot #C8102E, Dunkelrot #9E0B22, Hellgrau #D2D4DC.
export const TM = {
  rot: '#C8102E',
  dunkelrot: '#9E0B22',
  hellgrau: '#D2D4DC',
  rosa: '#F9E6EA',
  grauText: '#6E7380',
  schrift: '#1d1d1f',
} as const

type Thema = 'rot' | 'dunkelrot' | 'grau' | 'weiss'

type ThemaStil = {
  hintergrund: string
  rand: string
  titel: string
  hinweis: string
  iconHg: string
  iconFarbe: string
  schatten: string
}

// Alle Paare auf WCAG-AA geprüft (Titel ≥ 4.5:1 bzw. große Schrift ≥ 3:1).
const THEMEN: Record<Thema | 'blass', ThemaStil> = {
  rot: {
    hintergrund: `linear-gradient(140deg, ${TM.rot} 0%, ${TM.dunkelrot} 100%)`,
    rand: `2px solid ${TM.rot}`,
    titel: '#ffffff',
    hinweis: '#FFF1F3',
    iconHg: 'rgba(255,255,255,0.18)',
    iconFarbe: '#ffffff',
    schatten: '0 10px 26px rgba(158,11,34,0.30)',
  },
  dunkelrot: {
    hintergrund: TM.dunkelrot,
    rand: `2px solid ${TM.dunkelrot}`,
    titel: '#ffffff',
    hinweis: TM.rosa,
    iconHg: 'rgba(255,255,255,0.16)',
    iconFarbe: '#ffffff',
    schatten: '0 10px 26px rgba(158,11,34,0.28)',
  },
  grau: {
    hintergrund: TM.hellgrau,
    rand: `2px solid ${TM.hellgrau}`,
    titel: TM.dunkelrot,
    hinweis: '#3E424C',
    iconHg: '#ffffff',
    iconFarbe: TM.rot,
    schatten: '0 8px 22px rgba(30,32,40,0.14)',
  },
  weiss: {
    hintergrund: '#ffffff',
    rand: `2px solid ${TM.rot}`,
    titel: TM.dunkelrot,
    hinweis: TM.grauText,
    iconHg: TM.rosa,
    iconFarbe: TM.rot,
    schatten: '0 8px 22px rgba(158,11,34,0.12)',
  },
  // Deaktiviert („kommt bald"): blass, aber lesbar.
  blass: {
    hintergrund: '#F6F6F8',
    rand: '1.5px dashed #C3C6D0',
    titel: '#5B606C',
    hinweis: '#666B78',
    iconHg: '#ECEDF1',
    iconFarbe: '#8B91A0',
    schatten: 'none',
  },
}

type KartenDef = {
  titel: Schluessel
  hinweis: Schluessel
  icon: string
  aktiv: boolean
  thema: Thema
  /** größere Kachel auf den Kreisachsen (oben/rechts/unten/links) */
  prominent: boolean
  /** Position auf der Kreisbahn (0 = oben, im Uhrzeigersinn) */
  kreisPos: number
  onClick?: () => void | Promise<void>
  badge?: string
  zeigeBald: boolean
  hilfeDe: string
  hilfeEn: string
  anker: string
}

// ---------------------------------------------------------------------------
// Fenstergröße ohne Hydrations-Konflikt (Server: null)
// ---------------------------------------------------------------------------

function fensterAbonnieren(cb: () => void) {
  window.addEventListener('resize', cb)
  return () => window.removeEventListener('resize', cb)
}

export function useFenster(): { w: number; h: number } | null {
  const schnappschuss = useSyncExternalStore(
    fensterAbonnieren,
    () => `${window.innerWidth}x${window.innerHeight}`,
    () => '',
  )
  if (!schnappschuss) return null
  const [w, h] = schnappschuss.split('x').map(Number)
  return { w, h }
}

export const KREIS_AB_BREITE = 1100
// Platz, den Kopfzeile + Abstände über/unter dem Kreis brauchen.
const KOPF_RESERVE = 136

function kreisMasse(w: number, h: number) {
  // Fast bildschirmfüllend (Andreas 05.10.): Kacheln auf einer Ellipse über die ganze Fensterfläche,
  // die KI-Eingabe in der Mitte so groß wie möglich.
  const B = Math.max(980, w - 48)
  const H = Math.max(620, h - KOPF_RESERVE)
  const gross = Math.round(Math.min(220, Math.max(132, Math.min(B, H) * 0.2)))
  const klein = Math.round(gross * 0.86)
  const Rx = (B - gross) / 2
  const Ry = (H - gross) / 2
  const kiBreite = Math.round(Math.min(1000, 2 * (Rx - gross / 2 - 24) * 0.78))
  return { B, H, gross, klein, Rx, Ry, kiBreite, kompakt: H < 700 }
}

export default function KartenGrid({
  layout,
  zentrum,
  onJobAngelegt,
  onJobOeffnen,
}: {
  layout: 'kreis' | 'raster'
  /** KI-Eingabe; im Kreis-Layout in der Mitte, im Raster oberhalb */
  zentrum?: (optionen: { kompakt: boolean; imKreis: boolean }) => ReactNode
  onJobAngelegt?: () => void
  onJobOeffnen?: (id: string) => void
}) {
  const { T } = useSprache()
  const router = useRouter()
  const fenster = useFenster()
  const [jobAnzahl, setJobAnzahl] = useState(0)

  const nachladen = useCallback(async () => {
    setJobAnzahl((await alleJobsLaden()).length)
  }, [])

  useEffect(() => {
    nachladen()
  }, [nachladen])

  const neuerJob = useCallback(async () => {
    const nummer = (await alleJobsLaden()).length + 1
    const job = await jobErstellen(`Job #${nummer}`, '')
    await nachladen()
    onJobAngelegt?.()
    onJobOeffnen?.(job.id)
  }, [nachladen, onJobAngelegt, onJobOeffnen])

  const zuLaufendenJobs = useCallback(() => {
    document.getElementById('laufende-jobs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Reihenfolge = Reihenfolge im Raster (aktive zuerst).
  // kreisPos verteilt die aktiven Karten auf die Achsen, die „kommt bald"-Karten
  // auf die Diagonalen — so wechseln sich kräftige und blasse Kacheln ab.
  const karten: KartenDef[] = [
    {
      titel: 'cardNewJob',
      hinweis: 'cardNewJobHint',
      icon: '＋',
      aktiv: true,
      thema: 'rot',
      prominent: true,
      kreisPos: 0,
      onClick: neuerJob,
      zeigeBald: false,
      hilfeDe: 'Legt sofort einen leeren Job an und öffnet den JobEditor. Nutze die KI-Eingabe in der Mitte, wenn du der KI dein Ziel mitteilen willst.',
      hilfeEn: 'Creates a blank job and opens the JobEditor right away. Use the AI input in the centre if you want the AI to hear your goal first.',
      anker: 'karten',
    },
    {
      titel: 'cardSerie',
      hinweis: 'cardSerieHint',
      icon: '▦',
      aktiv: true,
      thema: 'dunkelrot',
      prominent: true,
      kreisPos: 2,
      onClick: () => router.push('/serie'),
      zeigeBald: false,
      hilfeDe: 'Serien-Modus: Spiele-Anzeigen (Wissensquiz, Geldregen u. a.) für alle Zeitungen in einem Rutsch — Zeitung und Monat wählen, Vorschlag erzeugen, prüfen und als Vektor-PDF bzw. ZIP abgeben. Rufnummern, Logos und Hausfarben kommen aus den Zeitungsdaten; Fehlendes wird gewarnt, nie erfunden.',
      hilfeEn: 'Series mode: game ads (Wissensquiz, Geldregen etc.) for all newspapers in one go — pick newspaper and month, generate a proposal, check it and export as vector PDF or ZIP. Phone numbers, logos and house colours come from the newspaper data; anything missing is flagged, never invented.',
      anker: 'karten',
    },
    {
      titel: 'cardRufnummern',
      hinweis: 'cardRufnummernHint',
      icon: '☎',
      aktiv: true,
      thema: 'weiss',
      prominent: true,
      kreisPos: 4,
      onClick: () => router.push('/rufnummern'),
      zeigeBald: false,
      hilfeDe: 'Wissensquiz-Nummern (Endziffer 1–5) und Geldregen-Nummern (MWN Print/Web) je Zeitung — Tabelle nach Gruppe, Suche, Hinweise, Quellen. Bei Verlagswahl im Job werden die passenden Nummern automatisch übernommen; fehlende Nummern werden gewarnt, nie erfunden.',
      hilfeEn: 'Wissensquiz numbers (last digit 1–5) and Geldregen numbers (MWN Print/Web) per newspaper — table by group, search, hints, sources. Publisher choice in a job auto-fills the matching numbers; missing numbers show a warning, never invented.',
      anker: 'rufnummern',
    },
    {
      titel: 'cardPraesentation',
      hinweis: 'cardPraesentationHint',
      icon: '▰',
      aktiv: true,
      thema: 'weiss',
      prominent: true,
      kreisPos: 5,
      onClick: () => router.push('/praesentationen'),
      zeigeBald: false,
      hilfeDe: 'Gewinnspielplan 2027 als PowerPoint je Verlag oder Varianten-Kombi — Konditionen eingeben, PPTX herunterladen (optional als ZIP mit PDF, wenn LibreOffice vorhanden). Rechenlogik unverändert zur Original-Präsentation.',
      hilfeEn: 'Prize game plan 2027 as PowerPoint per publisher or variant combo — enter the terms, download the PPTX (optionally ZIP with PDF if LibreOffice is present). Calculation stays identical to the original presentation.',
      anker: 'praesentationen',
    },
    {
      titel: 'cardKorrekturen',
      hinweis: 'cardKorrekturenHint',
      icon: '✎',
      aktiv: true,
      thema: 'rot',
      prominent: true,
      kreisPos: 3,
      onClick: () => router.push('/korrekturen'),
      zeigeBald: false,
      hilfeDe: 'Zeigt die Rückmeldungen aus dem Wissensquiz-Korrekturportal, lässt sie von der KI (Claude) einordnen (Feld, Zeitung, Spieltag, Sicherheit) und markiert eindeutige Fälle als „automatisch anwendbar“. Telefonnummern und Teilnahmebedingungen bleiben immer manuell. Portal-URL/Slug in .env.local (KORREKTURPORTAL_URL/_SLUG).',
      hilfeEn: 'Shows the feedback from the Wissensquiz review portal, lets the AI (Claude) classify each item (field, newspaper, game day, confidence) and marks unambiguous cases as “auto-apply”. Phone numbers and terms always stay manual. Portal URL/slug via .env.local (KORREKTURPORTAL_URL/_SLUG).',
      anker: 'korrekturen',
    },
    {
      titel: 'cardActiveJobs',
      hinweis: 'cardActiveJobsHint',
      icon: '▤',
      aktiv: jobAnzahl > 0,
      thema: 'grau',
      prominent: true,
      kreisPos: 6,
      badge: jobAnzahl > 0 ? String(jobAnzahl) : undefined,
      onClick: zuLaufendenJobs,
      zeigeBald: false,
      hilfeDe: 'Springt zur Liste deiner Jobs unterhalb (nur wenn welche existieren). Jobs leben in IndexedDB (Store „jobs") und bleiben zwischen Sitzungen erhalten.',
      hilfeEn: 'Jumps to the list of your jobs below (only when some exist). Jobs live in IndexedDB (store „jobs") and persist across sessions.',
      anker: 'karten',
    },
    {
      titel: 'cardBrandKits',
      hinweis: 'cardBrandKitsHint',
      icon: '◐',
      aktiv: false,
      thema: 'rot',
      prominent: false,
      kreisPos: 1,
      zeigeBald: true,
      hilfeDe: 'Für Farben, Schriften und Logos deiner Verlage. Aktuell laufen die 46 Verlags-Presets über „Verlag / Brand-Kit anwenden" in der ArtefaktWerkstatt.',
      hilfeEn: 'For publisher colours, fonts and logos. Currently the 46 publisher presets are applied via "Apply publisher / brand kit" in the artifact workshop.',
      anker: 'karten',
    },
    {
      titel: 'cardTemplates',
      hinweis: 'cardTemplatesHint',
      icon: '▧',
      aktiv: false,
      thema: 'grau',
      prominent: false,
      kreisPos: 3,
      zeigeBald: true,
      hilfeDe: 'Eigene wiederverwendbare Vorlagen (Store „vorlagen"). Kommt bald als eigene Seite; bis dahin kannst du im Werkzeuge-Panel im Job eine Vorlage speichern.',
      hilfeEn: 'Your reusable templates (store „vorlagen"). Own page coming soon; until then you can save a template from the tools panel inside a job.',
      anker: 'karten',
    },
    {
      titel: 'cardAssets',
      hinweis: 'cardAssetsHint',
      icon: '⬒',
      aktiv: false,
      thema: 'dunkelrot',
      prominent: false,
      kreisPos: 5,
      zeigeBald: true,
      hilfeDe: 'Bilder, Videos, Audios (Store „assets", content-adressiert per SHA-256, Regel 2). Kommt bald als eigene Seite; im Job siehst du sie als Ebenen.',
      hilfeEn: 'Images, videos, audios (store „assets", content-addressed by SHA-256, Rule 2). Own page coming soon; inside a job they appear as layers.',
      anker: 'karten',
    },
    {
      titel: 'cardExports',
      hinweis: 'cardExportsHint',
      icon: '↥',
      aktiv: false,
      thema: 'weiss',
      prominent: false,
      kreisPos: 7,
      zeigeBald: true,
      hilfeDe: 'Zusammenfassung fertiger Abgaben je Kanal. Aktuell exportierst du je Job aus dem Editor (Panel „Exporte") und siehst dort direkt das Gewicht.',
      hilfeEn: 'Summary of finished deliverables per channel. Currently you export per job from the editor („Exports" panel) with the file weight shown right there.',
      anker: 'exporte',
    },
  ]

  const istKreis = layout === 'kreis' && fenster !== null
  const masse = istKreis && fenster ? kreisMasse(fenster.w, fenster.h) : null
  const breite = fenster?.w ?? 0
  const spalten = breite >= 560 ? 2 : 1

  // Gemeinsamer Aufbau: äußeres <div> → [Mitte-Wrapper → <div> → KI-Eingabe, …].
  // Dadurch bleibt die KI-Eingabe beim Umschalten Kreis ↔ Raster gemountet.
  const kompakt = masse?.kompakt ?? false
  const n = karten.length

  return (
    <div
      role="group"
      aria-label={T(istKreis ? 'startKreisAria' : 'startKartenAria')}
      style={
        masse
          ? { position: 'relative', width: masse.B, height: masse.H, maxWidth: '100%', flexShrink: 0 }
          : { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }
      }
    >
      {/* KI-Eingabe: im Kreis exakt mittig, im Raster oben */}
      <div
        style={
          masse
            ? {
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }
            : { width: '100%', maxWidth: 760, minWidth: 0 }
        }
      >
        <div style={masse ? { width: masse.kiBreite, pointerEvents: 'auto' } : { width: '100%' }}>
          {zentrum?.({ kompakt, imKreis: istKreis })}
        </div>
      </div>

      {masse ? (
        <>
          {/* dezente Kreisbahn durch die Kachel-Mittelpunkte */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: masse.B / 2 - masse.Rx,
              top: masse.H / 2 - masse.Ry,
              width: 2 * masse.Rx,
              height: 2 * masse.Ry,
              borderRadius: '50%',
              border: `2px dashed ${TM.hellgrau}`,
              pointerEvents: 'none',
            }}
          />
          {karten.map((karte) => {
            const groesse = karte.prominent ? masse.gross : masse.klein
            const winkel = -Math.PI / 2 + (2 * Math.PI * karte.kreisPos) / n
            const cx = masse.B / 2 + masse.Rx * Math.cos(winkel)
            const cy = masse.H / 2 + masse.Ry * Math.sin(winkel)
            const linkeHaelfte = cx < masse.B / 2 - 1
            return (
              <div
                key={karte.titel}
                style={{
                  position: 'absolute',
                  left: Math.round(cx - groesse / 2),
                  top: Math.round(cy - groesse / 2),
                  width: groesse,
                  height: groesse,
                }}
              >
                <Kachel karte={karte} form="rund" groesse={groesse} T={T} />
                <HilfeEcke karte={karte} ausrichtung={linkeHaelfte ? 'links' : 'rechts'} rund />
                {karte.badge && <Badge text={karte.badge} titel={T('startJobsAnzahl')} rund />}
              </div>
            )
          })}
        </>
      ) : (
        <section
          style={{
            width: '100%',
            maxWidth: 820,
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: `repeat(${spalten}, minmax(0, 1fr))`,
            gap: 12,
          }}
        >
          {karten.map((karte, i) => (
            <div key={karte.titel} style={{ position: 'relative', minWidth: 0 }}>
              <Kachel karte={karte} form="eckig" T={T} />
              <HilfeEcke
                karte={karte}
                ausrichtung={spalten === 2 && i % 2 === 0 ? 'links' : 'rechts'}
              />
              {karte.badge && <Badge text={karte.badge} titel={T('startJobsAnzahl')} />}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bausteine
// ---------------------------------------------------------------------------

function Kachel({
  karte,
  form,
  groesse = 0,
  T,
}: {
  karte: KartenDef
  form: 'rund' | 'eckig'
  groesse?: number
  T: (k: Schluessel) => string
}) {
  const stil = karte.aktiv ? THEMEN[karte.thema] : THEMEN.blass
  const rund = form === 'rund'
  const titelPx = rund ? Math.round(Math.max(12.5, groesse * 0.092)) : 15
  const hinweisPx = rund ? Math.round(Math.max(10.5, groesse * 0.07) * 10) / 10 : 12.5
  const iconPx = rund ? Math.round(groesse * 0.2) : 44

  const anheben = (el: HTMLButtonElement, an: boolean) => {
    if (!karte.aktiv) return
    el.style.transform = an ? (rund ? 'scale(1.06)' : 'translateY(-2px)') : 'none'
    el.style.boxShadow = an ? stil.schatten.replace(/0\.(\d+)\)$/, '0.42)') : stil.schatten
  }

  return (
    <button
      type="button"
      onClick={karte.onClick}
      disabled={!karte.aktiv}
      title={!karte.aktiv && karte.zeigeBald ? T('cardComingSoon') : undefined}
      onMouseEnter={(e) => anheben(e.currentTarget, true)}
      onMouseLeave={(e) => anheben(e.currentTarget, false)}
      onFocus={(e) => anheben(e.currentTarget, true)}
      onBlur={(e) => anheben(e.currentTarget, false)}
      style={{
        width: '100%',
        height: rund ? '100%' : undefined,
        minHeight: rund ? undefined : 96,
        borderRadius: rund ? '50%' : 18,
        background: stil.hintergrund,
        border: stil.rand,
        boxShadow: stil.schatten,
        color: stil.titel,
        cursor: karte.aktiv ? 'pointer' : 'not-allowed',
        fontFamily: 'inherit',
        display: 'flex',
        flexDirection: rund ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: rund ? 'center' : 'flex-start',
        gap: rund ? Math.round(groesse * 0.025) + 2 : 14,
        padding: rund ? `${Math.round(groesse * 0.12)}px ${Math.round(groesse * 0.13)}px` : '16px 46px 16px 16px',
        textAlign: rund ? 'center' : 'left',
        transition: 'transform 140ms ease, box-shadow 140ms ease',
        position: 'relative',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          width: rund ? undefined : iconPx,
          height: rund ? undefined : iconPx,
          borderRadius: '50%',
          background: rund ? 'transparent' : stil.iconHg,
          color: rund ? (karte.aktiv ? stil.titel : stil.iconFarbe) : stil.iconFarbe,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: rund ? iconPx : 22,
          lineHeight: 1,
        }}
      >
        {karte.icon}
      </span>
      <span
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: rund ? 2 : 4,
          minWidth: 0,
          alignItems: rund ? 'center' : 'flex-start',
        }}
      >
        <span
          style={{
            fontSize: titelPx,
            fontWeight: 700,
            lineHeight: 1.15,
            color: stil.titel,
            overflowWrap: 'anywhere',
            hyphens: 'auto',
          }}
        >
          {T(karte.titel)}
        </span>
        <span
          style={{
            fontSize: hinweisPx,
            lineHeight: 1.3,
            color: stil.hinweis,
            overflowWrap: 'anywhere',
          }}
        >
          {T(karte.hinweis)}
        </span>
        {!karte.aktiv && karte.zeigeBald && (
          <span
            style={{
              marginTop: rund ? 3 : 4,
              fontSize: rund ? 9.5 : 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#5B606C',
              background: '#E6E8EE',
              borderRadius: 999,
              padding: '2px 8px',
            }}
          >
            {T('cardComingSoon')}
          </span>
        )}
      </span>
    </button>
  )
}

function HilfeEcke({
  karte,
  ausrichtung,
  rund = false,
}: {
  karte: KartenDef
  ausrichtung: 'links' | 'rechts'
  rund?: boolean
}) {
  // Weißer Untergrund, damit das (i) auf jeder Kachelfarbe lesbar bleibt.
  return (
    <div
      style={{
        position: 'absolute',
        top: rund ? 2 : 10,
        right: rund ? 2 : 10,
        zIndex: 2,
        width: 26,
        height: 26,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        background: '#ffffff',
        color: TM.dunkelrot,
        boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
      }}
    >
      <HilfePopover de={karte.hilfeDe} en={karte.hilfeEn} anker={karte.anker} ausrichtung={ausrichtung} />
    </div>
  )
}

function Badge({ text, titel, rund = false }: { text: string; titel: string; rund?: boolean }) {
  return (
    <span
      title={`${text} ${titel}`}
      style={{
        position: 'absolute',
        ...(rund ? { top: 2, left: 2 } : { bottom: 10, right: 12 }),
        zIndex: 2,
        background: TM.schrift,
        color: '#ffffff',
        fontSize: 11,
        fontWeight: 700,
        padding: '3px 8px',
        borderRadius: 999,
        minWidth: 22,
        textAlign: 'center',
        pointerEvents: 'none',
      }}
    >
      {text}
    </span>
  )
}
