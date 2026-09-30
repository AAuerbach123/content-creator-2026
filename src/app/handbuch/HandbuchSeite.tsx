'use client'

import Link from 'next/link'
import SpracheUmschalter from '@/components/SpracheUmschalter'
import { useSprache } from '@/components/SpracheProvider'

export default function HandbuchSeite() {
  const { sprache } = useSprache()
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
        <SpracheUmschalter />
      </header>
      <main style={{ maxWidth: 780, margin: '0 auto', padding: '32px 24px 80px', lineHeight: 1.65 }}>
        <h1 style={{ fontSize: 30, margin: '0 0 8px' }}>
          {sprache === 'de' ? 'Grafiker-Handbuch' : "Designer's manual"}
        </h1>
        <p style={{ opacity: 0.65, margin: '0 0 32px', fontSize: 14 }}>
          {sprache === 'de'
            ? 'Kurze Referenz für den Alltag mit dem ContentCreator2026.'
            : 'Short reference for daily work with ContentCreator2026.'}
        </p>

        {sprache === 'de' ? (
          <>
            <h2>Start</h2>
            <p>
              Doppelklick auf <code>ContentCreator starten.command</code>. Der Browser öffnet
              http://localhost:3000. Im großen Feld dein Ziel formulieren („Was produzieren wir heute?").
            </p>

            <h2>Drei Einstiege</h2>
            <ul>
              <li>
                <strong>A · Nur ein Ziel:</strong> Die KI stellt bis zu 5 offene Fragen, dann drei
                unterschiedliche Richtungen als klickbare Karten.
              </li>
              <li>
                <strong>B · Vorstellung im Kopf:</strong> Interview läuft, bis genug bekannt ist —
                dann direkt Schrittplan.
              </li>
              <li>
                <strong>C · Vorlage hochladen:</strong> PDF/PNG/JPG dropped → Farben, Schriften,
                Textgefäße erkannt → Multiple-Choice pro Merkmal.
              </li>
            </ul>

            <h2>Kanäle</h2>
            <p>
              Zeitung/Zeitschrift in mm, mit CMYK-Denken. Web-Banner in vier IAB-Größen (MRec 300×250,
              Leaderboard 728×90, Skyscraper 160×600, Billboard 970×250) — Knopf „Banner-Set" erzeugt
              alle vier aus einem Design. Social: IG Feed 4:5/1:1, Story/Reel 9:16 mit Safe-Zones,
              LinkedIn 1200×627, Facebook 1200×630, X 1600×900. Kurzvideo 9:16/1:1/16:9 mit
              eingebrannten Untertiteln.
            </p>

            <h2>Erzeugen</h2>
            <p>
              „✨ KI schlägt komplettes Design vor" macht Bild + Headline + Sub + CTA parallel. Bild-
              und Text-Aufklapper lassen dich einzeln nachbessern. Verlag wählen → Farben, Schrift und
              Logo werden übernommen.
            </p>

            <h2>Editieren</h2>
            <p>
              Umschalten auf „Editor" (Konva-Canvas + Ebenen-Panel). Doppelklick auf Text → Inline-
              Bearbeitung. Undo/Redo per Cmd/Ctrl+Z bzw. Cmd+Shift+Z. CI-Farben stehen im Farbwähler
              zuerst. Freier Sprachbefehl unten („mach die Headline größer und rück das Logo nach
              rechts") wird zu Ebenen-Operationen.
            </p>

            <h2>Exporte</h2>
            <ul>
              <li>PNG/JPG/WebP in 1× und 2×, Gewicht wird direkt angezeigt.</li>
              <li>
                Vektor-PDF in mm mit 3 mm Beschnitt und Schnittmarken für Druckerei-Abgabe.
              </li>
              <li>Adobe-Paket: PDF + Anleitung für Illustrator und InDesign.</li>
              <li>Social-Paket: alle Artefakte des Jobs als ZIP mit Caption-Datei.</li>
              <li>
                Job-Backup: JSON + <code>assets/&lt;hash&gt;.&lt;ext&gt;</code> — das komplette
                Wieder-Öffnen-Paket.
              </li>
            </ul>

            <h2>Kurzvideo</h2>
            <p>
              Sichtbar, sobald der Kanal „Kurzvideo" ist. Fünf Templates: Logo-Einflug (2 s +
              Woooosch), Text-Reveal (Aufzählung fliegt synchron zum Voiceover ein), Bild-Ken-Burns,
              Karussell-Swipe, Logo-Outro. Stimme <strong>Anneke</strong> (Standard), „Stimmproben"
              liefert 3 Frauen- + 3 Männerstimmen zum Anhören. Prüfbericht vor Export prüft:
              nicht ablesen, keine Umlaut-Ersatzschreibungen, Ton-/Video-Sync ≤ 50 ms.
            </p>

            <h2>Korrekturportal</h2>
            <p>
              Freigabe-Link erzeugen und dem Verlag schicken. Der Kunde klickt auf eine Stelle,
              hinterlässt einen Änderungswunsch (Text + Name). Du siehst die Pins unter
              „Kundenkorrekturen" im Editor, kannst antworten und den Status auf offen/erledigt/
              abgelehnt setzen. <em>Grenze: der Link funktioniert im selben Browser — für echten
              Kundenversand braucht es eine Server-Speicherung (siehe OFFENE_PUNKTE.md #8).</em>
            </p>

            <h2>Grenzen der KI</h2>
            <ul>
              <li>Bilder mit vielen Personen oder komplexen Zählungen lieber selbst prüfen.</li>
              <li>Schattenbilder: KI verwechselt Fußpunkte — im Zweifel den Schatten selbst montieren.</li>
              <li>Marken-/IP-Namen im Prompt werden vom Sanitizer ersetzt — das ist gewollt.</li>
              <li>ElevenLabs zählt Zeichen — jeder Voiceover-Neustart kostet.</li>
              <li>OpenAI-Guthaben aufladen, wenn Bildgenerierung „insufficient_quota" meldet.</li>
            </ul>

            <h2>Kosten</h2>
            <p>
              Jeder KI-Aufruf landet mit Modell, Tokens und geschätzten Kosten im Verlaufs-Panel im
              Job. Gesamte Übersicht auf <Link href="/uebersicht">/uebersicht</Link>.
            </p>
          </>
        ) : (
          <>
            <h2>Start</h2>
            <p>
              Double-click <code>ContentCreator starten.command</code>. The browser opens
              http://localhost:3000. Type your goal in the big field (&quot;What are we producing today?&quot;).
            </p>

            <h2>Three entries</h2>
            <ul>
              <li>
                <strong>A · Only a goal:</strong> AI asks up to 5 open questions, then proposes three
                clearly different directions as clickable cards.
              </li>
              <li>
                <strong>B · Idea in mind:</strong> the interview runs until enough is known — then
                jumps straight to the step plan.
              </li>
              <li>
                <strong>C · Upload a reference:</strong> drop a PDF/PNG/JPG → colors, fonts and text
                slots are detected → multiple-choice per attribute.
              </li>
            </ul>

            <h2>Channels</h2>
            <p>
              Newspaper/magazine in mm, CMYK-friendly. Web banners in four IAB sizes (MRec 300×250,
              Leaderboard 728×90, Skyscraper 160×600, Billboard 970×250) — a &quot;Banner set&quot; button
              creates all four from one design. Social: IG Feed 4:5/1:1, Story/Reel 9:16 with safe
              zones, LinkedIn 1200×627, Facebook 1200×630, X 1600×900. Short video 9:16/1:1/16:9 with
              burnt-in subtitles.
            </p>

            <h2>Generate</h2>
            <p>
              &quot;AI proposes a complete design&quot; produces image + headline + sub + CTA in parallel.
              The Image and Copy accordions let you refine individual layers. Selecting a publisher
              applies its colors, font and logo.
            </p>

            <h2>Edit</h2>
            <p>
              Switch to &quot;Editor&quot; (Konva canvas + layers panel). Double-click text → inline edit.
              Undo/redo with Cmd/Ctrl+Z or Cmd+Shift+Z. Brand colors appear first in the color picker.
              A free voice command below (&quot;make the headline larger and push the logo right&quot;)
              becomes layer operations.
            </p>

            <h2>Exports</h2>
            <ul>
              <li>PNG/JPG/WebP in 1× and 2×, size shown right after download.</li>
              <li>Vector PDF in mm with 3 mm bleed and crop marks for the print shop.</li>
              <li>Adobe package: PDF + instructions for Illustrator/InDesign.</li>
              <li>Social package: all artefacts of the job as a ZIP with a captions file.</li>
              <li>
                Job backup: JSON + <code>assets/&lt;hash&gt;.&lt;ext&gt;</code> — full reopen bundle.
              </li>
            </ul>

            <h2>Short video</h2>
            <p>
              Appears when the channel is &quot;Short video&quot;. Five templates: logo intro (2 s + whoosh),
              text reveal (bullets fly in synced to the voiceover), image Ken Burns, carousel swipe,
              logo outro. Voice <strong>Anneke</strong> (default), &quot;Voice samples&quot; delivers 3
              female + 3 male voices to compare. Pre-export check verifies: no reading the slide,
              no umlaut substitutions, audio/animation sync ≤ 50 ms.
            </p>

            <h2>Correction portal</h2>
            <p>
              Generate a share link and send it to the publisher. The client clicks the artwork,
              leaves a change request (text + name). You see the pins under &quot;Customer feedback&quot;
              in the editor, can reply, and set status open/done/rejected. Cross-browser via
              server store (Cloudflare KV online, file fallback locally).
            </p>

            <h2>Limits of the AI</h2>
            <ul>
              <li>Images with many people or complex counts — inspect them yourself.</li>
              <li>Shadow placement: AI mixes up feet — add shadows manually if in doubt.</li>
              <li>Brand/IP names in prompts get sanitised — that is intentional.</li>
              <li>ElevenLabs charges per character — every voiceover restart costs.</li>
              <li>Top up OpenAI credit if image generation reports &quot;insufficient_quota&quot;.</li>
            </ul>

            <h2>Costs</h2>
            <p>
              Every AI call is recorded in the log panel of the job with model, tokens and estimated
              cost. Full overview at <Link href="/uebersicht">/uebersicht</Link>.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
