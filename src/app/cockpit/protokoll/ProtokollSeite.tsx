'use client'

// Protokoll: wer hat wann was geändert (Vorschlag 7).
import { useEffect, useMemo, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import Karte from '@/components/cockpit/Karte'
import Hinweis from '@/components/cockpit/Hinweis'

type Eintrag = { id: string; zeit: number; wer: string; typ: string; dokId: string; aktion: string; zusammenfassung: string }

const TYP_TEXT: Record<string, { de: string; en: string }> = {
  kampagne: { de: 'Kampagne', en: 'Campaign' },
  spieltag: { de: 'Spieltag', en: 'Game day' },
  serienGewinner: { de: 'Gewinner (Anzeige)', en: 'Winner (ad)' },
  stamm: { de: 'Zeitungen/Texte', en: 'Newspapers/texts' },
  cockpitVorlage: { de: 'Vorlage', en: 'Template' },
  portalLink: { de: 'Kundenlink', en: 'Client link' },
  portalStatus: { de: 'Kundenportal', en: 'Client portal' },
  benutzer: { de: 'Team', en: 'Team' },
  mondayKarte: { de: 'monday', en: 'monday' },
  monday: { de: 'monday', en: 'monday' },
  einstellung: { de: 'Einstellung', en: 'Setting' },
}

const AKTION_TEXT: Record<string, { de: string; en: string }> = {
  angelegt: { de: 'angelegt', en: 'created' },
  geaendert: { de: 'geändert', en: 'changed' },
  geloescht: { de: 'gelöscht', en: 'deleted' },
  freigegeben: { de: 'freigegeben', en: 'approved' },
  portal: { de: 'Kunde', en: 'client' },
  monday: { de: 'monday', en: 'monday' },
  sonstiges: { de: '—', en: '—' },
}

export default function ProtokollSeite() {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const [eintraege, setEintraege] = useState<Eintrag[]>([])
  const [fehler, setFehler] = useState<string | null>(null)
  const [typ, setTyp] = useState('')
  const [suche, setSuche] = useState('')

  useEffect(() => {
    const q = new URLSearchParams({ limit: '500' })
    if (typ) q.set('typ', typ)
    fetch('/api/cockpit/protokoll?' + q, { cache: 'no-store' })
      .then(async (r) => {
        const j = (await r.json()) as { eintraege?: Eintrag[]; fehler?: string }
        if (!r.ok) throw new Error(j.fehler ?? 'HTTP ' + r.status)
        setEintraege(j.eintraege ?? [])
      })
      .catch((e) => setFehler(e instanceof Error ? e.message : String(e)))
  }, [typ])

  const gefiltert = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return s ? eintraege.filter((e) => `${e.wer} ${e.zusammenfassung}`.toLowerCase().includes(s)) : eintraege
  }, [eintraege, suche])

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div>
        <h2 style={{ margin: '0 0 6px', fontSize: 24 }}>{de ? 'Protokoll' : 'Activity log'}</h2>
        <p style={{ margin: 0, color: 'var(--tm-grau)' }}>{de ? 'Wer hat wann was geändert – für Rückfragen von Verlagen.' : 'Who changed what and when.'}</p>
      </div>
      {fehler && <Hinweis rolle="alert">{fehler}</Hinweis>}
      <Karte>
        <div className="cockpit-spalten" style={{ marginBottom: 12 }}>
          <div className="cockpit-feld">
            <label htmlFor="pr-typ">{de ? 'Bereich' : 'Area'}</label>
            <select id="pr-typ" value={typ} onChange={(e) => setTyp(e.target.value)}>
              <option value="">{de ? 'alle' : 'all'}</option>
              {Object.entries(TYP_TEXT).map(([k, v]) => <option key={k} value={k}>{v[sprache]}</option>)}
            </select>
          </div>
          <div className="cockpit-feld">
            <label htmlFor="pr-suche">{de ? 'Suche (Person, Inhalt)' : 'Search'}</label>
            <input id="pr-suche" value={suche} onChange={(e) => setSuche(e.target.value)} />
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="cockpit-tabelle">
            <thead><tr><th>{de ? 'Zeit' : 'Time'}</th><th>{de ? 'Person' : 'Person'}</th><th>{de ? 'Bereich' : 'Area'}</th><th>{de ? 'Aktion' : 'Action'}</th><th>{de ? 'Was' : 'What'}</th></tr></thead>
            <tbody>
              {gefiltert.length === 0 && <tr><td colSpan={5} className="leise">{de ? 'Noch keine Einträge.' : 'No entries yet.'}</td></tr>}
              {gefiltert.map((e) => (
                <tr key={e.id}>
                  <td className="leise" style={{ whiteSpace: 'nowrap' }}>{new Date(e.zeit).toLocaleString(de ? 'de-DE' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{e.wer}</td>
                  <td>{TYP_TEXT[e.typ]?.[sprache] ?? e.typ}</td>
                  <td>{AKTION_TEXT[e.aktion]?.[sprache] ?? e.aktion}</td>
                  <td>{e.zusammenfassung}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Karte>
    </div>
  )
}
