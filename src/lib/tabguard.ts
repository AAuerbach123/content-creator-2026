// Ein-Tab-Wächter (Regel 4). Verhindert stille IndexedDB-Konflikte, wenn das
// Tool zweimal im selben Browser offen ist. BroadcastChannel funktioniert
// zwischen Tabs desselben Origins ohne SharedWorker.
//
// Änderung Prüf-Loop: Die Warnung fällt wieder weg, wenn kein anderer Tab
// mehr antwortet (Heartbeat + Timeout). Vorher blieb die Warnung stehen,
// obwohl der zweite Tab bereits geschlossen war.

const CHANNEL_NAME = 'content-creator-2026:tabguard'
const PING_INTERVALL_MS = 2000
const TIMEOUT_MS = PING_INTERVALL_MS * 2 + 500 // gnädig, ein Aussetzer erlaubt

type Nachricht = { typ: 'ping' | 'pong' | 'tschuess'; absender: string }

export type TabGuardCallback = (fremderTabOffen: boolean) => void

export function tabGuardStarten(callback: TabGuardCallback): () => void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return () => {}
  }

  const eigenerId = crypto.randomUUID()
  const kanal = new BroadcastChannel(CHANNEL_NAME)
  const zuletztGesehen = new Map<string, number>()
  let aktuell = false

  const zustandAktualisieren = () => {
    const jetzt = Date.now()
    for (const [id, ts] of zuletztGesehen) {
      if (jetzt - ts > TIMEOUT_MS) zuletztGesehen.delete(id)
    }
    const neu = zuletztGesehen.size > 0
    if (neu !== aktuell) {
      aktuell = neu
      callback(neu)
    }
  }

  const senden = (typ: Nachricht['typ']) =>
    kanal.postMessage({ typ, absender: eigenerId } satisfies Nachricht)

  kanal.onmessage = (event: MessageEvent<Nachricht>) => {
    const data = event.data
    if (!data || data.absender === eigenerId) return
    if (data.typ === 'tschuess') {
      zuletztGesehen.delete(data.absender)
    } else {
      zuletztGesehen.set(data.absender, Date.now())
      if (data.typ === 'ping') senden('pong')
    }
    zustandAktualisieren()
  }

  senden('ping')
  const intervall = setInterval(() => {
    senden('ping')
    zustandAktualisieren()
  }, PING_INTERVALL_MS)

  const beforeUnload = () => senden('tschuess')
  window.addEventListener('beforeunload', beforeUnload)
  window.addEventListener('pagehide', beforeUnload)

  return () => {
    senden('tschuess')
    clearInterval(intervall)
    window.removeEventListener('beforeunload', beforeUnload)
    window.removeEventListener('pagehide', beforeUnload)
    kanal.close()
  }
}
