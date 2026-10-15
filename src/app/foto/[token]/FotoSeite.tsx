'use client'

// Öffentliche Seite für Gewinner: Foto hochladen + Einwilligung bestätigen (handyfreundlich).
import { useEffect, useState } from 'react'

export default function FotoSeite({ token }: { token: string }) {
  const [info, setInfo] = useState<{ vorname: string; datum: string; einwilligungstext: string; eingegangen: boolean } | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [datei, setDatei] = useState<File | null>(null)
  const [vorschau, setVorschau] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [sendet, setSendet] = useState(false)
  const [fertig, setFertig] = useState(false)

  useEffect(() => {
    fetch('/api/foto?t=' + encodeURIComponent(token), { cache: 'no-store' })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.fehler); setInfo(j) })
      .catch((e) => setFehler(e instanceof Error ? e.message : String(e)))
  }, [token])
  useEffect(() => {
    if (!datei) { setVorschau(null); return }
    const u = URL.createObjectURL(datei)
    setVorschau(u)
    return () => URL.revokeObjectURL(u)
  }, [datei])

  const senden = async () => {
    if (!datei || !ok) return
    setSendet(true); setFehler(null)
    const fd = new FormData()
    fd.append('t', token); fd.append('einwilligung', '1'); fd.append('foto', datei)
    try {
      const r = await fetch('/api/foto', { method: 'POST', body: fd })
      const j = await r.json()
      if (!r.ok) throw new Error(j.fehler)
      setFertig(true)
    } catch (e) { setFehler(e instanceof Error ? e.message : String(e)) } finally { setSendet(false) }
  }

  return (
    <main className="portal">
      <header className="portal-kopf"><img src="/telemedia-logo.png" alt="Telemedia" /><span>Ihr Gewinnerfoto</span></header>
      <section className="portal-karte" style={{ maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
        {fehler && !info && <><h1>Link nicht gültig</h1><p>{fehler}</p></>}
        {info && !fertig && (
          <>
            <h1>Herzlichen Glückwunsch{info.vorname ? `, ${info.vorname}` : ''}!</h1>
            <p className="portal-leise">Für die Gewinneranzeige brauchen wir ein Foto von Ihnen. Am besten ein Porträt mit gut sichtbarem Gesicht, ohne andere Personen.</p>
            {info.eingegangen && <p className="portal-meldung">Wir haben bereits ein Foto von Ihnen. Sie können es hier ersetzen.</p>}
            <div className="portal-feld">
              <label htmlFor="foto-datei">Foto auswählen oder aufnehmen</label>
              <input id="foto-datei" type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={(e) => setDatei(e.target.files?.[0] ?? null)} />
            </div>
            {vorschau && <img src={vorschau} alt="Ihr ausgewähltes Foto" style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: '50%', border: '4px solid #E8B64A', display: 'block', margin: '8px auto' }} />}
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', margin: '12px 0', fontSize: 15 }}>
              <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} style={{ width: 22, height: 22, marginTop: 2 }} />
              <span>{info.einwilligungstext}</span>
            </label>
            <div className="portal-knoepfe">
              <button type="button" className="primaer" disabled={!datei || !ok || sendet} onClick={senden}>{sendet ? 'Wird gesendet …' : 'Foto senden'}</button>
            </div>
            {fehler && <p role="alert" className="portal-meldung">{fehler}</p>}
          </>
        )}
        {fertig && <><h1>Vielen Dank!</h1><p>Ihr Foto ist bei uns angekommen. Sie können diese Seite jetzt schliessen.</p></>}
      </section>
      <footer className="portal-fuss">Telemedia Interactive</footer>
    </main>
  )
}
