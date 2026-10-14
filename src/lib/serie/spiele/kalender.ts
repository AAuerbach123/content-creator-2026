// Spieltage eines Monats: Mo–Fr je ein Spieltag, Samstag + Sonntag zusammen ein Spieltag
// (wie Geldregen 2027 / Rätselspiele 2026). Feiertage werden NICHT herausgenommen (offener Punkt).

const WT = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
export const MONATE = ['', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

export type KalenderTag = { tag: number; datum: string; label: string; wochentag: number; mittwoch: boolean }

const pad = (n: number) => String(n).padStart(2, '0')

export function letzterTag(monat: string): number {
  const [j, m] = monat.split('-').map(Number)
  return new Date(Date.UTC(j, m, 0)).getUTCDate()
}

/** Spieltage im Zeitraum [von, bis] (Tag des Monats, inklusive). */
export function spieltage(monat: string, von = 1, bis?: number): KalenderTag[] {
  const [j, m] = monat.split('-').map(Number)
  const ende = bis ?? letzterTag(monat)
  const out: KalenderTag[] = []
  let d = von
  while (d <= ende) {
    const wt = new Date(Date.UTC(j, m - 1, d)).getUTCDay()
    const datum = `${j}-${pad(m)}-${pad(d)}`
    if (wt === 6 && d + 1 <= ende) {
      out.push({ tag: out.length + 1, datum, label: `Samstag/Sonntag, ${d}./${d + 1}. ${MONATE[m]}`, wochentag: 6, mittwoch: false })
      d += 2
      continue
    }
    out.push({ tag: out.length + 1, datum, label: `${WT[wt]}, ${d}. ${MONATE[m]}`, wochentag: wt, mittwoch: wt === 3 })
    d += 1
  }
  return out
}

export function istMittwoch(datum: string): boolean {
  const [j, m, d] = datum.split('-').map(Number)
  return new Date(Date.UTC(j, m - 1, d)).getUTCDay() === 3
}
