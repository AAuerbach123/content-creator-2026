'use client'

// Cockpit · monday: Boards einer Kampagne verbinden, Abgleich je Bereich, Anzeigen-PDFs hochladen.
// Schutz: Geschrieben wird nur in private oder „TEST“-Boards – echte Boards erst mit MONDAY_LIVE=1 (Server).

import { useEffect, useMemo, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import Karte from '@/components/cockpit/Karte'
import Hinweis from '@/components/cockpit/Hinweis'
import { useIch } from '@/components/cockpit/IchKontext'
import { spielName } from '@/components/cockpit/HeuteZuTun'
import { alleKampagnen, spieltageLaden, kampagneLaden } from '@/lib/cockpit/daten-client'
import { nachMondayHochladen, zipHerunterladen } from '@/lib/cockpit/anzeigen-export'
import type { Kampagne, MondayKarte, Spieltag } from '@/lib/cockpit/typen'

type Bereich = 'projektplan' | 'fragen' | 'gewinner' | 'anzeigen'
type BoardInfo = { id: string; name: string; board_kind: string; board_folder_id: string | null }
type Bericht = { bereich: Bereich; board?: string; gelesen: number; geschrieben: number; angelegt: number; uebernommen: string[]; hinweise: string[] }

const BEREICHE: Array<{ b: Bereich; de: string; en: string; erklaerung: string }> = [
  { b: 'projektplan', de: 'a) Projektplan', en: 'a) Project plan', erklaerung: 'Spieltage, Datum, Status; Deadline kommt aus monday zurück' },
  { b: 'fragen', de: 'b) Fragen', en: 'b) Questions', erklaerung: 'Frage, Antworten, Lösung, Status' },
  { b: 'anzeigen', de: 'c2/c3) Anzeigen', en: 'c2/c3) Ads', erklaerung: 'Status je Verlagsgruppe in beide Richtungen' },
  { b: 'gewinner', de: 'd) Gewinner', en: 'd) Winners', erklaerung: 'Name, Zeitung, Zusatztext, Auszahlungs-Status in beide Richtungen' },
]

function monatAusName(name: string): string | undefined {
  const m = name.match(/(\d{2})_(\d{2})\b/)
  if (m) return `20${m[2]}-${m[1]}`
  const monate = ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember']
  const n = name.toLowerCase()
  const i = monate.findIndex((x) => n.includes(x))
  const j = n.match(/20(\d{2})/)
  return i >= 0 && j ? `20${j[1]}-${String(i + 1).padStart(2, '0')}` : undefined
}

function zuordnen(boards: BoardInfo[]): MondayKarte {
  const k: MondayKarte = { anzeigen: {} }
  for (const b of boards) {
    const n = b.name.replace(/^test\s+/i, '').trim().toLowerCase()
    if (n.startsWith('a)')) k.projektplan = b.id
    else if (n.startsWith('b)')) k.fragen = b.id
    else if (n.startsWith('c1)')) k.vorlagen = b.id
    else if (n.startsWith('c2)') || n.startsWith('c3)')) { const m = monatAusName(b.name); if (m) k.anzeigen![m] = b.id }
    else if (n.startsWith('d)')) k.gewinner = b.id
  }
  return k
}

export default function MondaySeite() {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const t = (d: string, e: string) => (de ? d : e)
  const { darf } = useIch()
  const [status, setStatus] = useState<{ token: boolean; live: boolean } | null>(null)
  const [kampagnen, setKampagnen] = useState<Kampagne[]>([])
  const [kampagneId, setKampagneId] = useState('')
  const [kampagne, setKampagne] = useState<Kampagne | undefined>()
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; name: string }>>([])
  const [ws, setWs] = useState('')
  const [ordner, setOrdner] = useState<Array<{ id: string; name: string }>>([])
  const [boards, setBoards] = useState<BoardInfo[]>([])
  const [ordnerId, setOrdnerId] = useState('')
  const [karte, setKarte] = useState<MondayKarte>({})
  const [berichte, setBerichte] = useState<Bericht[]>([])
  const [laeuft, setLaeuft] = useState<string | null>(null)
  const [nurLesen, setNurLesen] = useState(false)
  const [meldung, setMeldung] = useState<string | null>(null)
  const [tage, setTage] = useState<Spieltag[]>([])
  const [tagId, setTagId] = useState('')
  const [ersetzen, setErsetzen] = useState(true)
  const [fort, setFort] = useState<{ f: number; g: number; text: string } | null>(null)

  const post = async <T,>(body: unknown): Promise<T> => {
    const r = await fetch('/api/cockpit/monday', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const j = (await r.json()) as T & { fehler?: string }
    if (!r.ok) throw new Error(j.fehler ?? 'HTTP ' + r.status)
    return j
  }

  useEffect(() => {
    fetch('/api/cockpit/monday').then((r) => r.json()).then(setStatus).catch(() => setStatus(null))
    alleKampagnen().then((ks) => { setKampagnen(ks); setKampagneId((a) => a || ks[0]?.id || '') }).catch(() => undefined)
  }, [])
  useEffect(() => {
    if (!kampagneId) return
    kampagneLaden(kampagneId).then((k) => { setKampagne(k); setKarte(k?.monday ?? {}) }).catch(() => undefined)
    spieltageLaden(kampagneId).then((st) => { setTage(st); setTagId(st.find((s) => s.status === 'freigegeben')?.id ?? st[0]?.id ?? '') }).catch(() => undefined)
    setBerichte([])
  }, [kampagneId])

  const workspacesLaden = async () => {
    try { setWorkspaces((await post<{ workspaces: Array<{ id: string; name: string }> }>({ aktion: 'boards' })).workspaces) }
    catch (e) { setMeldung(String(e instanceof Error ? e.message : e)) }
  }
  const wsWaehlen = async (id: string) => {
    setWs(id); setOrdnerId('')
    try {
      const d = await post<{ ordner: Array<{ id: string; name: string }>; boards: BoardInfo[] }>({ aktion: 'boards', workspaceId: id })
      setOrdner(d.ordner); setBoards(d.boards)
    } catch (e) { setMeldung(String(e instanceof Error ? e.message : e)) }
  }
  const ordnerBoards = useMemo(() => boards.filter((b) => !ordnerId || b.board_folder_id === ordnerId), [boards, ordnerId])

  const verbinden = async () => {
    if (!kampagne) return
    try {
      await post({ aktion: 'verbinden', kampagneId: kampagne.id, karte: { ...karte, ordnerId } })
      setMeldung(t('Board-Zuordnung gespeichert.', 'Board mapping saved.'))
      setKampagne(await kampagneLaden(kampagne.id))
    } catch (e) { setMeldung(String(e instanceof Error ? e.message : e)) }
  }

  const abgleich = async (bereiche: Bereich[]) => {
    if (!kampagne) return
    setBerichte([])
    for (const b of bereiche) {
      const hatBoard = b === 'anzeigen' ? Object.keys(kampagne.monday?.anzeigen ?? {}).length > 0 : Boolean(kampagne.monday?.[b])
      if (!hatBoard) continue
      setLaeuft(b)
      try {
        const { bericht } = await post<{ bericht: Bericht }>({ aktion: 'abgleich', kampagneId: kampagne.id, bereich: b, nurLesen })
        setBerichte((alt) => [...alt, bericht])
      } catch (e) {
        setBerichte((alt) => [...alt, { bereich: b, gelesen: 0, geschrieben: 0, angelegt: 0, uebernommen: [], hinweise: [String(e instanceof Error ? e.message : e)] }])
      }
    }
    setLaeuft(null)
    setKampagne(await kampagneLaden(kampagne.id))
  }

  const tag = tage.find((s) => s.id === tagId)
  const hochladen = async () => {
    if (!kampagne || !tag) return
    setMeldung(null)
    const r = await nachMondayHochladen(kampagne, tag, ersetzen, (f, g, text) => setFort({ f, g, text }))
    setFort(null)
    setMeldung(r.fehler.length ? t(`${r.hoch} PDFs hochgeladen, ${r.fehler.length} Fehler: ${r.fehler.slice(0, 3).join(' · ')}`, `${r.hoch} uploaded, ${r.fehler.length} errors`) : t(`${r.hoch} PDFs nach monday hochgeladen.`, `${r.hoch} PDFs uploaded.`))
  }
  const zip = async () => {
    if (!kampagne || !tag) return
    try {
      const n = await zipHerunterladen(kampagne, tag, (f, g, text) => setFort({ f, g, text }))
      setMeldung(t(`${n} PDFs als ZIP gespeichert.`, `${n} PDFs saved as ZIP.`))
    } catch (e) { setMeldung(String(e instanceof Error ? e.message : e)) }
    setFort(null)
  }

  const boardName = (id?: string) => boards.find((b) => b.id === id)?.name ?? (id ? `#${id}` : '—')

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div>
        <h2 style={{ margin: '0 0 6px', fontSize: 24 }}>monday</h2>
        <p style={{ margin: 0, color: 'var(--tm-grau)', maxWidth: 820 }}>
          {t('Das Cockpit führt, monday wird automatisch nachgeführt: Spieltage, Fragen, Anzeigen-Status je Verlag und Gewinner mit Auszahlungs-Status. Was jemand in monday ändert (z. B. „Verlag: OK“ oder „Gewinn überwiesen“), kommt beim Abgleich zurück.', 'The cockpit leads; monday is kept in sync.')}
        </p>
      </div>

      {status && (
        <Hinweis art={status.token && !status.live ? 'gold' : 'rot'}>
          {!status.token
            ? t('Kein monday-Schlüssel hinterlegt (MONDAY_API_TOKEN). Abgleich nicht möglich.', 'No monday token configured.')
            : status.live
              ? t('LIVE: Schreiben in echte monday-Boards ist freigegeben.', 'LIVE: writing to production boards enabled.')
              : t('TEST-Modus: Geschrieben wird nur in private oder „TEST …“-Boards. Echte Boards werden nur gelesen, bis Andreas MONDAY_LIVE=1 setzt.', 'TEST mode: writes only to private/TEST boards.')}
        </Hinweis>
      )}
      {meldung && <Hinweis art="gold">{meldung}</Hinweis>}

      <div className="cockpit-feld" style={{ maxWidth: 420, marginBottom: 0 }}>
        <label htmlFor="md-kampagne">{t('Kampagne', 'Campaign')}</label>
        <select id="md-kampagne" value={kampagneId} onChange={(e) => setKampagneId(e.target.value)}>
          {kampagnen.map((k) => <option key={k.id} value={k.id}>{spielName(k.spielId)} · {k.monat}{k.monatBis ? '–' + k.monatBis.slice(5) : ''}</option>)}
        </select>
      </div>

      <Karte titel={t('1 · Boards verbinden', '1 · Connect boards')} hinweis={t('Ordner der Kampagne in monday wählen – die Boards a) bis d) werden am Namen erkannt. Einmal pro Kampagne (Admin).', 'Pick the campaign folder in monday.')}>
        {kampagne?.monday && (
          <ul style={{ margin: '0 0 12px', paddingLeft: 18, fontSize: 14 }}>
            <li>a) {boardName(kampagne.monday.projektplan)}</li>
            <li>b) {boardName(kampagne.monday.fragen)}</li>
            {Object.entries(kampagne.monday.anzeigen ?? {}).map(([m, id]) => <li key={m}>c) {m}: {boardName(id)}</li>)}
            <li>d) {boardName(kampagne.monday.gewinner)}</li>
            {kampagne.monday.letzterAbgleich && <li>{t('Letzter Abgleich', 'Last sync')}: {new Date(kampagne.monday.letzterAbgleich).toLocaleString('de-DE')}</li>}
          </ul>
        )}
        {darf('admin') ? (
          <>
            {!workspaces.length ? (
              <button type="button" className="cockpit-knopf sekundaer" onClick={workspacesLaden} disabled={!status?.token}>{t('monday-Arbeitsbereiche laden', 'Load monday workspaces')}</button>
            ) : (
              <div className="cockpit-spalten">
                <div className="cockpit-feld">
                  <label htmlFor="md-ws">{t('Arbeitsbereich', 'Workspace')}</label>
                  <select id="md-ws" value={ws} onChange={(e) => void wsWaehlen(e.target.value)}>
                    <option value="">—</option>
                    {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="cockpit-feld">
                  <label htmlFor="md-ordner">{t('Ordner', 'Folder')}</label>
                  <select id="md-ordner" value={ordnerId} onChange={(e) => { setOrdnerId(e.target.value); setKarte(zuordnen(boards.filter((b) => b.board_folder_id === e.target.value))) }}>
                    <option value="">—</option>
                    {ordner.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>
            )}
            {ordnerId && (
              <div className="cockpit-spalten" style={{ marginTop: 8 }}>
                {(['projektplan', 'fragen', 'gewinner'] as const).map((r) => (
                  <div key={r} className="cockpit-feld">
                    <label htmlFor={`md-${r}`}>{BEREICHE.find((x) => x.b === r)?.[de ? 'de' : 'en']}</label>
                    <select id={`md-${r}`} value={karte[r] ?? ''} onChange={(e) => setKarte({ ...karte, [r]: e.target.value || undefined })}>
                      <option value="">—</option>
                      {ordnerBoards.map((b) => <option key={b.id} value={b.id}>{b.name}{b.board_kind === 'private' ? ' (privat)' : ''}</option>)}
                    </select>
                  </div>
                ))}
                {Object.entries(karte.anzeigen ?? {}).map(([m, id]) => (
                  <div key={m} className="cockpit-feld">
                    <label>{t('Anzeigen', 'Ads')} {m}</label>
                    <select value={id} onChange={(e) => setKarte({ ...karte, anzeigen: { ...(karte.anzeigen ?? {}), [m]: e.target.value } })}>
                      {ordnerBoards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
            {ordnerId && <button type="button" className="cockpit-knopf primaer" onClick={verbinden}>{t('Zuordnung speichern', 'Save mapping')}</button>}
          </>
        ) : <p>{t('Boards verbinden dürfen Admins.', 'Only admins can connect boards.')}</p>}
      </Karte>

      <Karte titel={t('2 · Abgleichen', '2 · Sync')}>
        <ul className="cockpit-bereiche">
          {BEREICHE.map((x) => (
            <li key={x.b}>
              <b>{de ? x.de : x.en}</b> <small>{x.erklaerung}</small>
              <button type="button" className="cockpit-knopf text" disabled={Boolean(laeuft) || !kampagne?.monday} onClick={() => void abgleich([x.b])}>
                {laeuft === x.b ? '…' : t('abgleichen', 'sync')}
              </button>
            </li>
          ))}
        </ul>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, margin: '8px 0' }}>
          <input type="checkbox" checked={nurLesen} onChange={(e) => setNurLesen(e.target.checked)} />
          {t('Nur lesen (nichts nach monday schreiben – zum Ausprobieren)', 'Read only (dry run)')}
        </label>
        <button type="button" className="cockpit-knopf primaer" disabled={Boolean(laeuft) || !kampagne?.monday || !darf('bearbeiten')} onClick={() => void abgleich(['projektplan', 'fragen', 'anzeigen', 'gewinner'])}>
          {laeuft ? t('Gleiche ab …', 'Syncing …') : t('Alles abgleichen', 'Sync all')}
        </button>
        {berichte.length > 0 && (
          <ul className="cockpit-problemliste" style={{ marginTop: 12 }}>
            {berichte.map((b, i) => (
              <li key={i} className={b.hinweise.length ? 'fehler' : ''}>
                <b>{BEREICHE.find((x) => x.b === b.bereich)?.[de ? 'de' : 'en']}</b> {b.board ? `· ${b.board}` : ''}: {t(`${b.gelesen} gelesen, ${b.geschrieben} geändert, ${b.angelegt} neu, ${b.uebernommen.length} aus monday übernommen`, `${b.gelesen} read, ${b.geschrieben} written, ${b.angelegt} new, ${b.uebernommen.length} pulled`)}
                {b.uebernommen.length > 0 && <div><small>{b.uebernommen.slice(0, 8).join(' · ')}</small></div>}
                {b.hinweise.length > 0 && <div><small>{b.hinweise.slice(0, 5).join(' · ')}</small></div>}
              </li>
            ))}
          </ul>
        )}
      </Karte>

      <Karte titel={t('3 · Anzeigen-PDFs', '3 · Ad PDFs')} hinweis={t('Druckfertige PDFs aller teilnehmenden Zeitungen (1 und 4 Gewinner) erzeugen – als ZIP herunterladen oder direkt in die Datei-Spalten von monday laden.', 'Create print-ready PDFs.')}>
        <div className="cockpit-spalten">
          <div className="cockpit-feld">
            <label htmlFor="md-tag">{t('Spieltag', 'Game day')}</label>
            <select id="md-tag" value={tagId} onChange={(e) => setTagId(e.target.value)}>
              {tage.map((s) => <option key={s.id} value={s.id}>{s.nr} · {s.datum}{s.status === 'freigegeben' ? ' ✓' : ''}</option>)}
            </select>
          </div>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 10 }}>
          <input type="checkbox" checked={ersetzen} onChange={(e) => setErsetzen(e.target.checked)} />
          {t('Vorhandene Dateien in monday ersetzen', 'Replace existing files in monday')}
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="cockpit-knopf sekundaer" disabled={!tag || Boolean(fort)} onClick={zip}>{t('Als ZIP herunterladen', 'Download ZIP')}</button>
          <button type="button" className="cockpit-knopf primaer" disabled={!tag || Boolean(fort) || !Object.keys(kampagne?.monday?.anzeigen ?? {}).length || !darf('bearbeiten')} onClick={hochladen}>{t('Nach monday hochladen', 'Upload to monday')}</button>
        </div>
        {tag && tag.status !== 'freigegeben' && <p style={{ fontSize: 13, color: '#6B4A00' }}>{t('Hinweis: Dieser Spieltag ist noch nicht freigegeben.', 'Note: this game day is not approved yet.')}</p>}
        {fort && (
          <p role="status" style={{ marginTop: 10 }}>
            <progress max={fort.g} value={fort.f} style={{ width: 200, verticalAlign: 'middle' }} /> {fort.f}/{fort.g} · <small>{fort.text}</small>
          </p>
        )}
      </Karte>
    </div>
  )
}
