// Abgleich Cockpit ↔ monday je Bereich (Projektplan, Fragen, Gewinner, Anzeigen).
// Regel bei Status-Werten (Verlag OK/Fehler, Gewinnauszahlung): Dreiwege-Vergleich mit dem zuletzt abgeglichenen Wert –
// wer seit dem letzten Abgleich geändert hat, gewinnt. Inhalte (Datum, Fragen, Gewinner) führt das Cockpit.
// Schreibvorgänge werden gebündelt (mehrere Mutationen je Anfrage), damit die Cloudflare-Grenze für Unteranfragen hält.

import { dokLaden, dokListe, dokSpeichern, protokollieren } from './speicher'
import { boardLesen, gql, normal, schreibSchutz, spalteMitTitel, spieltagNr, statusLabels, wert, type Board, type Spalte } from './monday'

export type Bereich = 'projektplan' | 'fragen' | 'gewinner' | 'anzeigen'
export type Bericht = { bereich: Bereich; board?: string; gelesen: number; geschrieben: number; angelegt: number; uebernommen: string[]; hinweise: string[] }

type Gew = { id: string; name: string; ort: string; betrag: number; gewinnertext: string; einwilligung: boolean; fotoHash?: string; verlagTitel?: string; auszahlung?: string; mondayItemId?: string }
type Tag = { id: string; kampagneId: string; nr: number; datum: string; status: string; raetsel: { frage?: string; a1?: string; a2?: string; richtig?: number; loesung?: string; quelle?: string }; gewinner: Gew[]; verlagsStatus?: Record<string, string>; deadline?: string; aktualisiertAm: number }
type Karte = { projektplan?: string; fragen?: string; vorlagen?: string; anzeigen?: Record<string, string>; gewinner?: string; letzterAbgleich?: number; fehler?: string; sync?: Record<string, string> }
type Kamp = { id: string; spielId: string; monat: string; antwortformat?: string; vorlageAbc?: string; monday?: Karte }

const pad = (n: number) => String(n).padStart(2, '0')

// ------------------------------------------------------------------ Bündeln
type Op = { query: string; vars: Record<string, [string, unknown]> }
async function ausfuehren(ops: Op[], hinweise: string[]): Promise<number> {
  let n = 0
  for (let i = 0; i < ops.length; i += 20) {
    const teil = ops.slice(i, i + 20)
    const defs: string[] = []
    const vars: Record<string, unknown> = {}
    const koerper = teil.map((op, k) => {
      let q = op.query
      for (const [name, [typ, v]] of Object.entries(op.vars)) {
        const neu = `${name}_${k}`
        defs.push(`$${neu}: ${typ}`)
        vars[neu] = v
        q = q.replaceAll(`$${name}`, `$${neu}`)
      }
      return `m${k}: ${q}`
    })
    try {
      await gql(`mutation (${defs.join(', ')}) { ${koerper.join('\n')} }`, vars)
      n += teil.length
    } catch (e) {
      hinweise.push('Schreiben fehlgeschlagen: ' + (e instanceof Error ? e.message : String(e)))
    }
  }
  return n
}
const aendern = (boardId: string, itemId: string, werte: Record<string, unknown>): Op => ({
  query: 'change_multiple_column_values(board_id: $b, item_id: $i, column_values: $w, create_labels_if_missing: false) { id }',
  vars: { b: ['ID!', boardId], i: ['ID!', itemId], w: ['JSON!', JSON.stringify(werte)] },
})

async function anlegen(boardId: string, name: string, werte: Record<string, unknown>): Promise<string> {
  const d = await gql<{ create_item: { id: string } }>(
    'mutation ($b: ID!, $n: String!, $w: JSON) { create_item(board_id: $b, item_name: $n, column_values: $w, create_labels_if_missing: false) { id } }',
    { b: boardId, n: name, w: JSON.stringify(werte) },
  )
  return d.create_item.id
}

// ------------------------------------------------------------------ Status-Zuordnung Anzeigen-Board
const GRUPPEN_WORT: Record<string, string[]> = {
  FUNKE: ['funke'], SWMH: ['swmh', 'npg'], SWP: ['swp'], NUE: ['nurnberg', 'nbg'], SHZ: ['shz'], SAAR: ['saar'], NOZ: ['noz'],
  IPPEN: ['ippen'], AUGSBURGER: ['augsburg'], ZVNW: ['zvnw'], RHZ: ['rhein'],
}
function gruppeAusTitel(titel: string): string | null {
  const m = titel.match(/\(([^)]+)\)/)
  const inhalt = normal(m ? m[1] : titel).split(' ')
  for (const [g, worte] of Object.entries(GRUPPEN_WORT)) if (worte.some((w) => inhalt.includes(w))) return g
  return null
}
function labelZuStatus(label: string | null | undefined): string | null {
  if (!label) return null
  const n = normal(label)
  if (n.startsWith('tmi erstellen')) return 'tmi-erstellen'
  if (n.startsWith('grafik prufen')) return 'grafik-pruefen'
  if (n.startsWith('tmi korrektur ok')) return 'tmi-korrektur-ok'
  if (n.startsWith('tmi prufen')) return 'tmi-pruefen'
  if (n.endsWith(' ok')) return 'verlag-ok'
  if (n.endsWith(' fehler')) return 'verlag-fehler'
  return null
}
function statusZuLabel(s: Spalte, status: string): string | undefined {
  return statusLabels(s).find((l) => labelZuStatus(l) === status)
}

// ------------------------------------------------------------------ Abgleich
export async function abgleichen(kampagneId: string, bereich: Bereich, wer: string, nurLesen = false): Promise<Bericht> {
  const kd = await dokLaden('kampagne', kampagneId)
  if (!kd) throw new Error('Kampagne nicht gefunden.')
  const k = kd.daten as Kamp
  const karte: Karte = { ...(k.monday ?? {}) }
  const sync: Record<string, string> = { ...(karte.sync ?? {}) }
  const tageDoks = await dokListe('spieltag', { feld: 'kampagneId', wert: kampagneId })
  const tage = new Map(tageDoks.map((d) => [d.id, { daten: structuredClone(d.daten) as Tag, version: d.version, geaendert: false }]))
  const bericht: Bericht = { bereich, gelesen: 0, geschrieben: 0, angelegt: 0, uebernommen: [], hinweise: [] }
  const ops: Op[] = []

  const boardIds: Array<{ id: string; monat?: string }> =
    bereich === 'anzeigen' ? Object.entries(karte.anzeigen ?? {}).map(([monat, id]) => ({ id, monat })) : karte[bereich] ? [{ id: karte[bereich] as string }] : []
  if (!boardIds.length) throw new Error('Für diesen Bereich ist noch kein monday-Board verbunden.')

  for (const { id: boardId, monat } of boardIds) {
    const board = await boardLesen(boardId, undefined)
    // Werte nur der benötigten Spalten nachladen (spart Datenmenge)
    const schutz = schreibSchutz(board)
    const darfSchreiben = !nurLesen && !schutz
    if (schutz && !nurLesen) bericht.hinweise.push(schutz + ' → nur gelesen.')
    bericht.board = (bericht.board ? bericht.board + ' · ' : '') + board.name
    const mitWerten = await boardLesen(boardId, board.columns.map((c) => c.id))
    bericht.gelesen += mitWerten.items.length
    const wertVon = (item: Board['items'][number], spalte?: Spalte) => item.column_values?.find((c) => c.id === spalte?.id)

    const tageListe = [...tage.values()].filter((t) => !monat || t.daten.datum.startsWith(monat)).sort((a, b) => a.daten.nr - b.daten.nr)

    if (bereich === 'projektplan') {
      const sDatum = board.columns.find((c) => c.type === 'date' && normal(c.title) === 'spieltag')
      const sDeadline = board.columns.find((c) => c.type === 'date' && normal(c.title) === 'deadline')
      const sStatus = board.columns.find((c) => c.type === 'status' && normal(c.title) === 'status')
      for (const t of tageListe) {
        const s = t.daten
        const item = mitWerten.items.find((i) => spieltagNr(i.name) === s.nr)
        const statusText = s.status === 'freigegeben' ? 'OK' : (s.raetsel?.frage || s.raetsel?.loesung) && (s.nr === 1 || s.gewinner?.length) ? 'Spieltag bereit' : 'Daten fehlen'
        const werte: Record<string, unknown> = {}
        if (sDatum) { const w = wert(sDatum, s.datum); if (w && wertVon(item ?? { id: '', name: '' }, sDatum)?.text !== s.datum) werte[sDatum.id] = w }
        if (sStatus) { const w = wert(sStatus, statusText); if (w && wertVon(item ?? { id: '', name: '' }, sStatus)?.text !== statusText) werte[sStatus.id] = w }
        // Deadline aus monday übernehmen (wird als Frist im Countdown gezeigt)
        const dl = item && sDeadline ? wertVon(item, sDeadline)?.text : null
        if (dl && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(dl) && s.deadline !== dl.replace(' ', 'T').slice(0, 16)) {
          s.deadline = dl.replace(' ', 'T').slice(0, 16); t.geaendert = true; bericht.uebernommen.push(`Spieltag ${s.nr}: Deadline ${dl}`)
        }
        if (!darfSchreiben) continue
        if (!item) {
          try { await anlegen(boardId, `Spieltag ${pad(s.nr)}`, werte); bericht.angelegt++ } catch (e) { bericht.hinweise.push(String(e)) }
        } else if (Object.keys(werte).length) ops.push(aendern(boardId, item.id, werte))
      }
    }

    if (bereich === 'fragen') {
      const titel: Record<string, string[]> = { frage: ['frage', 'spielfrage', 'gewinnfrage', 'tagesfrage'], a1: ['antwort 1', 'antwort1'], a2: ['antwort 2', 'antwort2'], loesung: ['losung', 'losungswort', 'richtige antwort', 'richtig'] }
      const spalten = Object.fromEntries(Object.entries(titel).map(([f, t]) => [f, board.columns.find((c) => (c.type === 'text' || c.type === 'long_text') && t.includes(normal(c.title)))]))
      const sStatus = board.columns.find((c) => c.type === 'status' && normal(c.title) === 'status')
      if (!Object.values(spalten).some(Boolean)) bericht.hinweise.push('Keine Spalten „Frage / Antwort 1 / Antwort 2 / Lösung“ gefunden – nur der Status wird gesetzt.')
      for (const t of tageListe) {
        const s = t.daten
        const r = s.raetsel ?? {}
        const loesung = r.loesung ?? (r.richtig ? `${r.richtig} – ${r.richtig === 1 ? r.a1 ?? '' : r.a2 ?? ''}` : '')
        const werte: Record<string, unknown> = {}
        const setze = (sp: Spalte | undefined, v: string | undefined) => { if (sp && v) { const w = wert(sp, v); if (w) werte[sp.id] = w } }
        setze(spalten.frage, r.frage); setze(spalten.a1, r.a1); setze(spalten.a2, r.a2); setze(spalten.loesung, loesung)
        if (sStatus) setze(sStatus, s.status === 'freigegeben' ? 'Frage Final' : r.frage || r.loesung ? 'Frage OK' : undefined)
        if (!darfSchreiben) continue
        const item = mitWerten.items.find((i) => spieltagNr(i.name) === s.nr)
        if (!item) { try { await anlegen(boardId, `Spieltag ${pad(s.nr)}`, werte); bericht.angelegt++ } catch (e) { bericht.hinweise.push(String(e)) } }
        else if (Object.keys(werte).length) ops.push(aendern(boardId, item.id, werte))
      }
    }

    if (bereich === 'gewinner') {
      const sName = board.columns.find((c) => c.type === 'text' && normal(c.title) === 'name')
      const sVerlag = board.columns.find((c) => c.type === 'text' && normal(c.title).startsWith('gewinner von'))
      const sInfo = spalteMitTitel(board, 'Info')
      const sAusz = board.columns.find((c) => c.type === 'status' && normal(c.title).includes('auszahlung'))
      const AUSZ: Record<string, string> = { 'daten-fehlen': 'Daten fehlen', 'daten-vollstaendig': 'Daten vollständig', 'foto-fehlt': 'Foto fehlt noch', ueberwiesen: 'Gewinn überwiesen', 'keine-ueberweisung': 'keine ÜW' }
      const ausLabel = (l: string | null | undefined) => Object.entries(AUSZ).find(([, v]) => normal(v) === normal(l ?? ''))?.[0]
      for (const t of tageListe) {
        const s = t.daten
        for (let k = 0; k < (s.gewinner ?? []).length; k++) {
          const g = s.gewinner[k]
          if (!g.name?.trim()) continue
          const name = `Spieltag ${pad(s.nr)} Gewinner ${k + 1}`
          const item = (g.mondayItemId && mitWerten.items.find((i) => i.id === g.mondayItemId)) || mitWerten.items.find((i) => normal(i.name) === normal(name))
          // Auszahlung: Dreiwege-Vergleich
          const schl = `az:${g.id}`
          const m = item && sAusz ? ausLabel(wertVon(item, sAusz)?.text) : undefined
          const c = g.auszahlung ?? 'daten-fehlen'
          let ziel = c
          if (m && m !== (sync[schl] ?? m) && c === (sync[schl] ?? c)) { ziel = m; g.auszahlung = m; t.geaendert = true; bericht.uebernommen.push(`${name}: Auszahlung „${AUSZ[m]}“ aus monday`) }
          else if (m && !sync[schl] && m !== c && c === 'daten-fehlen') { ziel = m; g.auszahlung = m; t.geaendert = true; bericht.uebernommen.push(`${name}: Auszahlung „${AUSZ[m]}“ aus monday`) }
          sync[schl] = ziel
          const werte: Record<string, unknown> = {}
          const setze = (sp: Spalte | undefined, v: string | undefined) => { if (sp && v) { const w = wert(sp, v); if (w) werte[sp.id] = w } }
          setze(sName, g.name); setze(sVerlag, g.verlagTitel); setze(sInfo, g.gewinnertext); if (ziel !== m) setze(sAusz, AUSZ[ziel])
          if (!darfSchreiben) continue
          if (!item) {
            try { g.mondayItemId = await anlegen(boardId, name, werte); t.geaendert = true; bericht.angelegt++ } catch (e) { bericht.hinweise.push(String(e)) }
          } else {
            if (g.mondayItemId !== item.id) { g.mondayItemId = item.id; t.geaendert = true }
            if (Object.keys(werte).length) ops.push(aendern(boardId, item.id, werte))
          }
        }
      }
    }

    if (bereich === 'anzeigen') {
      const statusSpalten = board.columns.filter((c) => c.type === 'status').map((c) => ({ c, g: gruppeAusTitel(c.title) })).filter((x) => x.g)
      const vorschlag = (k.vorlageAbc ?? 'A').toUpperCase()
      for (const t of tageListe) {
        const s = t.daten
        const kandidaten = mitWerten.items.filter((i) => spieltagNr(i.name) === s.nr)
        const item = kandidaten.find((i) => new RegExp(`[·\\-–]\\s*${vorschlag}\\s*$`).test(i.name)) ?? kandidaten.find((i) => !/[·\-–]\s*[ABC]\s*$/.test(i.name))
        if (!item) { bericht.hinweise.push(`Kein Anzeigen-Element für Spieltag ${pad(s.nr)} (${vorschlag}).`); continue }
        const werte: Record<string, unknown> = {}
        for (const { c, g } of statusSpalten) {
          const schl = `vs:${s.id}:${g}`
          const m = labelZuStatus(wertVon(item, c)?.text)
          const cw = s.verlagsStatus?.[g!] ?? null
          const l = sync[schl]
          let ziel = cw
          if (m && m !== (l ?? null) && (cw ?? null) === (l ?? null)) { ziel = m; s.verlagsStatus = { ...(s.verlagsStatus ?? {}), [g!]: m }; t.geaendert = true; bericht.uebernommen.push(`Spieltag ${s.nr} · ${g}: ${wertVon(item, c)?.text} (aus monday)`) }
          if (ziel && ziel !== m) { const label = statusZuLabel(c, ziel); if (label) werte[c.id] = { label } }
          if (ziel) sync[schl] = ziel
        }
        if (darfSchreiben && Object.keys(werte).length) ops.push(aendern(boardId, item.id, werte))
      }
    }
  }

  if (ops.length) bericht.geschrieben += await ausfuehren(ops, bericht.hinweise)

  // Cockpit-Daten zurückschreiben (nur geänderte Spieltage)
  for (const [id, t] of tage) {
    if (!t.geaendert) continue
    try { await dokSpeichern('spieltag', id, { ...t.daten, aktualisiertAm: Date.now() }, t.version, `monday:${wer}`) }
    catch { bericht.hinweise.push(`Spieltag ${t.daten.nr} wurde während des Abgleichs im Cockpit geändert – bitte erneut abgleichen.`) }
  }
  karte.sync = sync
  karte.letzterAbgleich = Date.now()
  karte.fehler = bericht.hinweise.length ? bericht.hinweise.slice(0, 3).join(' · ') : undefined
  try { await dokSpeichern('kampagne', kampagneId, { ...k, monday: karte }, kd.version, wer) } catch { /* Kampagne parallel geändert – Abgleich-Stand beim nächsten Mal */ }
  await protokollieren({ wer, typ: 'monday', dokId: kampagneId, aktion: 'monday', zusammenfassung: `Abgleich ${bereich}: ${bericht.geschrieben} geschrieben, ${bericht.angelegt} angelegt, ${bericht.uebernommen.length} übernommen` })
  return bericht
}

/** Anzeigen-PDF in die passende Datei-Spalte laden (Element „Anz Spieltag NN“, Spalte „Anzeige (GRUPPE) [1|4 Gewinner]“). */
export async function anzeigeHochladen(opts: { kampagneId: string; monat: string; nr: number; gruppe: string; gewinner: 1 | 4; vorschlag: string; datei: Blob; dateiname: string; ersetzen: boolean }): Promise<string> {
  const kd = await dokLaden('kampagne', opts.kampagneId)
  const k = kd?.daten as Kamp | undefined
  const boardId = k?.monday?.anzeigen?.[opts.monat]
  if (!boardId) throw new Error(`Kein Anzeigen-Board für ${opts.monat} verbunden.`)
  const board = await boardLesen(boardId)
  const schutz = schreibSchutz(board)
  if (schutz) throw new Error(schutz)
  const kandidaten = board.items.filter((i) => spieltagNr(i.name) === opts.nr)
  const item = kandidaten.find((i) => new RegExp(`[·\\-–]\\s*${opts.vorschlag}\\s*$`).test(i.name)) ?? kandidaten.find((i) => !/[·\-–]\s*[ABC]\s*$/.test(i.name))
  if (!item) throw new Error(`Kein Element „Anz Spieltag ${pad(opts.nr)}“ im Board ${board.name}.`)
  const dateiSpalten = board.columns.filter((c) => c.type === 'file' && gruppeAusTitel(c.title) === opts.gruppe)
  const spalte = dateiSpalten.find((c) => normal(c.title).includes(`${opts.gewinner} gew`)) ?? dateiSpalten.find((c) => !normal(c.title).includes(' gew'))
  if (!spalte) throw new Error(`Keine Datei-Spalte „Anzeige (${opts.gruppe})“ im Board ${board.name}.`)
  if (opts.ersetzen) await gql('mutation ($b: ID!, $i: ID!, $v: JSON!) { change_multiple_column_values(board_id: $b, item_id: $i, column_values: $v) { id } }', { b: board.id, i: item.id, v: JSON.stringify({ [spalte.id]: { clear_all: true } }) })
  const { dateiHochladen } = await import('./monday')
  await dateiHochladen(item.id, spalte.id, opts.datei, opts.dateiname)
  return `${board.name} · ${item.name} · ${spalte.title}`
}
