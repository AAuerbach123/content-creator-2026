// Teilnahmebedingungen für die Spiele des Katalogs.
//  • 'geldpakete' (Kreuz & Quer April = Spezial-Geldregen): Wortlaut Geldregen 2027 (freigegeben) + Zeitfenster-Satz,
//     Spielname ersetzt. Zeitfenster-Satz nach Wunsch von Andreas G. (06.10.2026, kq_b4.html).
//  • 'tagespreis' (Rätselspiele AZS, Auszahlungsspiele): Wortlaut „Kreuz und Quer“ 2025 (Nürnberger Vorlage) mit
//     Vorzählfaktor; Spielname/Zeitraum/Verlagsliste/Hotline/Datenschutz je Zeitung. → OFFENER PUNKT: Rechtsprüfung.
//  • 'jackpot' (Juli, Zeitschienen-Spiele): Wortlaut Geldregen 2027 je Verlag (ohne Vorzählfaktor!) mit Spielname,
//     Spielwoche als Aktionszeitraum und Jackpot-Fussnote. Regel Jenny/Yasmina 07.10.2026, Vorlage jul_postkarte.html.
// Nichts wird erfunden: fehlt ein Baustein (Hotline-Satz, Datenschutz), erscheint ein gelber Platzhalter.

import { fehlt, pad2, tnbText as geldregenTnb } from '../generator'
import type { SerienDaten, Zeitung } from '../types'
import { letzterTag } from './kalender'
import type { SpielDef } from './typen'

const JACKPOT_FUSSNOTE =
  '* Für jeden Tag wird vor Spielbeginn für den Jackpot ein Zeitfenster unterschiedlicher Länge festgelegt, das dann von einem Zufallsgenerator auf einen Zeitpunkt im Laufe des jeweiligen Tages gesetzt wird.'
const KQ_ZEITFENSTER_SATZ =
  'Vor Spielbeginn wurden für alle Gewinne Zeitfenster unterschiedlicher Länge festgelegt, die per Zufallsgenerator über den Spieltag verteilt werden.'

function verlagsliste(daten: SerienDaten, z: Zeitung): string {
  const R = daten.tnb_gruppen
  const reihenfolge = [z.tnb_gruppe, ...(R._reihenfolge as string[]).filter((k) => k !== z.tnb_gruppe)]
  return reihenfolge.map((k) => R[k] as string).join(', ')
}

export function zeitraumText(spiel: SpielDef, monat: string): string {
  if (spiel.zeitraum) {
    const { von, bis } = spiel.zeitraum(monat)
    return `vom ${von} bis ${bis}`
  }
  const [j, m] = monat.split('-').map(Number)
  return `vom 01.${pad2(m)}.${j} bis ${pad2(letzterTag(monat))}.${pad2(m)}.${j}`
}

/** Variante der Geldregen-TNB für Juli: Aktionszeitraum = Spielwoche statt Monatsbereich. */
function datenMitWochenZeitraum(daten: SerienDaten, spiel: SpielDef, monat: string): SerienDaten {
  if (!spiel.zeitraum) return daten
  const { von, bis } = spiel.zeitraum(monat)
  return {
    ...daten,
    aktionszeitraum: { ...(daten.aktionszeitraum ?? {}), [monat]: `vom ${von} bis ${bis}` },
  }
}

export function spielTnb(spiel: SpielDef, daten: SerienDaten, z: Zeitung, monat: string): string {
  if (spiel.mechanik.art === 'geldpakete') {
    // Kreuz & Quer April: Geldregen-Wortlaut + Zeitfenster-Satz nach dem Wochenende-Satz einfügen.
    const text = geldregenTnb(daten, z, monat).replace(
      'Das Gewinnspiel „Geldregen“',
      `Das Gewinnspiel „${spiel.name}“`,
    )
    return text.replace(
      'Wochenende: Samstag 00:00 Uhr bis Sonntag 23:59 Uhr.',
      `Wochenende: Samstag 00:00 Uhr bis Sonntag 23:59 Uhr. ${KQ_ZEITFENSTER_SATZ}`,
    )
  }
  if (spiel.mechanik.art === 'jackpot') {
    // Juli-Spiele (Zeitschienen): Geldregen-Wortlaut je Verlag, Spielwoche als Aktionszeitraum, kein Vorzählfaktor.
    // Jackpot-Fussnote wie in jul_postkarte.html am Ende.
    const text = geldregenTnb(datenMitWochenZeitraum(daten, spiel, monat), z, monat).replace(
      'Das Gewinnspiel „Geldregen“',
      `Das Gewinnspiel „${spiel.name}“`,
    )
    return text + ' ' + JACKPOT_FUSSNOTE
  }
  // Rätselspiele (Auszahlungsspiele, Mechanik 'tagespreis'): Vorzählfaktor-Text (Nürnberger Vorlage 2025).
  const hot = daten.hotline_texte[z.hotline] || fehlt('[Hotline-Satz folgt]')
  const ds = daten.datenschutz_texte[z.datenschutz] || fehlt('[Datenschutz-Hinweis folgt]')
  const ver = daten.veranstalter_texte[z.veranstalter ?? ''] ?? ''
  return (
    `<b>${hot}</b> ` +
    (ver ? ver + ' ' : '') +
    `Teilnahmeberechtigt sind Leserinnen und Leser der Tageszeitungen ${verlagsliste(daten, z)} (nachfolgend kurz als „Tageszeitungen“ bezeichnet). ` +
    'Personen unter 18 Jahren dürfen nicht teilnehmen. Der tägliche Teilnahmezeitraum geht von 00.00 Uhr am jeweiligen Erscheinungstag bis 23.59 Uhr am selben Tag, Wochenende: Samstag, 00.00 Uhr bis Sonntag, 23.59 Uhr. ' +
    'Die Gewinner werden täglich per Zufall aus allen ausgewählten Anrufern mit der richtigen Antwort ermittelt. Zur Bewältigung der eingehenden Teilnahmen werden entsprechende technische Mechanismen eingesetzt, z.B. ein an die Erwartungen hinsichtlich des Anrufvolumens angepasster Vorzählfaktor (= technischer Zufallsmechanismus). ' +
    'Alle Anrufer erhalten sofort eine Information darüber, ob sie von dem technischen Zufallsmechanismus ausgewählt wurden. Jene Anrufer, die von diesem technischen Zufallsmechanismus ausgewählt werden, können ihre Antwort unter Angabe von Telefonnummer, Name und Anschrift auf dem automatischen Anrufbeantworter hinterlassen. ' +
    'Der Gewinner wird am Folgetag bis 11.00 Uhr bezüglich Aufnahme der Bankverbindung und Übersendung eines Gewinnerfotos kontaktiert. Der Freitagsgewinner wird mit dem Wochenendgewinner am darauffolgenden Montag bis 11.00 Uhr angerufen. ' +
    'Der Gewinner stimmt durch seine Teilnahme der Veröffentlichung des redaktionellen Beitrags mit Vor- und Zunamen und eines Gewinnerfotos und Text in den Tageszeitungen zu und wird alle hierfür notwendigen Mitwirkungshandlungen erbringen, ansonsten verfällt der Gewinn. ' +
    'Der Gewinn wird so schnell wie möglich auf das angegebene Bankkonto überwiesen. Die angegebenen Daten werden zur Kontaktaufnahme im Gewinnfall verwendet. Eine Weitergabe an Dritte erfolgt nicht. ' +
    'Der Gewinner ist verpflichtet, am Tag der Gewinnbenachrichtigung bis spätestens 11 Uhr ein Foto von sich zu schicken, anderenfalls erlischt der Gewinnanspruch. Sollten wir Sie nicht erreichen können, wird direkt der nächste Gewinner ausgelost. ' +
    'Mitarbeiter der Tageszeitungen und der mit ihnen verbundenen Unternehmen sowie deren Angehörige sind von der Teilnahme ausgeschlossen. Ausgeschlossen sind auch Personen, die falsche Personenangaben machen, sich unlauterer Hilfsmittel bedienen oder sich anderweitig durch Manipulation Vorteile verschaffen. ' +
    `Das Gewinnspiel „${spiel.name}“ kann jederzeit ohne Angabe von Gründen beendet/abgebrochen werden. Der Rechtsweg ist ausgeschlossen. Aktionszeitraum ${zeitraumText(spiel, monat)}. ` +
    ds
  )
}
