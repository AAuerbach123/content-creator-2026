// Ein-Tab-Wächter (Regel 4). Verhindert stille IndexedDB-Konflikte, wenn das
// Tool zweimal im selben Browser offen ist. BroadcastChannel funktioniert
// zwischen Tabs desselben Origins ohne SharedWorker.

const CHANNEL_NAME = 'content-creator-2026:tabguard'

type Nachricht = { typ: 'ping' | 'pong'; absender: string }

export type TabGuardCallback = (fremderTabOffen: boolean) => void

export function tabGuardStarten(callback: TabGuardCallback): () => void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return () => {}
  }

  const eigenerId = crypto.randomUUID()
  const kanal = new BroadcastChannel(CHANNEL_NAME)
  let fremderTabGesehen = false

  const senden = (typ: Nachricht['typ']) =>
    kanal.postMessage({ typ, absender: eigenerId } satisfies Nachricht)

  kanal.onmessage = (event: MessageEvent<Nachricht>) => {
    const data = event.data
    if (!data || data.absender === eigenerId) return
    if (data.typ === 'ping') senden('pong')
    if (!fremderTabGesehen) {
      fremderTabGesehen = true
      callback(true)
    }
  }

  senden('ping')

  return () => kanal.close()
}
