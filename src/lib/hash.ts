// SHA-256 hex-Digest als Grundlage für die inhaltsadressierte Asset-Ablage (Regel 2).
// Gleicher Inhalt → gleicher Hash → einmalige Speicherung im assets-Store.

export async function sha256Hex(data: Blob | ArrayBuffer | Uint8Array): Promise<string> {
  let buffer: ArrayBuffer
  if (data instanceof Blob) {
    buffer = await data.arrayBuffer()
  } else if (data instanceof Uint8Array) {
    const slice = data.slice()
    buffer = slice.buffer as ArrayBuffer
  } else {
    buffer = data
  }
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
