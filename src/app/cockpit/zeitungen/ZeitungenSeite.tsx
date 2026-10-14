'use client'

// Cockpit · Zeitungen & Rufnummern – je Spiel eine eigene Liste.
// 1. Spiel wählen
// 2. Liste hochladen (Excel .xlsx / CSV) oder aus Excel einfügen
// 3. Spalten prüfen (automatisch erkannt, änderbar)
// 4. Vorschau alt → neu, nicht erkannte Zeitungen von Hand zuordnen
// 5. Übernehmen (mit Rückgängig). Die Zeitungen der Liste machen bei diesem Spiel mit.
// Darunter: aktuelle Liste des Spiels, direkt bearbeitbar, als CSV herunterladbar.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import Karte from '@/components/cockpit/Karte'
import Hinweis from '@/components/cockpit/Hinweis'
import Aktionsleiste from '@/components/cockpit/Aktionsleiste'
import { katalog } from '@/lib/serie/spiele'
import type { SerienDaten, Zeitung } from '@/lib/serie/types'
import {
  aenderungenAus,
  alsCsv,
  dateiLesen,
  datenMitStamm,
  hatKopfzeile,
  importVorschau,
  nummerBereinigen,
  nummerFehler,
  nummernFeldFuer,
  spaltenErkennen,
  stammId,
  stammLaden,
  stammSpeichern,
  textLesen,
  ziffern,
  type NummernFeld,
  type Spaltenrolle,
  type Tabelle,
  type ZeitungAenderung,
  type ZeitungenStamm,
} from '@/lib/cockpit/zeitungen-stamm'

const KATALOG = katalog()

/** Erkannte Nummern-Spalten auf das Feld des Spiels abbilden (nur eine Nummern-Spalte). */
function rollenFuerSpiel(r: Spaltenrolle[], feld: NummernFeld): Spaltenrolle[] {
  let vergeben = false
  return r.map((x) => {
    if (x !== 'nummer' && x !== 'raetsel_nummer') return x
    if (vergeben) return 'ignorieren'
    vergeben = true
    return feld
  })
}

export default function ZeitungenSeite() {
  const { sprache } = useSprache()
  const router = useRouter()
  const de = sprache === 'de'
  const t = (d: string, e: string) => (de ? d : e)

  const [spielId, setSpielId] = useState<string>('')
  const [original, setOriginal] = useState<SerienDaten | null>(null)
  const [stamm, setStamm] = useState<ZeitungenStamm | undefined>(undefined)
  const [ladeFehler, setLadeFehler] = useState<string | null>(null)

  // Import-Zustand
  const [dateiName, setDateiName] = useState<string>('')
  const [tabelle, setTabelle] = useState<Tabelle | null>(null)
  const [kopf, setKopf] = useState(true)
  const [rollen, setRollen] = useState<Spaltenrolle[]>([])
  const [hand, setHand] = useState<Record<number, string>>({})
  const [nurListe, setNurListe] = useState(true)
  const [einfuegen, setEinfuegen] = useState('')
  const [leseFehler, setLeseFehler] = useState<string | null>(null)
  const [meldung, setMeldung] = useState<{ text: string; rueckgaengig: boolean } | null>(null)
  const [ziehen, setZiehen] = useState(false)
  const dateiRef = useRef<HTMLInputElement | null>(null)

  // Spiel aus der Adresse (?spiel=…) übernehmen
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('spiel')
    setSpielId(p && KATALOG.some((k) => k.id === p) ? p : KATALOG[0]?.id ?? 'geldregen')
  }, [])

  useEffect(() => {
    fetch('/serie/zeitungen.json')
      .then((r) => r.json() as Promise<SerienDaten>)
      .then(setOriginal)
      .catch((e) => setLadeFehler(e instanceof Error ? e.message : String(e)))
  }, [])

  useEffect(() => {
    if (!spielId) return
    setTabelle(null); setMeldung(null); setLeseFehler(null)
    stammLaden(spielId).then(setStamm).catch(() => setStamm(undefined))
  }, [spielId])

  const eintrag = KATALOG.find((k) => k.id === spielId)
  const feld: NummernFeld = nummernFeldFuer(spielId, eintrag?.art === 'spiel' ? eintrag.spiel.mechanik.art : undefined)
  const feldName = feld === 'nummer'
    ? t('Gewinn-Hotline (Vorwahl ohne Endziffer)', 'Prize hotline (prefix without last digit)')
    : t('Gewinn-Hotline', 'Prize hotline')

  const spielWechseln = (id: string) => {
    setSpielId(id)
    router.replace(`/cockpit/zeitungen?spiel=${encodeURIComponent(id)}`)
  }

  const alle = useMemo(() => (original ? datenMitStamm(original, stamm).zeitungen : []), [original, stamm])
  const teilnehmer = stamm?.teilnehmer
  const machtMit = (id: string) => !teilnehmer || teilnehmer.length === 0 || teilnehmer.includes(id)

  // ---------------------------------------------------------------- Import
  const tabelleSetzen = useCallback((tab: Tabelle, name: string) => {
    if (tab.length === 0) { setLeseFehler(t('Die Datei ist leer.', 'The file is empty.')); return }
    const k = hatKopfzeile(tab)
    setTabelle(tab); setKopf(k); setRollen(rollenFuerSpiel(spaltenErkennen(tab, k), feld)); setHand({}); setDateiName(name)
    setLeseFehler(null); setMeldung(null); setNurListe(true)
  }, [de, feld]) // eslint-disable-line react-hooks/exhaustive-deps

  const dateiVerarbeiten = async (f: File | undefined) => {
    if (!f) return
    try { tabelleSetzen(await dateiLesen(f), f.name) }
    catch (e) { setLeseFehler(e instanceof Error ? e.message : String(e)) }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setZiehen(false)
    void dateiVerarbeiten(e.dataTransfer.files?.[0])
  }

  const vorschau = useMemo(
    () => (tabelle && original ? importVorschau(tabelle, kopf, rollen, alle, hand) : []),
    [tabelle, kopf, rollen, alle, hand, original],
  )
  const neu = useMemo(() => aenderungenAus(vorschau, alle), [vorschau, alle])
  const anzahlAenderungen = Object.values(neu).reduce((s, a) => s + Object.keys(a).length, 0)
  const neueTeilnehmer = useMemo(() => Array.from(new Set(vorschau.map((z) => z.zeitungId).filter((x): x is string => Boolean(x)))), [vorschau])
  const teilnehmerAendern = nurListe && neueTeilnehmer.length > 0 &&
    (neueTeilnehmer.length !== (teilnehmer?.length ?? alle.length) || neueTeilnehmer.some((id) => !machtMit(id)))
  const ohneZuordnung = vorschau.filter((z) => !z.zeitungId).length
  const mitFehler = vorschau.filter((z) => Object.keys(z.fehler).length > 0).length
  const fehlendeRollen = !rollen.includes('zeitung')
    ? t('Bitte eine Spalte als „Zeitung (Name)“ festlegen.', 'Please mark one column as “Newspaper (name)”.')
    : !rollen.includes(feld)
      ? t('Bitte die Spalte mit der Telefonnummer festlegen.', 'Please mark the column with the phone number.')
      : null

  const speichern = async (aenderungen: Record<string, ZeitungAenderung>, tn: string[] | undefined, quelle: string) => {
    const s: ZeitungenStamm = {
      id: stammId(spielId),
      art: 'zeitungen',
      spielId,
      aenderungen,
      teilnehmer: tn,
      vorher: { aenderungen: stamm?.aenderungen ?? {}, teilnehmer: stamm?.teilnehmer },
      quelle,
      aktualisiertAm: Date.now(),
    }
    await stammSpeichern(s)
    setStamm(s)
  }

  /** Änderung gegen das Original bereinigen: gleich wie Original → Eintrag entfernen. */
  const zusammenfuehren = (basis: Record<string, ZeitungAenderung>, dazu: Record<string, ZeitungAenderung>) => {
    const out: Record<string, ZeitungAenderung> = JSON.parse(JSON.stringify(basis))
    for (const [id, a] of Object.entries(dazu)) {
      const orig = original?.zeitungen.find((z) => z.id === id)
      for (const [f, wert] of Object.entries(a) as Array<[NummernFeld, string | null]>) {
        if (ziffern(wert) === ziffern(orig?.[f] ?? null)) { if (out[id]) delete out[id][f] }
        else (out[id] = out[id] || {})[f] = wert
      }
      if (out[id] && Object.keys(out[id]).length === 0) delete out[id]
    }
    return out
  }

  const uebernehmen = async () => {
    if (anzahlAenderungen === 0 && !teilnehmerAendern) return
    const tn = nurListe && neueTeilnehmer.length > 0 ? neueTeilnehmer : stamm?.teilnehmer
    await speichern(zusammenfuehren(stamm?.aenderungen ?? {}, neu), tn, dateiName || t('eingefügt', 'pasted'))
    const teile = [
      anzahlAenderungen > 0 ? t(`${anzahlAenderungen} Nummern übernommen`, `${anzahlAenderungen} numbers applied`) : '',
      nurListe && neueTeilnehmer.length > 0 ? t(`${neueTeilnehmer.length} Zeitungen machen bei ${eintrag?.name ?? spielId} mit`, `${neueTeilnehmer.length} newspapers take part in ${eintrag?.name ?? spielId}`) : '',
    ].filter(Boolean)
    setMeldung({ text: teile.join(' · ') + '.', rueckgaengig: true })
    setTabelle(null); setEinfuegen('')
  }

  const rueckgaengig = async () => {
    await speichern(stamm?.vorher?.aenderungen ?? {}, stamm?.vorher?.teilnehmer, t('rückgängig', 'undo'))
    setMeldung({ text: t('Letzte Übernahme rückgängig gemacht.', 'Last import undone.'), rueckgaengig: false })
  }

  const allesVerwerfen = async () => {
    if (!window.confirm(t(`Liste für ${eintrag?.name ?? spielId} verwerfen und zur Original-Liste (alle Zeitungen, ursprüngliche Nummern) zurückkehren?`, `Discard the list for ${eintrag?.name ?? spielId} and return to the original list?`))) return
    await speichern({}, undefined, t('Original', 'original'))
    setMeldung({ text: t('Original-Liste wiederhergestellt.', 'Original list restored.'), rueckgaengig: true })
  }

  // ---------------------------------------------------------------- Direkt bearbeiten
  const [entwurf, setEntwurf] = useState<Record<string, string>>({})
  const entwurfFehler = (id: string) => {
    const w = entwurf[id]
    return w === undefined ? undefined : nummerFehler(nummerBereinigen(w).wert)
  }
  const feldSpeichern = async (z: Zeitung) => {
    const roh = entwurf[z.id]
    if (roh === undefined) return
    const { wert } = nummerBereinigen(roh)
    if (nummerFehler(wert)) return
    const neuWert = wert === '' ? null : wert
    const weg = () => setEntwurf(({ [z.id]: _, ...rest }) => rest)
    if (ziffern(neuWert) === ziffern(z[feld] ?? null)) { weg(); return }
    await speichern(zusammenfuehren(stamm?.aenderungen ?? {}, { [z.id]: { [feld]: neuWert } }), stamm?.teilnehmer, t('von Hand', 'manual'))
    weg()
    setMeldung({ text: t(`${z.name}: Nummer gespeichert.`, `${z.name}: number saved.`), rueckgaengig: true })
  }
  const mitmachenUmschalten = async (id: string, an: boolean) => {
    const basis = teilnehmer?.length ? teilnehmer : alle.map((z) => z.id)
    const tn = an ? Array.from(new Set([...basis, id])) : basis.filter((x) => x !== id)
    await speichern(stamm?.aenderungen ?? {}, tn.length === alle.length ? undefined : tn, t('von Hand', 'manual'))
  }

  const csvHerunterladen = () => {
    const liste = alle.filter((z) => machtMit(z.id))
    const blob = new Blob([alsCsv(liste)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `Zeitungen_Rufnummern_${spielId}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (ladeFehler) return <Hinweis rolle="alert">{t('Zeitungsliste konnte nicht geladen werden: ', 'Could not load newspaper list: ')}{ladeFehler}</Hinweis>
  if (!original || !spielId) return <p style={{ color: 'var(--tm-grau)' }}>{t('Lade Zeitungen …', 'Loading newspapers …')}</p>

  const mitmachende = alle.filter((z) => machtMit(z.id))
  const fehlend = mitmachende.filter((z) => !z[feld]).length
  const breite = tabelle ? Math.max(...tabelle.map((z) => z.length)) : 0
  const rollenOptionen: Array<{ wert: Spaltenrolle; name: string }> = [
    { wert: 'ignorieren', name: t('– nicht verwenden –', '– ignore –') },
    { wert: 'zeitung', name: t('Zeitung (Name)', 'Newspaper (name)') },
    { wert: feld, name: t('Telefonnummer', 'Phone number') },
  ]

  return (
    <div style={{ display: 'grid', gap: 20, paddingBottom: tabelle ? 80 : 0 }}>
      <div>
        <Link href={`/cockpit/${spielId}`} className="cockpit-knopf text" style={{ paddingLeft: 0 }}>← {eintrag?.name ?? t('Cockpit', 'Cockpit')}</Link>
        <h2 style={{ margin: '4px 0 6px', fontSize: 24 }}>{t('Zeitungen & Rufnummern', 'Newspapers & phone numbers')}</h2>
        <p style={{ margin: 0, color: 'var(--tm-grau)', maxWidth: 760 }}>
          {t(
            'Jedes Spiel hat seine eigene Liste. Lade die Zeitungen mit ihren Telefonnummern hoch – die Anzeigen dieses Spiels übernehmen sie automatisch.',
            'Each game has its own list. Upload the newspapers with their phone numbers – the ads of this game use them automatically.',
          )}
        </p>
      </div>

      <div className="cockpit-feld" style={{ maxWidth: 420, marginBottom: 0 }}>
        <label htmlFor="zs-spiel">{t('Für welches Spiel?', 'For which game?')}</label>
        <select id="zs-spiel" value={spielId} onChange={(e) => spielWechseln(e.target.value)}>
          {KATALOG.map((k) => <option key={k.id} value={k.id}>{k.name} · {k.monate.join(', ')}</option>)}
        </select>
        <span className="hinweis">
          {stamm?.quelle
            ? t(`Eigene Liste vorhanden (${stamm.quelle}, ${new Date(stamm.aktualisiertAm).toLocaleDateString('de-DE')}).`, `Own list present (${stamm.quelle}, ${new Date(stamm.aktualisiertAm).toLocaleDateString('en-GB')}).`)
            : t('Noch keine eigene Liste – es gilt die Standardliste.', 'No own list yet – the default list applies.')}
        </span>
      </div>

      {meldung && (
        <Hinweis art="gold">
          <span>{meldung.text}</span>
          {meldung.rueckgaengig && stamm?.vorher && (
            <button type="button" className="cockpit-knopf text" onClick={rueckgaengig} style={{ marginLeft: 8 }}>
              {t('Rückgängig', 'Undo')}
            </button>
          )}
        </Hinweis>
      )}

      {/* ---------------------------------------------------- 1 · Hochladen */}
      {!tabelle && (
        <Karte titel={t(`1 · Liste für ${eintrag?.name ?? spielId} hochladen`, `1 · Upload list for ${eintrag?.name ?? spielId}`)}>
          <div
            className={`cockpit-ablage${ziehen ? ' aktiv' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setZiehen(true) }}
            onDragLeave={() => setZiehen(false)}
            onDrop={onDrop}
          >
            <p style={{ margin: '0 0 10px', fontWeight: 600, color: 'var(--tm-dunkel)' }}>
              {t('Excel- oder CSV-Datei hierher ziehen', 'Drag an Excel or CSV file here')}
            </p>
            <button type="button" className="cockpit-knopf primaer" onClick={() => dateiRef.current?.click()}>
              {t('Datei auswählen', 'Choose file')}
            </button>
            <input
              ref={dateiRef}
              type="file"
              accept=".xlsx,.xlsm,.csv,.txt"
              hidden
              onChange={(e) => { void dateiVerarbeiten(e.target.files?.[0]); e.target.value = '' }}
            />
            <p style={{ margin: '10px 0 0', fontSize: 13 }}>
              {t('Benötigt: eine Spalte mit dem Zeitungsnamen und eine mit der Telefonnummer. Reihenfolge und weitere Spalten sind egal.', 'Needed: one column with the newspaper name and one with the phone number. Order and extra columns do not matter.')}
            </p>
          </div>

          <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t('Oder: Zellen aus Excel kopieren und hier einfügen', 'Or: copy cells from Excel and paste here')}</summary>
            <div className="cockpit-feld" style={{ marginTop: 10 }}>
              <textarea
                aria-label={t('Eingefügte Tabelle', 'Pasted table')}
                rows={6}
                value={einfuegen}
                placeholder={t('Zeitung\tTelefonnummer\nFrankenpost\t01378 40 82', 'Newspaper\tPhone number\nFrankenpost\t01378 40 82')}
                onChange={(e) => setEinfuegen(e.target.value)}
              />
            </div>
            <button type="button" className="cockpit-knopf sekundaer" disabled={!einfuegen.trim()} onClick={() => tabelleSetzen(textLesen(einfuegen), t('eingefügt', 'pasted'))}>
              {t('Eingefügte Liste prüfen', 'Check pasted list')}
            </button>
          </details>

          {leseFehler && <div style={{ marginTop: 12 }}><Hinweis rolle="alert">{leseFehler}</Hinweis></div>}
        </Karte>
      )}

      {/* ---------------------------------------------------- 2 · Spalten */}
      {tabelle && (
        <Karte titel={t('2 · Spalten prüfen', '2 · Check columns')} hinweis={t(`Datei: ${dateiName} · ${tabelle.length} Zeilen. Die Spalten wurden automatisch erkannt – bei Bedarf hier ändern.`, `File: ${dateiName} · ${tabelle.length} rows. Columns were detected automatically – change if needed.`)}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, fontSize: 14 }}>
            <input type="checkbox" checked={kopf} onChange={(e) => { setKopf(e.target.checked); setRollen(rollenFuerSpiel(spaltenErkennen(tabelle, e.target.checked), feld)) }} />
            {t('Erste Zeile enthält Überschriften', 'First row contains headings')}
          </label>
          <div className="cockpit-spalten">
            {Array.from({ length: breite }, (_, i) => (
              <div key={i} className="cockpit-feld" style={{ marginBottom: 0 }}>
                <label htmlFor={`sp-${i}`}>{kopf ? tabelle[0][i] || t(`Spalte ${i + 1}`, `Column ${i + 1}`) : t(`Spalte ${i + 1}`, `Column ${i + 1}`)}</label>
                <select id={`sp-${i}`} value={rollen[i] ?? 'ignorieren'} onChange={(e) => {
                  const r = [...rollen]
                  const wert = e.target.value as Spaltenrolle
                  if (wert !== 'ignorieren') r.forEach((x, j) => { if (x === wert) r[j] = 'ignorieren' })
                  r[i] = wert
                  setRollen(r)
                }}>
                  {rollenOptionen.map((o) => <option key={o.wert} value={o.wert}>{o.name}</option>)}
                </select>
                <span className="hinweis">{tabelle.slice(kopf ? 1 : 0, (kopf ? 1 : 0) + 2).map((z) => z[i]).filter(Boolean).join(' · ') || '—'}</span>
              </div>
            ))}
          </div>
          {fehlendeRollen && <div style={{ marginTop: 12 }}><Hinweis rolle="alert">{fehlendeRollen}</Hinweis></div>}
        </Karte>
      )}

      {/* ---------------------------------------------------- 3 · Vorschau */}
      {tabelle && !fehlendeRollen && (
        <Karte titel={t('3 · Vorschau', '3 · Preview')}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <span className="cockpit-chip gruen">{anzahlAenderungen} {t('neue Nummern', 'new numbers')}</span>
            <span className="cockpit-chip grau">{neueTeilnehmer.length} {t('Zeitungen erkannt', 'newspapers matched')}</span>
            {ohneZuordnung > 0 && <span className="cockpit-chip gelb">{ohneZuordnung} {t('nicht zugeordnet', 'not matched')}</span>}
            {mitFehler > 0 && <span className="cockpit-chip rot">{mitFehler} {t('mit Fehler (wird nicht übernommen)', 'with errors (skipped)')}</span>}
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, fontSize: 14 }}>
            <input type="checkbox" checked={nurListe} onChange={(e) => setNurListe(e.target.checked)} />
            {t(`Nur die Zeitungen aus dieser Liste machen bei ${eintrag?.name ?? spielId} mit`, `Only the newspapers in this list take part in ${eintrag?.name ?? spielId}`)}
          </label>
          <div style={{ overflowX: 'auto' }}>
            <table className="cockpit-tabelle">
              <thead>
                <tr>
                  <th>{t('Zeile', 'Row')}</th>
                  <th>{t('Name in der Datei', 'Name in file')}</th>
                  <th>{t('Zeitung im Tool', 'Newspaper in tool')}</th>
                  <th>{feldName}</th>
                </tr>
              </thead>
              <tbody>
                {vorschau.map((z) => {
                  const heute = alle.find((x) => x.id === z.zeitungId)
                  const neuW = z.werte[feld]
                  const altW = heute?.[feld] ?? null
                  return (
                    <tr key={z.zeile} className={!z.zeitungId ? 'offen' : ''}>
                      <td className="leise">{z.zeile}</td>
                      <td>{z.name || '—'}</td>
                      <td>
                        <select
                          aria-label={t(`Zuordnung Zeile ${z.zeile}`, `Match row ${z.zeile}`)}
                          value={z.zeitungId ?? ''}
                          onChange={(e) => setHand((h) => ({ ...h, [z.zeile - 1]: e.target.value }))}
                        >
                          <option value="">{t('– nicht übernehmen –', '– skip –')}</option>
                          {alle.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                        </select>
                        {!z.zeitungId && <div className="warnung">{t('Unbekannt: bitte zuordnen oder überspringen. Ganz neue Zeitungen (Logo, Format) legt Andreas an.', 'Unknown: match or skip. Brand-new newspapers (logo, format) are added by Andreas.')}</div>}
                      </td>
                      {!neuW ? <td className="leise">—</td> : (
                        <td>
                          {z.fehler[feld] ? (
                            <span className="fehlertext">{neuW} · {z.fehler[feld]}</span>
                          ) : ziffern(neuW) === ziffern(altW) ? (
                            <span className="leise">{neuW} ({t('unverändert', 'unchanged')})</span>
                          ) : (
                            <span><span className="alt">{altW ?? t('fehlt', 'missing')}</span> → <strong>{neuW}</strong></span>
                          )}
                          {z.warnung[feld] && <div className="warnung">⚠ {z.warnung[feld]}</div>}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Karte>
      )}

      {tabelle && (
        <Aktionsleiste
          neben={<button type="button" className="cockpit-knopf sekundaer" onClick={() => { setTabelle(null); setLeseFehler(null) }}>{t('Abbrechen', 'Cancel')}</button>}
          haupt={
            <button type="button" className="cockpit-knopf primaer" disabled={(anzahlAenderungen === 0 && !teilnehmerAendern) || Boolean(fehlendeRollen)} onClick={uebernehmen}>
              {anzahlAenderungen === 0 && !teilnehmerAendern ? t('Keine Änderungen', 'No changes') : t('Liste übernehmen', 'Apply list')}
            </button>
          }
        />
      )}

      {/* ---------------------------------------------------- Aktuelle Liste */}
      <Karte
        titel={t(`Aktuelle Liste · ${mitmachende.length} von ${alle.length} Zeitungen machen mit`, `Current list · ${mitmachende.length} of ${alle.length} newspapers take part`)}
        aktion={
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" className="cockpit-knopf text" onClick={csvHerunterladen}>{t('Als CSV herunterladen', 'Download CSV')}</button>
            {stamm && (Object.keys(stamm.aenderungen).length > 0 || stamm.teilnehmer) && (
              <button type="button" className="cockpit-knopf text" onClick={allesVerwerfen}>{t('Original wiederherstellen', 'Restore original')}</button>
            )}
          </span>
        }
      >
        {fehlend > 0 && (
          <div style={{ marginBottom: 12 }}>
            <Hinweis art="gold">{t(`${fehlend} mitmachende Zeitungen haben noch keine Nummer – in der Anzeige erscheint dort ein gelber Platzhalter.`, `${fehlend} participating newspapers have no number yet – the ad shows a yellow placeholder.`)}</Hinweis>
          </div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table className="cockpit-tabelle">
            <thead>
              <tr>
                <th>{t('Macht mit', 'Takes part')}</th>
                <th>{t('Zeitung', 'Newspaper')}</th>
                <th>{t('Gruppe', 'Group')}</th>
                <th>{feldName}</th>
              </tr>
            </thead>
            <tbody>
              {alle.map((z) => {
                const fehler = entwurfFehler(z.id)
                const mit = machtMit(z.id)
                return (
                  <tr key={z.id} className={mit ? '' : 'aus'}>
                    <td>
                      <input type="checkbox" checked={mit} aria-label={t(`${z.name} macht mit`, `${z.name} takes part`)} onChange={(e) => void mitmachenUmschalten(z.id, e.target.checked)} />
                    </td>
                    <td>{z.name}</td>
                    <td className="leise">{z.hotline}</td>
                    <td>
                      <div className={`cockpit-feld kompakt${fehler ? ' fehler' : ''}`}>
                        <input
                          aria-label={`${z.name} · ${feldName}`}
                          value={entwurf[z.id] ?? z[feld] ?? ''}
                          placeholder={t('fehlt', 'missing')}
                          inputMode="tel"
                          onChange={(e) => setEntwurf((d) => ({ ...d, [z.id]: e.target.value }))}
                          onBlur={() => void feldSpeichern(z)}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                          aria-invalid={Boolean(fehler) || undefined}
                        />
                        {fehler && <span className="fehlertext">{fehler}</span>}
                        {!fehler && stamm?.aenderungen?.[z.id]?.[feld] !== undefined && <span className="hinweis">{t('geändert', 'changed')}</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 12, fontSize: 13 }}>
          {t(
            'Gespeichert in diesem Browser. Auf einem anderen Computer: „Als CSV herunterladen“ und dort wieder hochladen.',
            'Saved in this browser. On another computer: “Download CSV” and upload it there.',
          )}
        </p>
      </Karte>
    </div>
  )
}
