// Druckfertiges PDF aus Anzeigen-HTML (gemeinsam für Cockpit und Kundenportal).
// Online: Cloudflare Browser Rendering (REST, CF_ACCOUNT_ID + CF_BROWSER_TOKEN). Lokal (Mac): Chrome via puppeteer-core des Ad-Creators.

const W = 1575
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

export async function pdfAusHtml(htmlRoh: string, wmm: number, hmm: number, origin: string): Promise<ArrayBuffer> {
  const H = Math.round((W * hmm) / wmm)
  const html = htmlRoh.replace('<head>', `<head><base href="${origin}/">`)
  const pdfOpt = { width: `${wmm}mm`, height: `${hmm}mm`, scale: (wmm * 96) / 25.4 / W, printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' }, pageRanges: '1' }
  const konto = process.env.CF_ACCOUNT_ID
  const schluessel = process.env.CF_BROWSER_TOKEN
  if (konto && schluessel) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${konto}/browser-rendering/pdf`, {
      method: 'POST',
      headers: { authorization: `Bearer ${schluessel}`, 'content-type': 'application/json' },
      body: JSON.stringify({ html, viewport: { width: W, height: H, deviceScaleFactor: 1 }, gotoOptions: { waitUntil: 'networkidle0', timeout: 30000 }, pdfOptions: pdfOpt }),
    })
    if (!r.ok) throw new Error(`PDF-Dienst: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`)
    return r.arrayBuffer()
  }
  const imWorker = typeof navigator !== 'undefined' && (navigator as { userAgent?: string }).userAgent === 'Cloudflare-Workers'
  if (imWorker) throw new Error('PDF-Erzeugung online noch nicht eingerichtet (CF_ACCOUNT_ID + CF_BROWSER_TOKEN fehlen).')
  const browser = await lokalerBrowser()
  const page = await browser.newPage()
  try {
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 })
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 })
    await page.waitForFunction('window.__pruefung', { timeout: 20000 }).catch(() => undefined)
    const pdf = await page.pdf(pdfOpt)
    return pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer
  } finally {
    await page.close().catch(() => undefined)
  }
}

type Seite = { setViewport: (v: Record<string, number>) => Promise<void>; setContent: (h: string, o: Record<string, unknown>) => Promise<void>; waitForFunction: (f: string, o: Record<string, number>) => Promise<unknown>; pdf: (o: Record<string, unknown>) => Promise<Uint8Array>; close: () => Promise<void> }
type Browser = { newPage: () => Promise<Seite>; close: () => Promise<void> }
let lokal: { browser: Promise<Browser>; timer?: ReturnType<typeof setTimeout> } | null = null

async function lokalerBrowser(): Promise<Browser> {
  if (!lokal) {
    const { createRequire } = await import('node:module')
    const os = await import('node:os')
    const path = await import('node:path')
    const req = createRequire(path.join(process.cwd(), 'package.json'))
    const puppeteer = req(path.join(os.homedir(), 'Desktop/wissensquiz/node_modules/puppeteer-core')) as { launch: (o: Record<string, unknown>) => Promise<Browser> }
    lokal = { browser: puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] }) }
    lokal.browser.catch(() => { lokal = null })
  }
  if (lokal.timer) clearTimeout(lokal.timer)
  const aktuell = lokal
  aktuell.timer = setTimeout(() => { void aktuell.browser.then((b) => b.close()).catch(() => undefined); if (lokal === aktuell) lokal = null }, 120_000)
  return aktuell.browser
}
