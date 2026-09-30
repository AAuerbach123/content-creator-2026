// Dominante Farben aus einem Bild extrahieren — reines Canvas, keine externe Lib.
// Reduziert die Farben auf 4-Bit-je-Kanal und zählt Häufigkeiten.

export async function farbschemaAusBlob(blob: Blob, anzahl = 5): Promise<string[]> {
  const bild = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const b = new window.Image()
    b.onload = () => {
      URL.revokeObjectURL(url)
      resolve(b)
    }
    b.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Bild konnte nicht geladen werden'))
    }
    b.src = url
  })
  const canvas = document.createElement('canvas')
  const maxSeite = 200
  const skala = Math.min(1, maxSeite / Math.max(bild.width, bild.height))
  canvas.width = Math.max(1, Math.round(bild.width * skala))
  canvas.height = Math.max(1, Math.round(bild.height * skala))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('kein 2D-Kontext')
  ctx.drawImage(bild, 0, 0, canvas.width, canvas.height)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const zaehl: Record<string, number> = {}
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    // 4-Bit-Bucket je Kanal
    const r = (data[i] & 0xf0)
    const g = (data[i + 1] & 0xf0)
    const b = (data[i + 2] & 0xf0)
    const key = `${r}-${g}-${b}`
    zaehl[key] = (zaehl[key] || 0) + 1
  }
  const sortiert = Object.entries(zaehl)
    .sort((a, b) => b[1] - a[1])
    .slice(0, anzahl)
    .map(([k]) => {
      const [r, g, b] = k.split('-').map((n) => parseInt(n, 10) | 0x08)
      return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`
    })
  return sortiert
}
