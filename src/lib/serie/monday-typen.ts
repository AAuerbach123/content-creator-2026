// Gemeinsamer Typ für /api/monday (Server) und die Serien-Seite (Client).
export type MondaySpieltag = {
  /** Item-Name, z. B. "Spieltag 01" */
  name: string
  /** YYYY-MM-DD */
  datum: string
  frage: string
  a1: string
  a2: string
  /** z. B. "1 – Allerheiligen" */
  richtig: string
  dateiname: string
}

export type MondayAntwort = {
  ok: boolean
  fehler?: string
  board?: { id: string; name: string; art: string }
  zuordnung?: Record<string, { title: string; type: string }>
  ignoriert?: { title: string; type: string; grund: string }[]
  angelegt?: { name: string; id: string }[]
  fehlerListe?: { name: string; fehler: string }[]
  testmodus?: boolean
}
