'use client'

// Team & Rollen (nur Admin): wer darf was im Cockpit. Anmeldung selbst regelt Cloudflare Access.
import { useEffect, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import Karte from '@/components/cockpit/Karte'
import Hinweis from '@/components/cockpit/Hinweis'
import { ROLLEN_TEXT, useIch } from '@/components/cockpit/IchKontext'
import { browserDatenHochladen, dokLaden, dokListe, dokSpeichern } from '@/lib/cockpit/daten-client'
import { STANDARD_EINWILLIGUNG } from '@/lib/cockpit/typen'

type Rolle = 'admin' | 'redaktion' | 'grafik' | 'pruefer' | 'lesen'
type BenutzerEintrag = { email: string; name?: string; rolle: Rolle; aktiv: boolean }

const ROLLEN: Rolle[] = ['admin', 'redaktion', 'grafik', 'pruefer', 'lesen']
const ROLLEN_ERKLAERUNG: Record<Rolle, { de: string; en: string }> = {
  admin: { de: 'alles, inkl. Team, Kundenlinks, monday', en: 'everything incl. team, client links, monday' },
  redaktion: { de: 'Rätsel, Gewinner, Texte, Freigabe', en: 'puzzles, winners, texts, approval' },
  grafik: { de: 'Vorlagen, Gestaltung, Inhalte', en: 'templates, design, content' },
  pruefer: { de: 'prüfen und freigeben', en: 'check and approve' },
  lesen: { de: 'nur ansehen', en: 'view only' },
}

export default function TeamSeite() {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const t = (d: string, e: string) => (de ? d : e)
  const { ich, darf } = useIch()
  const [liste, setListe] = useState<BenutzerEintrag[]>([])
  const [neu, setNeu] = useState<BenutzerEintrag>({ email: '', name: '', rolle: 'redaktion', aktiv: true })
  const [meldung, setMeldung] = useState<string | null>(null)
  const [uebernahme, setUebernahme] = useState<string | null>(null)
  const [einwilligung, setEinwilligung] = useState('')
  const [einst, setEinst] = useState<{ mailAn?: string }>({})
  useEffect(() => {
    dokLaden<{ text: string }>('einstellung', 'einwilligungstext').then((d) => setEinwilligung(d?.text ?? STANDARD_EINWILLIGUNG)).catch(() => setEinwilligung(STANDARD_EINWILLIGUNG))
    dokLaden<{ mailAn?: string }>('einstellung', 'benachrichtigung').then((d) => setEinst(d ?? {})).catch(() => undefined)
  }, [])

  const laden = () => dokListe<BenutzerEintrag>('benutzer').then((l) => setListe(l.sort((a, b) => a.email.localeCompare(b.email)))).catch(() => undefined)
  useEffect(() => { void laden() }, [])

  if (ich && !darf('admin')) return <Hinweis rolle="alert">{t('Diese Seite ist nur für Admins.', 'This page is for admins only.')}</Hinweis>

  const speichern = async (b: BenutzerEintrag) => {
    const email = b.email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setMeldung(t('Bitte eine gültige E-Mail-Adresse eingeben.', 'Please enter a valid email address.')); return }
    await dokSpeichern('benutzer', email, { ...b, email })
    setMeldung(t(`${email} gespeichert.`, `${email} saved.`))
    await laden()
  }

  const hochladen = async () => {
    setUebernahme(t('Übertrage …', 'Uploading …'))
    try {
      const z = await browserDatenHochladen((x) => setUebernahme(x))
      setUebernahme(t(
        `Fertig: ${z.kampagnen} Kampagnen, ${z.spieltage} Spieltage, ${z.gewinner} Gewinner, ${z.vorlagen} Vorlagen, ${z.fotos} Fotos übertragen.`,
        `Done: ${z.kampagnen} campaigns, ${z.spieltage} game days, ${z.gewinner} winners, ${z.vorlagen} templates, ${z.fotos} photos.`,
      ))
      try { window.localStorage.setItem('cockpit:uebernahme-erledigt', String(Date.now())) } catch { /* egal */ }
    } catch (e) {
      setUebernahme(t('Fehler: ', 'Error: ') + (e instanceof Error ? e.message : String(e)))
    }
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div>
        <h2 style={{ margin: '0 0 6px', fontSize: 24 }}>{t('Team & Rollen', 'Team & roles')}</h2>
        <p style={{ margin: 0, color: 'var(--tm-grau)', maxWidth: 760 }}>
          {t(
            'Wer sich anmelden darf, legt Cloudflare Access fest (E-Mail + Einmal-Code). Hier bestimmst du, was jede Person im Cockpit tun darf. Personen ohne Eintrag erhalten automatisch die Rolle „Redaktion“.',
            'Cloudflare Access decides who can sign in (email + one-time code). Here you decide what each person may do. People without an entry get the role “Editorial”.',
          )}
        </p>
      </div>

      {ich && (
        <Hinweis art="gold">
          {ich.benutzer.modus === 'access'
            ? t(`Anmeldung über Cloudflare Access aktiv. Du bist angemeldet als ${ich.benutzer.email}.`, `Cloudflare Access sign-in active. You are signed in as ${ich.benutzer.email}.`)
            : ich.benutzer.modus === 'lokal'
              ? t('Lokaler Modus (Mac): keine Anmeldung, alle Rechte. Online regelt Cloudflare Access den Zugang.', 'Local mode (Mac): no sign-in, all rights.')
              : t('Gemeinsames Passwort aktiv: Das Protokoll kann Personen nicht unterscheiden. Empfehlung: Cloudflare Access einrichten.', 'Shared password active: the log cannot distinguish people.')}
          {' '}
          {t('Speicher: ', 'Storage: ')}
          {ich.speicher === 'd1' ? t('zentral (Cloudflare)', 'central (Cloudflare)') : ich.speicher === 'datei' ? t('lokal auf diesem Mac', 'local on this Mac') : t('nicht eingerichtet', 'not set up')}
        </Hinweis>
      )}

      <Karte titel={t('Personen', 'People')}>
        <div style={{ overflowX: 'auto' }}>
          <table className="cockpit-tabelle">
            <thead>
              <tr><th>{t('E-Mail', 'Email')}</th><th>{t('Name', 'Name')}</th><th>{t('Rolle', 'Role')}</th><th>{t('Aktiv', 'Active')}</th></tr>
            </thead>
            <tbody>
              {liste.length === 0 && (
                <tr><td colSpan={4} className="leise">{t('Noch keine Einträge – alle Angemeldeten sind „Redaktion“, Admins aus COCKPIT_ADMINS.', 'No entries yet.')}</td></tr>
              )}
              {liste.map((b) => (
                <tr key={b.email} className={b.aktiv ? '' : 'aus'}>
                  <td>{b.email}</td>
                  <td>{b.name || '—'}</td>
                  <td>
                    <select aria-label={t(`Rolle von ${b.email}`, `Role of ${b.email}`)} value={b.rolle} onChange={(e) => void speichern({ ...b, rolle: e.target.value as Rolle })}>
                      {ROLLEN.map((r) => <option key={r} value={r}>{ROLLEN_TEXT[r][sprache]}</option>)}
                    </select>
                  </td>
                  <td>
                    <input type="checkbox" checked={b.aktiv} aria-label={t(`${b.email} aktiv`, `${b.email} active`)} onChange={(e) => void speichern({ ...b, aktiv: e.target.checked })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 style={{ margin: '18px 0 8px', fontSize: 15 }}>{t('Person hinzufügen', 'Add person')}</h3>
        <div className="cockpit-spalten">
          <div className="cockpit-feld">
            <label htmlFor="tn-email">{t('E-Mail', 'Email')}</label>
            <input id="tn-email" type="email" value={neu.email} onChange={(e) => setNeu({ ...neu, email: e.target.value })} />
          </div>
          <div className="cockpit-feld">
            <label htmlFor="tn-name">{t('Name', 'Name')}</label>
            <input id="tn-name" value={neu.name} onChange={(e) => setNeu({ ...neu, name: e.target.value })} />
          </div>
          <div className="cockpit-feld">
            <label htmlFor="tn-rolle">{t('Rolle', 'Role')}</label>
            <select id="tn-rolle" value={neu.rolle} onChange={(e) => setNeu({ ...neu, rolle: e.target.value as Rolle })}>
              {ROLLEN.map((r) => <option key={r} value={r}>{ROLLEN_TEXT[r][sprache]} – {ROLLEN_ERKLAERUNG[r][sprache]}</option>)}
            </select>
          </div>
        </div>
        <button type="button" className="cockpit-knopf primaer" disabled={!neu.email.trim()} onClick={async () => { await speichern(neu); setNeu({ email: '', name: '', rolle: 'redaktion', aktiv: true }) }}>
          {t('Hinzufügen', 'Add')}
        </button>
        <p style={{ marginTop: 10, fontSize: 13 }}>
          {t('Wichtig: Die Person muss zusätzlich bei Cloudflare Access erlaubt sein (oder ihr erlaubt dort die ganze Firmen-Domain).', 'Important: the person must also be allowed in Cloudflare Access.')}
        </p>
        {meldung && <Hinweis art="gold">{meldung}</Hinweis>}
      </Karte>

      <Karte titel={t('Einwilligungstext für den Foto-Link', 'Consent text for the photo link')}
        hinweis={t('Diesen Satz bestätigt der Gewinner beim Hochladen seines Fotos. Bitte vor dem ersten Einsatz von Telemedia rechtlich prüfen lassen.', 'Winners confirm this sentence when uploading their photo. Have it legally checked before first use.')}>
        <div className="cockpit-feld">
          <label htmlFor="tm-einw">{t('Text', 'Text')}</label>
          <textarea id="tm-einw" rows={3} value={einwilligung} onChange={(e) => setEinwilligung(e.target.value)} />
        </div>
        <button type="button" className="cockpit-knopf sekundaer" onClick={async () => { await dokSpeichern('einstellung', 'einwilligungstext', { text: einwilligung.trim() || STANDARD_EINWILLIGUNG }); setMeldung(t('Einwilligungstext gespeichert.', 'Saved.')) }}>{t('Speichern', 'Save')}</button>
      </Karte>

      <Karte titel={t('Benachrichtigungen', 'Notifications')}
        hinweis={t('Wer soll eine E-Mail bekommen, wenn ein Verlag eine Korrektur meldet oder ein Gewinnerfoto eingeht? E-Mails gehen erst raus, wenn der Versand eingerichtet ist (siehe Anleitung). Im Cockpit erscheinen die Meldungen immer.', 'Who gets an email when a publisher reports a correction or a winner photo arrives?')}>
        <div className="cockpit-feld">
          <label htmlFor="tm-mail">{t('E-Mail-Adressen Telemedia (Komma-getrennt)', 'Telemedia email addresses (comma-separated)')}</label>
          <input id="tm-mail" value={einst.mailAn ?? ''} onChange={(e) => setEinst({ ...einst, mailAn: e.target.value })} />
        </div>
        <p style={{ fontSize: 13 }}>{t('Microsoft Teams: Der Webhook wird als Secret TEAMS_WEBHOOK_URL hinterlegt (wie ein Passwort, nicht hier).', 'Microsoft Teams: webhook is stored as secret TEAMS_WEBHOOK_URL.')}</p>
        <button type="button" className="cockpit-knopf sekundaer" onClick={async () => { await dokSpeichern('einstellung', 'benachrichtigung', einst); setMeldung(t('Benachrichtigungen gespeichert.', 'Saved.')) }}>{t('Speichern', 'Save')}</button>
      </Karte>

      <Karte titel={t('Daten aus diesem Browser übernehmen', 'Upload data from this browser')}
        hinweis={t(
          'Früher speicherte das Cockpit nur im Browser. Wer dort schon Kampagnen, Gewinner oder Vorlagen angelegt hat, überträgt sie hier einmalig auf den zentralen Speicher. Bereits vorhandene Einträge mit gleicher ID werden überschrieben.',
          'Previously the cockpit only stored data in the browser. Upload it once to the central storage here.',
        )}>
        <button type="button" className="cockpit-knopf sekundaer" onClick={hochladen}>{t('Jetzt übertragen', 'Upload now')}</button>
        {uebernahme && <p role="status" style={{ marginTop: 10 }}>{uebernahme}</p>}
      </Karte>
    </div>
  )
}
