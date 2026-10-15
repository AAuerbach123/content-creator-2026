'use client'

// Auszahlungen (Vorschlag 6): alle Gewinner mit Auszahlungs-Status, Alter in Tagen, Summen, CSV für die Buchhaltung.
// Bewusst ohne Bankdaten – die bleiben ausserhalb des Cockpits.

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import Karte from '@/components/cockpit/Karte'
import { kampagnenMitTagen, spielName, type KampagneMitTagen } from '@/components/cockpit/HeuteZuTun'
import { spieltagSpeichern } from '@/lib/cockpit/daten-client'
import { AUSZAHLUNG_TEXT, type Auszahlung } from '@/lib/cockpit/typen'

type Zeile = { kampagneId: string; spielId: string; tagId: string; nr: number; datum: string; gewinnerId: string; name: string; ort: string; betrag: number; zeitung: string; status: Auszahlung; tage: number }

export default function AuszahlungenSeite() {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const [daten, setDaten] = useState<KampagneMitTagen[] | null>(null)
  const [nurOffen, setNurOffen] = useState(true)
  const [suche, setSuche] = useState('')

  useEffect(() => { kampagnenMitTagen().then(setDaten).catch(() => setDaten([])) }, [])

  const zeilen = useMemo<Zeile[]>(() => {
    const heute = Date.now()
    const out: Zeile[] = []
    for (const { kampagne, spieltage } of daten ?? []) for (const s of spieltage) for (const g of s.gewinner ?? []) {
      if (!g.name.trim()) continue
      out.push({ kampagneId: kampagne.id, spielId: kampagne.spielId, tagId: s.id, nr: s.nr, datum: s.datum, gewinnerId: g.id, name: g.name, ort: g.ort, betrag: g.betrag, zeitung: g.verlagTitel ?? '', status: g.auszahlung ?? 'daten-fehlen', tage: Math.max(0, Math.floor((heute - new Date(s.datum + 'T12:00:00').getTime()) / 86400000)) })
    }
    return out.sort((a, b) => b.tage - a.tage)
  }, [daten])

  const sichtbar = zeilen.filter((z) => (!nurOffen || !['ueberwiesen', 'keine-ueberweisung'].includes(z.status)) && (!suche || `${z.name} ${z.ort} ${z.zeitung}`.toLowerCase().includes(suche.toLowerCase())))
  const summe = (f: (z: Zeile) => boolean) => zeilen.filter(f).reduce((a, z) => a + z.betrag, 0)
  const eur = (n: number) => n.toLocaleString('de-DE') + ' €'

  const statusSetzen = async (z: Zeile, st: Auszahlung) => {
    const kd = daten?.find((d) => d.kampagne.id === z.kampagneId)
    const s = kd?.spieltage.find((x) => x.id === z.tagId)
    if (!kd || !s) return
    const neu = { ...s, gewinner: s.gewinner.map((g) => (g.id === z.gewinnerId ? { ...g, auszahlung: st } : g)), aktualisiertAm: Date.now() }
    setDaten((alt) => alt?.map((d) => (d.kampagne.id === kd.kampagne.id ? { ...d, spieltage: d.spieltage.map((x) => (x.id === s.id ? neu : x)) } : d)) ?? null)
    await spieltagSpeichern(neu)
  }

  const csv = () => {
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const kopf = ['Spiel', 'Spieltag', 'Datum', 'Name', 'Ort', 'Betrag (EUR)', 'Zeitung', 'Auszahlung', 'Tage seit Spieltag'].join(';')
    const z = sichtbar.map((x) => [spielName(x.spielId), x.nr, x.datum, x.name, x.ort, x.betrag, x.zeitung, AUSZAHLUNG_TEXT[x.status].de, x.tage].map(q).join(';'))
    const blob = new Blob(['﻿' + [kopf, ...z].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `Gewinnauszahlungen_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div>
        <h2 style={{ margin: '0 0 6px', fontSize: 24 }}>{de ? 'Gewinnauszahlungen' : 'Prize payouts'}</h2>
        <p style={{ margin: 0, color: 'var(--tm-grau)' }}>{de ? 'Status je Gewinner – ohne Bankdaten. Wird mit monday („Gewinnauszahlung“) abgeglichen.' : 'Status per winner – no bank data.'}</p>
      </div>
      <div className="cockpit-kacheln">
        <div className="cockpit-karte"><b>{eur(summe(() => true))}</b><p>{de ? 'Gewinne gesamt' : 'Total prizes'} ({zeilen.length})</p></div>
        <div className="cockpit-karte"><b>{eur(summe((z) => z.status === 'ueberwiesen'))}</b><p>{de ? 'überwiesen' : 'transferred'}</p></div>
        <div className="cockpit-karte"><b>{eur(summe((z) => !['ueberwiesen', 'keine-ueberweisung'].includes(z.status)))}</b><p>{de ? 'noch offen' : 'open'}</p></div>
        <div className="cockpit-karte"><b>{zeilen.filter((z) => z.status === 'daten-fehlen' && z.tage > 7).length}</b><p>{de ? 'länger als 7 Tage „Daten fehlen“' : 'data missing > 7 days'}</p></div>
      </div>
      <Karte aktion={<button type="button" className="cockpit-knopf sekundaer" onClick={csv}>{de ? 'CSV für die Buchhaltung' : 'CSV for accounting'}</button>}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'end', marginBottom: 10 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}><input type="checkbox" checked={nurOffen} onChange={(e) => setNurOffen(e.target.checked)} />{de ? 'Nur offene' : 'Open only'}</label>
          <div className="cockpit-feld" style={{ marginBottom: 0, minWidth: 240 }}>
            <label htmlFor="az-suche">{de ? 'Suche (Name, Ort, Zeitung)' : 'Search'}</label>
            <input id="az-suche" value={suche} onChange={(e) => setSuche(e.target.value)} />
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="cockpit-tabelle">
            <thead><tr><th>{de ? 'Spieltag' : 'Day'}</th><th>{de ? 'Name' : 'Name'}</th><th>{de ? 'Ort' : 'Town'}</th><th>{de ? 'Betrag' : 'Amount'}</th><th>{de ? 'Zeitung' : 'Newspaper'}</th><th>{de ? 'Seit' : 'Age'}</th><th>{de ? 'Auszahlung' : 'Payout'}</th></tr></thead>
            <tbody>
              {!daten && <tr><td colSpan={7}>{de ? 'Lade …' : 'Loading …'}</td></tr>}
              {daten && sichtbar.length === 0 && <tr><td colSpan={7} className="leise">{de ? 'Keine Einträge.' : 'No entries.'}</td></tr>}
              {sichtbar.map((z) => (
                <tr key={z.gewinnerId} className={z.status === 'daten-fehlen' && z.tage > 7 ? 'offen' : ''}>
                  <td><Link href={`/cockpit/${z.spielId}?tag=${encodeURIComponent(z.tagId)}&phase=3`}>{spielName(z.spielId)} {z.nr}</Link><div className="leise" style={{ fontSize: 12 }}>{z.datum}</div></td>
                  <td>{z.name}</td>
                  <td>{z.ort}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{eur(z.betrag)}</td>
                  <td>{z.zeitung || <span className="leise">—</span>}</td>
                  <td className="leise">{z.tage} {de ? 'Tg.' : 'd'}</td>
                  <td>
                    <select aria-label={de ? `Auszahlung ${z.name}` : `Payout ${z.name}`} value={z.status} onChange={(e) => void statusSetzen(z, e.target.value as Auszahlung)}>
                      {(Object.keys(AUSZAHLUNG_TEXT) as Auszahlung[]).map((k) => <option key={k} value={k}>{AUSZAHLUNG_TEXT[k][sprache]}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Karte>
    </div>
  )
}
