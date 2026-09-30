// Kleine Helfer, um Eingaben an den API-Routen zu begrenzen (Regel: Grenzen für
// Uploads + Textlängen — LOOP-PRUEFUNG 3.2). Ohne Limits kann eine kaputte
// oder böswillige Anfrage die KI-Aufrufe, den KV-Speicher oder die
// Render-Pipeline unnötig belasten.
//
// Werte sind großzügig; sie sollen offensichtliche Ausrutscher (10 GB Upload)
// abfangen, ohne echte Anwendungsfälle zu behindern.

export const LIMITS = {
  // Freitext-Prompts / Nutzerbriefing / Chat-Nachrichten
  textKurz: 2_000, // z. B. SFX-Prompt
  textMittel: 20_000, // z. B. Sprechtext, Briefing, Editor-Befehl
  textLang: 50_000, // Chat-Verlauf im Body (mehrere Nachrichten)
  // Uploads (Base64 nach Prüfung → Byte-Grösse ≈ base64.length * 3/4)
  base64Bild: 12 * 1024 * 1024, // ≈ 9 MB Rohdaten für Vorlagen-Analyse
  base64Asset: 30 * 1024 * 1024, // Einzel-Asset (Artefakt-Snapshot, Video-Asset)
  base64Gesamt: 250 * 1024 * 1024, // Summe aller Assets (Render-Video)
  freigabeGesamt: 40 * 1024 * 1024, // JSON-Grösse Freigabe (Artefakt + Assets)
} as const

export function begrenzeText(feld: string, wert: unknown, max: number):
  | { ok: true; wert: string }
  | { ok: false; nachricht: string; status: number } {
  if (typeof wert !== 'string') return { ok: false, nachricht: `Feld „${feld}" muss ein String sein.`, status: 400 }
  if (wert.length === 0) return { ok: false, nachricht: `Feld „${feld}" ist leer.`, status: 400 }
  if (wert.length > max) return { ok: false, nachricht: `Feld „${feld}" ist zu lang (${wert.length}, max ${max}).`, status: 413 }
  return { ok: true, wert }
}

export function begrenzeBase64(feld: string, wert: unknown, max: number):
  | { ok: true; wert: string }
  | { ok: false; nachricht: string; status: number } {
  if (typeof wert !== 'string') return { ok: false, nachricht: `Feld „${feld}" muss Base64-String sein.`, status: 400 }
  if (wert.length === 0) return { ok: false, nachricht: `Feld „${feld}" ist leer.`, status: 400 }
  // Base64 umfasst ca. 4/3 der Byte-Grösse — Vergleich direkt auf Zeichenlänge ist zulässig.
  const groesseBytes = Math.ceil(wert.length * 3 / 4)
  if (groesseBytes > max) {
    return {
      ok: false,
      nachricht: `Feld „${feld}" ist zu gross (${Math.round(groesseBytes / 1024 / 1024)} MB, max ${Math.round(max / 1024 / 1024)} MB).`,
      status: 413,
    }
  }
  return { ok: true, wert }
}

export function begrenzeJsonGroesse(text: string, max: number):
  | { ok: true }
  | { ok: false; nachricht: string; status: number } {
  if (text.length > max) {
    return {
      ok: false,
      nachricht: `Anfrage zu gross (${Math.round(text.length / 1024 / 1024)} MB, max ${Math.round(max / 1024 / 1024)} MB).`,
      status: 413,
    }
  }
  return { ok: true }
}

export const ERLAUBTE_BILD_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
])
