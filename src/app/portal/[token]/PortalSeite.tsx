'use client'

// Kunden-Korrekturportal (öffentlich, nur mit Verlags-Link): Verlage sehen ihre Anzeigen je Spieltag,
// setzen Korrekturhinweise per Klick in die Anzeige und geben frei oder melden Fehler.

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { anzeigeHtml, anzeigeHoehe, ANZEIGE_BREITE, type SerienBasis } from '@/lib/serie/serie-client'
import { poolBilden, standardTeilnehmer, type WeitereDatei } from '@/lib/serie/zeitungs-pool'
import { spielFinden, GELDREGEN_EINTRAG } from '@/lib/serie/spiele'
import { htmlMaskieren } from '@/lib/serie/serie-ki'
import type { Inhalt } from '@/lib/serie/spiele/typen'
import type { EchterGewinner, GewinnerAnzahl, SerienDaten, Vorschlag, Zeitung } from '@/lib/serie/types'

type Kommentar = { id: string; zeitungId: string; x?: number; y?: number; text: string; von: string; am: number; erledigt?: boolean; antwort?: string }
type PSpieltag = {
  id: string; nr: number; datum: string; status: string
  raetsel: { frage?: string; a1?: string; a2?: string; richtig?: 1 | 2; loesung?: string; daten?: Record<string, unknown> }
  gewinner: Array<{ name: string; ort: string; betrag: number; gewinnertext: string; fotoHash?: string }>
  verlagsStatus: string | null
  kommentare: Kommentar[]
  deadline?: string | null
  vorher?: { am: number; raetsel: PSpieltag['raetsel']; gewinner: PSpieltag['gewinner'] } | null
}
type PKampagne = {
  kampagne: { id: string; spielId: string; monat: string; vorlageAbc?: string; verlage: string[] }
  spieltage: PSpieltag[]
  aenderungen: Record<string, Partial<Zeitung>>
  teilnehmer?: string[]
  einfuehrung?: { titel: string; text: string }
}
type Antwort = { gruppe: string; name: string; kampagnen: PKampagne[] }

const spielName = (id: string) => (id === 'geldregen' ? GELDREGEN_EINTRAG.name : spielFinden(id)?.name ?? id)
const datumLang = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const STATUS: Record<string, { text: string; klasse: string }> = {
  'verlag-ok': { text: 'von Ihnen freigegeben', klasse: 'gruen' },
  'verlag-fehler': { text: 'Korrektur gemeldet', klasse: 'rot' },
}

export default function PortalSeite({ token }: { token: string }) {
  const [daten, setDaten] = useState<Antwort | null>(null)
  const [pool, setPool] = useState<SerienDaten | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [wahl, setWahl] = useState<{ k: number; s: string } | null>(null)
  const [zeitungId, setZeitungId] = useState('')
  const [gewinnerFassung, setGewinnerFassung] = useState<GewinnerAnzahl>(1)
  const [von, setVon] = useState('')
  const [entwurf, setEntwurf] = useState<{ x: number; y: number } | null>(null)
  const [entwurfText, setEntwurfText] = useState('')
  const [allgemein, setAllgemein] = useState('')
  const [meldung, setMeldung] = useState<string | null>(null)
  const [sendet, setSendet] = useState(false)
  const [fotos, setFotos] = useState<Record<string, string>>({})
  const [zeigeVorher, setZeigeVorher] = useState(false)

  const laden = useCallback(async () => {
    const r = await fetch('/api/portal?t=' + encodeURIComponent(token), { cache: 'no-store' })
    const j = (await r.json()) as Antwort & { fehler?: string }
    if (!r.ok) throw new Error(j.fehler ?? 'Fehler ' + r.status)
    setDaten(j)
    return j
  }, [token])

  useEffect(() => {
    try { setVon(window.localStorage.getItem('portal:name') ?? '') } catch { /* egal */ }
    Promise.all([
      laden(),
      fetch('/serie/zeitungen.json').then((r) => r.json() as Promise<SerienDaten>),
      fetch('/serie/zeitungen-weitere.json').then((r) => (r.ok ? (r.json() as Promise<WeitereDatei>) : null)).catch(() => null),
    ])
      .then(([j, z, w]) => {
        setPool(poolBilden(z, w).daten)
        const ersterOffen = j.kampagnen.flatMap((k, ki) => k.spieltage.map((s) => ({ ki, s }))).find((x) => x.s.verlagsStatus !== 'verlag-ok')
        if (ersterOffen) setWahl({ k: ersterOffen.ki, s: ersterOffen.s.id })
        else if (j.kampagnen[0]?.spieltage[0]) setWahl({ k: 0, s: j.kampagnen[0].spieltage[0].id })
      })
      .catch((e) => setFehler(e instanceof Error ? e.message : String(e)))
  }, [laden])

  const k = wahl && daten ? daten.kampagnen[wahl.k] : null
  const s = k?.spieltage.find((x) => x.id === wahl?.s) ?? null

  // Zeitungen der eigenen Gruppe für diese Kampagne (inkl. hochgeladener Rufnummern)
  const zeitungen = useMemo<Zeitung[]>(() => {
    if (!pool || !k || !daten) return []
    const ids = k.kampagne.verlage.length ? k.kampagne.verlage : k.teilnehmer?.length ? k.teilnehmer : null
    const std = ids ?? standardTeilnehmer(k.kampagne.spielId, { geldregen: pool.zeitungen.filter((z) => !z.id.startsWith('wq-')).map((z) => z.id), wissensquiz: pool.zeitungen.map((z) => z.id) })
    return pool.zeitungen
      .filter((z) => z.hotline === daten.gruppe && std.includes(z.id))
      .map((z) => (k.aenderungen[z.id] ? { ...z, ...k.aenderungen[z.id] } : z))
  }, [pool, k, daten])

  useEffect(() => {
    if (zeitungen.length && !zeitungen.some((z) => z.id === zeitungId)) setZeitungId(zeitungen[0].id)
  }, [zeitungen, zeitungId])

  // Fotos laden
  useEffect(() => {
    if (!s) return
    for (const g of [...s.gewinner, ...(s.vorher?.gewinner ?? [])]) {
      const h = g.fotoHash
      if (!h || fotos[h]) continue
      void fetch(`/api/portal?t=${encodeURIComponent(token)}&h=${h}`)
        .then((r) => (r.ok ? r.blob() : null))
        .then((b) => {
          if (!b) return
          const fr = new FileReader()
          fr.onload = () => setFotos((alt) => ({ ...alt, [h]: String(fr.result) }))
          fr.readAsDataURL(b)
        })
    }
    setGewinnerFassung(s.gewinner.length >= 2 ? 4 : 1)
    setZeigeVorher(false)
  }, [s, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const z = zeitungen.find((x) => x.id === zeitungId) ?? zeitungen[0]
  const html = useMemo(() => {
    if (!pool || !k || !s || !z) return ''
    const spiel = k.kampagne.spielId === 'geldregen' ? null : spielFinden(k.kampagne.spielId) ?? null
    const quelle = zeigeVorher && s.vorher ? s.vorher : s
    const gewinner: EchterGewinner[] = quelle.gewinner.map((g) => ({
      name: htmlMaskieren(g.name), ort: htmlMaskieren(g.ort), betrag: `${g.betrag.toLocaleString('de-DE')} €`, text: htmlMaskieren(g.gewinnertext ?? ''), foto: g.fotoHash ? fotos[g.fotoHash] : undefined,
    }))
    const r = quelle.raetsel ?? {}
    const inhalt: Inhalt = { tag: s.nr, datum: s.datum, label: datumLang(s.datum).replace(/ \d{4}$/, ''), frage: r.frage ?? '', a1: r.a1, a2: r.a2, richtig: r.richtig, loesung: r.loesung, daten: r.daten, muster: false }
    if (gewinner.length) inhalt.gewinner = gewinner
    if (s.nr === 1 && k.einfuehrung) inhalt.einfuehrung = k.einfuehrung
    const basis = { daten: pool, fragen: {}, tnbRef: {} } as unknown as SerienBasis
    return anzeigeHtml({ basis, spiel, z, inhalt, vorschlag: (k.kampagne.vorlageAbc as Vorschlag) ?? 'A', gewinner: gewinnerFassung, monat: s.datum.slice(0, 7), kiText: true })
  }, [pool, k, s, z, fotos, gewinnerFassung, zeigeVorher])

  /** Was hat Telemedia seit Ihrer letzten Prüfung geändert? (Text-Vergleich der Fassungen) */
  const aenderungen = useMemo(() => {
    if (!s?.vorher) return []
    const out: string[] = []
    const a = s.vorher.raetsel ?? {}, b = s.raetsel ?? {}
    const feld = (n: string, x?: string, y?: string) => { if ((x ?? '') !== (y ?? '')) out.push(`${n}: „${x || '—'}“ → „${y || '—'}“`) }
    feld('Frage', a.frage, b.frage); feld('Antwort 1', a.a1, b.a1); feld('Antwort 2', a.a2, b.a2)
    if ((a.richtig ?? 0) !== (b.richtig ?? 0)) out.push('Richtige Antwort geändert')
    const gv = s.vorher.gewinner, gn = s.gewinner
    for (let i = 0; i < Math.max(gv.length, gn.length); i++) {
      const x = gv[i], y = gn[i]
      if (!x && y) out.push(`Gewinner neu: ${y.name}, ${y.ort}`)
      else if (x && !y) out.push(`Gewinner entfernt: ${x.name}`)
      else if (x && y) {
        feld(`Gewinner ${i + 1} Name`, x.name, y.name); feld(`Gewinner ${i + 1} Ort`, x.ort, y.ort)
        if (x.betrag !== y.betrag) out.push(`Gewinner ${i + 1} Betrag: ${x.betrag} € → ${y.betrag} €`)
        feld(`Gewinner ${i + 1} Text`, x.gewinnertext, y.gewinnertext)
        if ((x.fotoHash ?? '') !== (y.fotoHash ?? '')) out.push(`Gewinner ${i + 1}: Foto geändert`)
      }
    }
    return out
  }, [s])

  /** Alle offenen Spieltage derselben Kalenderwoche (Montag–Sonntag) wie der gewählte. */
  const wocheOffen = useMemo(() => {
    if (!s || !k) return []
    const d = new Date(s.datum + 'T12:00:00')
    const mo = new Date(d); mo.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const so = new Date(mo); so.setDate(mo.getDate() + 6)
    const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
    return k.spieltage.filter((x) => x.datum >= iso(mo) && x.datum <= iso(so) && x.verlagsStatus !== 'verlag-ok')
  }, [s, k])

  const wocheFreigeben = async () => {
    if (!wocheOffen.length || !window.confirm(`${wocheOffen.length} Spieltage dieser Woche freigeben?`)) return
    setSendet(true)
    try {
      for (const x of wocheOffen) {
        const r = await fetch('/api/portal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: token, aktion: 'ok', spieltagId: x.id, von }) })
        if (!r.ok) throw new Error(((await r.json()) as { fehler?: string }).fehler ?? 'Fehler')
      }
      await laden()
      setMeldung(`Danke – ${wocheOffen.length} Spieltage freigegeben.`)
    } catch (e) { setMeldung(e instanceof Error ? e.message : String(e)) } finally { setSendet(false) }
  }

  const senden = async (aktion: 'ok' | 'fehler' | 'kommentar', extra: Record<string, unknown> = {}) => {
    if (!s) return
    setSendet(true)
    setMeldung(null)
    try { window.localStorage.setItem('portal:name', von) } catch { /* egal */ }
    try {
      const r = await fetch('/api/portal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: token, aktion, spieltagId: s.id, von, ...extra }) })
      const j = (await r.json()) as { fehler?: string }
      if (!r.ok) throw new Error(j.fehler ?? 'Fehler ' + r.status)
      await laden()
      setMeldung(aktion === 'ok' ? 'Danke – Ihre Freigabe ist bei Telemedia angekommen.' : aktion === 'fehler' ? 'Danke – Ihre Korrektur ist bei Telemedia angekommen. Sie erhalten eine neue Fassung.' : 'Kommentar gespeichert.')
      setEntwurf(null); setEntwurfText(''); setAllgemein('')
    } catch (e) {
      setMeldung(e instanceof Error ? e.message : String(e))
    } finally {
      setSendet(false)
    }
  }

  if (fehler) return <main className="portal"><Kopf /><div className="portal-karte"><h1>Kein Zugang</h1><p>{fehler}</p></div></main>
  if (!daten || !pool) return <main className="portal"><Kopf /><p className="portal-leise">Lade Ihre Anzeigen …</p></main>

  const alleTage = daten.kampagnen.flatMap((kk, ki) => kk.spieltage.map((st) => ({ ki, st, kk })))
  const offeneAnzahl = alleTage.filter((x) => x.st.verlagsStatus !== 'verlag-ok').length

  return (
    <main className="portal">
      <Kopf gruppe={daten.name} />
      <section className="portal-karte">
        <h1>Anzeigen prüfen und freigeben</h1>
        <p className="portal-leise">
          {offeneAnzahl ? `${offeneAnzahl} Spieltag(e) warten auf Ihre Prüfung.` : 'Alles freigegeben – vielen Dank!'} Klicken Sie in die Anzeige, um eine Stelle zu markieren und zu kommentieren.
        </p>
        <div className="portal-feld">
          <label htmlFor="portal-von">Ihr Name (für Rückfragen)</label>
          <input id="portal-von" value={von} onChange={(e) => setVon(e.target.value)} placeholder="Vor- und Nachname" autoComplete="name" />
        </div>
      </section>

      {alleTage.length === 0 ? (
        <section className="portal-karte"><p>Derzeit liegen keine Anzeigen zur Prüfung vor.</p></section>
      ) : (
        <div className="portal-raster">
          <nav className="portal-karte portal-tage" aria-label="Spieltage">
            {daten.kampagnen.map((kk, ki) => (
              <div key={kk.kampagne.id}>
                <h2>{spielName(kk.kampagne.spielId)}</h2>
                <ul>
                  {kk.spieltage.map((st) => {
                    const stt = STATUS[st.verlagsStatus ?? ''] ?? { text: 'bitte prüfen', klasse: 'gelb' }
                    return (
                      <li key={st.id}>
                        <button type="button" aria-current={wahl?.s === st.id ? 'true' : undefined} className={wahl?.s === st.id ? 'aktiv' : ''} onClick={() => { setWahl({ k: ki, s: st.id }); setEntwurf(null); setMeldung(null) }}>
                          <span>Spieltag {st.nr} · {new Date(st.datum + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
                          <span className={`portal-chip ${stt.klasse}`}>{stt.text}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {s && k && (
            <section className="portal-karte">
              <h2 style={{ marginTop: 0 }}>{spielName(k.kampagne.spielId)} · Spieltag {s.nr} · {datumLang(s.datum)}</h2>
              {s.deadline && s.verlagsStatus !== 'verlag-ok' && (
                <p className="portal-meldung" style={{ marginTop: 0 }}>Bitte bis <b>{new Date(s.deadline).toLocaleString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} Uhr</b> prüfen und freigeben.</p>
              )}
              {aenderungen.length > 0 && (
                <div className="portal-aenderungen">
                  <b>Geändert seit Ihrer letzten Prüfung:</b>
                  <ul>{aenderungen.map((a, i) => <li key={i}>{a}</li>)}</ul>
                  <div className="portal-segment" role="radiogroup" aria-label="Fassung">
                    <button type="button" role="radio" aria-checked={!zeigeVorher} className={!zeigeVorher ? 'an' : ''} onClick={() => setZeigeVorher(false)}>Neue Fassung</button>
                    <button type="button" role="radio" aria-checked={zeigeVorher} className={zeigeVorher ? 'an' : ''} onClick={() => setZeigeVorher(true)}>Vorher</button>
                  </div>
                </div>
              )}
              <div className="portal-steuer">
                {zeitungen.length > 1 && (
                  <div className="portal-feld">
                    <label htmlFor="portal-zeitung">Zeitung</label>
                    <select id="portal-zeitung" value={z?.id ?? ''} onChange={(e) => setZeitungId(e.target.value)}>
                      {zeitungen.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                  </div>
                )}
                {s.nr > 1 && (
                  <div className="portal-segment" role="radiogroup" aria-label="Gewinner-Fassung">
                    {([1, 4] as GewinnerAnzahl[]).map((g) => (
                      <button key={g} type="button" role="radio" aria-checked={gewinnerFassung === g} className={gewinnerFassung === g ? 'an' : ''} onClick={() => setGewinnerFassung(g)}>{g} Gewinner</button>
                    ))}
                  </div>
                )}
              </div>

              {z && (
                <p style={{ margin: '0 0 8px' }}>
                  <a className="portal-link" href={`/api/portal?t=${encodeURIComponent(token)}&pdf=1&s=${encodeURIComponent(s.id)}&z=${encodeURIComponent(z.id)}&g=${gewinnerFassung}`}>Druck-PDF dieser Anzeige herunterladen</a>
                </p>
              )}
              {z ? (
                <AnzeigeMitPins
                  html={html}
                  hoehe={anzeigeHoehe(z)}
                  pins={s.kommentare.filter((c) => c.zeitungId === z.id && c.x !== undefined)}
                  entwurf={entwurf}
                  onKlick={(x, y) => { setEntwurf({ x, y }); setEntwurfText('') }}
                />
              ) : <p>Für Ihre Verlagsgruppe ist in diesem Spiel keine Zeitung hinterlegt.</p>}

              {entwurf && z && (
                <div className="portal-entwurf" role="group" aria-label="Neuer Korrekturhinweis">
                  <label htmlFor="portal-pin">Was soll an dieser Stelle geändert werden?</label>
                  <textarea id="portal-pin" rows={3} value={entwurfText} onChange={(e) => setEntwurfText(e.target.value)} autoFocus />
                  <div className="portal-knoepfe">
                    <button type="button" className="sekundaer" onClick={() => setEntwurf(null)}>Abbrechen</button>
                    <button type="button" className="primaer" disabled={!entwurfText.trim() || sendet} onClick={() => senden('kommentar', { text: entwurfText, zeitungId: z.id, x: entwurf.x, y: entwurf.y })}>Hinweis speichern</button>
                  </div>
                </div>
              )}

              {s.kommentare.length > 0 && (
                <div className="portal-kommentare">
                  <h3>Ihre Hinweise</h3>
                  <ol>
                    {s.kommentare.map((c, i) => (
                      <li key={c.id} className={c.erledigt ? 'erledigt' : ''}>
                        <b>{c.x !== undefined ? `Markierung ${s.kommentare.filter((x) => x.x !== undefined).indexOf(c) + 1}` : 'Allgemein'}</b>
                        {c.zeitungId && zeitungen.length > 1 ? ` · ${zeitungen.find((x) => x.id === c.zeitungId)?.name ?? ''}` : ''}: {c.text}
                        <small> – {c.von}, {new Date(c.am).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</small>
                        {c.erledigt && <span className="portal-chip gruen" style={{ marginLeft: 6 }}>erledigt</span>}
                        {c.antwort && <div className="portal-antwort">Telemedia: {c.antwort}</div>}
                        <span hidden>{i}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="portal-feld" style={{ marginTop: 16 }}>
                <label htmlFor="portal-allgemein">Allgemeiner Kommentar (optional, bei „Korrektur nötig“ Pflicht)</label>
                <textarea id="portal-allgemein" rows={2} value={allgemein} onChange={(e) => setAllgemein(e.target.value)} />
              </div>
              <div className="portal-knoepfe">
                <button type="button" className="sekundaer" disabled={sendet || (!allgemein.trim() && !s.kommentare.some((c) => !c.erledigt))} onClick={() => senden('fehler', { text: allgemein || 'Siehe Markierungen in der Anzeige.' })}>
                  Korrektur nötig
                </button>
                <button type="button" className="primaer" disabled={sendet} onClick={() => senden('ok', { text: allgemein })}>
                  Alles in Ordnung – freigeben
                </button>
              </div>
              {wocheOffen.length > 1 && (
                <div className="portal-knoepfe">
                  <button type="button" className="sekundaer" disabled={sendet} onClick={wocheFreigeben}>Alle {wocheOffen.length} offenen Spieltage dieser Woche freigeben</button>
                </div>
              )}
              {meldung && <p role="status" className="portal-meldung">{meldung}</p>}
            </section>
          )}
        </div>
      )}
      <footer className="portal-fuss">Telemedia Interactive · Korrekturportal · Dieser Link gilt nur für Ihre Verlagsgruppe. Bitte nicht weitergeben.</footer>
    </main>
  )
}

function Kopf({ gruppe }: { gruppe?: string }) {
  return (
    <header className="portal-kopf">
      <img src="/telemedia-logo.png" alt="Telemedia" />
      <span>Korrekturportal{gruppe ? ` · ${gruppe}` : ''}</span>
    </header>
  )
}

/** Anzeige (iframe, skaliert) mit klickbarer Ebene für Markierungen. */
function AnzeigeMitPins({ html, hoehe, pins, entwurf, onKlick }: { html: string; hoehe: number; pins: Kommentar[]; entwurf: { x: number; y: number } | null; onKlick: (x: number, y: number) => void }) {
  const huelle = useRef<HTMLDivElement | null>(null)
  const [breite, setBreite] = useState(0)
  useEffect(() => {
    const el = huelle.current
    if (!el) return
    const ro = new ResizeObserver(() => setBreite(el.clientWidth))
    ro.observe(el)
    setBreite(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const skala = breite ? Math.min(1, breite / ANZEIGE_BREITE) : 0
  const klick = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    onKlick(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)))
  }
  const nr = (c: Kommentar) => pins.indexOf(c) + 1
  return (
    <div ref={huelle} style={{ width: '100%' }}>
      <div className="portal-anzeige" style={{ width: Math.floor(ANZEIGE_BREITE * skala), height: Math.floor(hoehe * skala) }}>
        {skala > 0 && html && (
          <iframe title="Anzeige" srcDoc={html} style={{ width: ANZEIGE_BREITE, height: hoehe, transform: `scale(${skala})`, transformOrigin: '0 0', border: 0, position: 'absolute', left: 0, top: 0 }} />
        )}
        <div className="portal-ebene" onClick={klick} role="button" tabIndex={0} aria-label="In die Anzeige klicken, um eine Stelle zu markieren"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onKlick(0.5, 0.5) } }}>
          {pins.map((c) => (
            <span key={c.id} className={`portal-pin${c.erledigt ? ' erledigt' : ''}`} style={{ left: `${(c.x ?? 0) * 100}%`, top: `${(c.y ?? 0) * 100}%` }} title={c.text}>{nr(c)}</span>
          ))}
          {entwurf && <span className="portal-pin neu" style={{ left: `${entwurf.x * 100}%`, top: `${entwurf.y * 100}%` }}>+</span>}
        </div>
      </div>
    </div>
  )
}
