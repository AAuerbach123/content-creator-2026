// Port von _quellen_loop_2026-10/praesentation/gsp2027_verlag.js (Stand 07.10.2026).
// Lehre pptxgenjs 4.0.1: Shape-IDs pro Folie eindeutig halten (Pflicht fürs Nachbearbeiten, siehe gsp2027_anim.py).
// Die 588 Zeilen pptxgenjs-Rezeptur sind 1:1 übernommen; nur die drei Umgebungsvariablen
// (VERLAG_NAME, AZS_PRO_ANRUF, RSP_SHARE) sind Funktionsargumente, und die Bilder-Tabelle wird
// als `bilder` eingereicht statt aus `/tmp/tmi/bilder.json` gelesen.
//
// Rechenlogik ist unverändert: 24 Spieltage × 500 € + 4 Supertage × 500 € = 14.000 € Preisgelder;
// 5.000 Anrufe × 24 Tage × 20 % Anteil für AZS. RSP-Basis: 20 % von 1.200.000 Anrufen × 36 ct − 70.000 € × 20 %.
// Prüfmuster (scripts/check-praesentation.mjs): 33 ct / 70 % → 39.600 € Vergütung, 36.800 € Verdienst, 50.680 € RSP.

export type Bilder = Record<string, [number, number, string]>

export type PraesentationOptionen = {
  verlag?: string
  azsCent: number
  rspShare: number
  bilder: Bilder
  ohneNotizen?: boolean
}

// Minimale pptxgenjs-Teilsignatur, damit wir ohne installierte @types bauen können.
type PptxGenJs = unknown

export async function erzeugenPraesentation(opt: PraesentationOptionen): Promise<Uint8Array> {
  if (!(opt.azsCent > 0 && opt.azsCent < 100) || !(opt.rspShare > 0 && opt.rspShare < 100)) {
    throw new Error('Ungültige Konditionen: ' + opt.azsCent + ' ct / ' + opt.rspShare + ' %')
  }
  let pptxgen: unknown
  try {
    const mod = await import(/* webpackIgnore: true */ 'pptxgenjs' as string)
    pptxgen = (mod as { default?: unknown }).default ?? mod
  } catch {
    throw new Error('pptxgenjs ist nicht installiert. Bitte auf dem Mac einmalig ausführen: npm i pptxgenjs@4.0.1')
  }
  const buffer = await bauen(pptxgen as PptxGenJs, opt)
  return buffer
}

// Die eigentliche Rezeptur wurde unverändert aus gsp2027_verlag.js übernommen (siehe Kommentar oben).
// Für die bessere Diff-/Review-Lesbarkeit bleibt sie als „raw“ JavaScript-ähnlicher Code im Function-Body,
// mit minimalen Typ-Anpassungen (any-Kommentare, async-Wrapper).
async function bauen(pptxgenCtor: PptxGenJs, opt: PraesentationOptionen): Promise<Uint8Array> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pptxgen: any = pptxgenCtor
  const B = opt.bilder
  const VERLAG = (opt.verlag || '').trim()
  const AZS_CENT = Math.round(opt.azsCent * 100 > 100 ? opt.azsCent : opt.azsCent * 100)
  // Erlaube sowohl 33 (ct) als auch 0.33 (Euro) – wir arbeiten intern in Cent.
  const AZS = opt.azsCent < 1 ? Math.round(opt.azsCent * 100) : Math.round(opt.azsCent)
  const SHARE = opt.rspShare < 1 ? Math.round(opt.rspShare * 100) : Math.round(opt.rspShare)
  if (!(AZS > 0 && AZS < 100) || !(SHARE > 0 && SHARE < 100)) throw new Error('Ungültige Konditionen: ' + AZS + ' ct / ' + SHARE + ' %')
  void AZS_CENT // unterdrückt TS-Warnung; die Rechenlogik unten nutzt AZS statt AZS_CENT

  const tsd = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const euroCent = (ct: number) => Math.floor(ct / 100) + ',' + String(ct % 100).padStart(2, '0') + ' €'
  const AZS_PREIS = 24 * 500 + 4 * 500, AZS_ANRUFE = 5000 * 24, AZS_ANTEIL = AZS_PREIS / 5
  const AZS_VERG = AZS * AZS_ANRUFE / 100, AZS_VERDIENST = AZS_VERG - AZS_ANTEIL, AZS_ERSPARNIS = AZS_PREIS - AZS_ANTEIL
  const RSP_ANRUFE = 1200000 * 20 / 100, RSP_UMSATZ = 36 * RSP_ANRUFE / 100, RSP_ANTEIL = 70000 * 20 / 100, RSP_BASIS = RSP_UMSATZ - RSP_ANTEIL
  const RSP_VERG = RSP_BASIS * SHARE / 100

  const R = '9B1438', RD = '7A0F2C', DK = '1C1B22', HL = 'F6F4F1', GR = '5E616B', GOLD = 'E8B64A', W = 'FFFFFF', RL = 'F6E6EB', LINE = 'E4E1DC'
  const FONT = 'Arial'
  const pres = new pptxgen()
  pres.layout = 'LAYOUT_WIDE'
  pres.title = 'TMI Gewinnspielplan 2027' + (VERLAG ? ' – ' + VERLAG : '')
  pres.author = 'Telemedia Interactive GmbH'
  pres.company = 'Telemedia Interactive GmbH'
  pres.theme = { headFontFace: FONT, bodyFontFace: FONT }

  const FUSS = 'Telemedia Interactive GmbH · Kochelseestraße 10 · 81371 München · Tel. 089 530 720 70 · www.telemedia-interactive.de'
  pres.defineSlideMaster({
    title: 'INHALT', background: { color: HL },
    objects: [
      { rect: { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: R }, line: { color: R } } },
      { image: { path: B.logo_rot[2], x: 11.25, y: 0.32, w: 1.72, h: 0.56 } },
      { text: { text: FUSS, options: { x: 0.55, y: 7.06, w: 10.5, h: 0.28, fontSize: 9, color: '8A8D95', fontFace: FONT, margin: 0 } } },
      { placeholder: { options: { name: 'title', type: 'title', x: 0.55, y: 0.62, w: 10.4, h: 0.72, fontSize: 30, bold: true, color: DK, fontFace: FONT, margin: 0, valign: 'middle', align: 'left' }, text: '' } },
    ],
    slideNumber: { x: 12.45, y: 7.04, w: 0.5, h: 0.3, fontSize: 9, color: '8A8D95', align: 'right', fontFace: FONT },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let SL: any = null; let uid = 0
  const kn = (n: number) => 'k' + String(n).padStart(2, '0') + '_' + (++uid)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const T = (text: any, o: any) => SL.addText(text, { isTextBox: true, margin: 0, fontFace: FONT, color: DK, ...o })
  const kicker = (t: string) => T(t, { x: 0.55, y: 0.32, w: 9, h: 0.3, fontSize: 12, bold: true, color: R, charSpacing: 3 })
  const fit = (key: string, x: number, y: number, w: number, h: number) => {
    const [iw, ih] = B[key]; const s = Math.min(w / iw, h / ih); const ww = iw * s, hh = ih * s
    return { path: B[key][2], x: x + (w - ww) / 2, y: y + (h - hh) / 2, w: ww, h: hh }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bild = (key: string, x: number, y: number, w: number, h: number, n?: number, extra: any = {}) => {
    const f = fit(key, x, y, w, h)
    SL.addShape(pres.shapes.RECTANGLE, {
      x: f.x - 0.06, y: f.y - 0.06, w: f.w + 0.12, h: f.h + 0.12, fill: { color: W }, line: { color: LINE, width: 0.75 },
      shadow: { type: 'outer', color: '000000', opacity: 0.18, blur: 8, offset: 2, angle: 90 }, objectName: n ? kn(n) + '_rahmen' : undefined,
    })
    SL.addImage({ ...f, objectName: n ? kn(n) + '_bild' : undefined, ...extra })
    return f
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const karte = (n: number, x: number, y: number, w: number, h: number, runs: any, o: any = {}) => SL.addText(runs, {
    shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.1, x, y, w, h, fill: { color: o.fill || W }, line: { color: o.line || (o.fill || W), width: o.lw || 1 },
    margin: o.margin ?? [12, 16, 12, 16], valign: o.valign || 'top', fontFace: FONT, color: o.color || DK, fontSize: o.fs || 15,
    shadow: o.noShadow ? undefined : { type: 'outer', color: '000000', opacity: 0.10, blur: 6, offset: 1.5, angle: 90 },
    objectName: n ? kn(n) : undefined, paraSpaceAfter: o.psa ?? 4, align: o.align || 'left',
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zeile = (n: number, x: number, y: number, w: number, h: number, text: any, o: any = {}) => SL.addText(text, {
    isTextBox: true, x, y, w, h, margin: 0, fontFace: FONT, color: o.color || DK, fontSize: o.fs || 17,
    valign: o.valign || 'top', objectName: kn(n), paraSpaceAfter: 2, bold: o.bold, align: o.align || 'left',
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const punkt = (n: number, x: number, y: number, w: number, h: number, text: any, o: any = {}) => SL.addText([
    { text: '●  ', options: { color: o.dot || R, fontSize: (o.fs || 17) - 4 } }, ...(Array.isArray(text) ? text : [{ text }])],
    { isTextBox: true, x, y, w, h, margin: 0, fontFace: FONT, color: DK, fontSize: o.fs || 17, valign: 'top', objectName: kn(n), indent: 0 })
  void punkt
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const badge = (t: string, x: number, y: number, w: number, fill = R, color = W) => SL.addText(t, {
    shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.17, x, y, w, h: 0.34,
    fill: { color: fill }, line: { color: fill }, fontFace: FONT, fontSize: 11, bold: true, color, align: 'center', valign: 'middle', margin: 0, charSpacing: 1,
  })
  void badge
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zurueck = (...ziele: Array<[string, number]>) => ziele.forEach(([name, ziel], i) => SL.addText([{ text: '← ' + name, options: { hyperlink: { slide: ziel, tooltip: 'Zurück zu: ' + name } } }],
    { isTextBox: true, x: 9.25, y: 0.95 + i * 0.25, w: 3.72, h: 0.24, fontSize: 10, color: R, align: 'right', margin: 0, fontFace: FONT, objectName: 'RUECKLINK_' + ziel }))
  const kalLink = (ziel: number) => zurueck(['Kalender', ziel])
  const FN: Record<string, string> = {
    AZS: 'AZS = Auszahlungsspiel: Die Verlage übernehmen ihren Anteil an den Geldpreisen und erhalten eine Vergütung pro Anruf; TMI übernimmt das Gewinnerhandling.',
    RSP: 'RSP = Rundum-Sorglos-Paket: Stop-Loss-Garantie – TMI liefert die druckfertigen Anzeigen, bezahlt das Preisgeld und trägt das Risiko; nur Preise auf Langzeitschienen und täglich unter allen Teilnehmern gezogene Tagespreise werden anteilig vom Verlags-Share abgezogen.',
  }
  const fussnote = (arten: string[]) => {
    const zeilen = arten.map((a) => FN[a])
    const h = 0.16 * zeilen.length
    SL.addText(zeilen.map((z, i) => ({ text: z, options: { breakLine: i < zeilen.length - 1 } })),
      { isTextBox: true, x: 0.55, y: 7.03 - h - 0.02, w: 12.42, h, fontSize: 7.2, color: GR, fontFace: FONT, margin: 0, valign: 'bottom' })
  }
  const OHNE = !!opt.ohneNotizen
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const neu = (opts?: any) => { SL = pres.addSlide(opts); if (OHNE) SL.addNotes = () => SL; return SL }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sprung = (text: string, ziel: number) => SL.addText([{ text, options: { hyperlink: { slide: ziel, tooltip: text } } }],
    { isTextBox: true, x: 9.25, y: 0.95, w: 3.72, h: 0.26, fontSize: 10, color: R, align: 'right', margin: 0, fontFace: FONT })
  void sprung
  const KAL = 7

  // ---------------------- Folien ---------------------- (Inhalt wie gsp2027_verlag.js, Zeilen 102–587)
  // Nur Titel + Prinzip + Modelle + Teilnahme + Kalender + alle Spielfolien + Abrechnung + Referenzen + Kontakt.

  // 1 Titel
  neu()
  SL.background = { color: DK }
  SL.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: R }, line: { color: R } })
  SL.addImage({ path: B.logo_weiss[2], x: 0.7, y: 0.6, w: 2.6, h: 0.9 })
  T('GEWINNSPIELPLAN', { x: 0.7, y: 2.35, w: 6.4, h: 0.4, fontSize: 16, bold: true, color: GOLD, charSpacing: 5 })
  T('2027', { x: 0.62, y: 2.7, w: 6.4, h: 1.7, fontSize: 120, bold: true, color: W })
  T('Jeden Monat ein Spiel.\nWeniger Preisgeld. Mehr Erlös.', { x: 0.7, y: 4.45, w: 6.2, h: 1.1, fontSize: 24, color: 'E6E3E8', valign: 'top' })
  T('Andreas Gnam · Geschäftsführer · Telemedia Interactive GmbH', { x: 0.7, y: 6.6, w: 7, h: 0.35, fontSize: 13, color: '9EA1AA' })
  if (VERLAG) {
    const fsV = Math.min(20, Math.floor(800 / ('Für ' + VERLAG).length))
    SL.addShape(pres.shapes.LINE, { x: 0.7, y: 5.78, w: 0.6, h: 0, line: { color: GOLD, width: 1.5 } })
    T([{ text: 'Für ', options: { color: '9EA1AA' } }, { text: VERLAG, options: { color: W, bold: true } }],
      { x: 0.7, y: 5.9, w: 6.45, h: 0.45, fontSize: fsV, valign: 'middle', objectName: 'VERLAG_NAME' })
  }
  ;([['jul1', 7.35, 0.7, -5], ['kuq_april', 9.65, 2.15, 4], ['geldregen', 7.55, 3.95, -2]] as const).forEach(([k, x, y, rot]) => {
    const f = fit(k, x, y, 4.6, 3.1)
    SL.addShape(pres.shapes.RECTANGLE, {
      x: f.x - 0.07, y: f.y - 0.07, w: f.w + 0.14, h: f.h + 0.14, fill: { color: W }, line: { color: W }, rotate: rot,
      shadow: { type: 'outer', color: '000000', opacity: 0.45, blur: 14, offset: 4, angle: 90 },
    })
    SL.addImage({ ...f, rotate: rot })
  })
  SL.addNotes(`Begrüßung.
Guten Tag und herzlich willkommen. Ich freue mich, Ihnen heute unseren Gewinnspielplan 2027 vorzustellen.
Die Kurzfassung steht schon auf der Folie: Jeden Monat ein Spiel, weniger Preisgeld für Sie – und mehr Erlös.
In den nächsten Minuten zeige ich Ihnen, wie das funktioniert, welche Spiele wir 2027 planen und was Sie als Verlag davon haben.
(Weiter mit Leertaste, Pfeil rechts oder Klicker.)`)

  // 2 Das Prinzip
  neu({ masterName: 'INHALT' })
  kicker('DAS PRINZIP')
  SL.addText('Ein Plan für das ganze Jahr', { placeholder: 'title' })
  const p2 = [
    ['11', 'Spielmonate im Jahr', 'Jeden Monat ein Gewinnspiel – nur der August hat Sommerpause.'],
    ['÷ 5', 'Preisgeld geteilt', 'Im Superverbund teilen sich alle teilnehmenden Verlagsgruppen die Preisgelder.'],
    ['1', 'Ansprechpartner', 'Telemedia liefert Content und Technik und übernimmt das komplette Gewinnerhandling.'],
  ] as const
  p2.forEach(([gross, titel, text], i) => karte(i + 1, 0.55 + i * 4.18, 1.75, 3.95, 3.55, [
    { text: gross, options: { fontSize: 66, bold: true, color: R, breakLine: true } },
    { text: titel, options: { fontSize: 22, bold: true, breakLine: true } },
    { text: ' ', options: { fontSize: 8, breakLine: true } },
    { text, options: { fontSize: 16, color: GR } }], { margin: [20, 22, 18, 22] }))
  karte(4, 0.55, 5.6, 12.38, 1.0, [{ text: 'Sie entscheiden selbst, ', options: { bold: true } }, { text: 'bei welchen Spielen Sie dabei sind – Monat für Monat.' }],
    { fill: DK, color: W, fs: 20, valign: 'middle', align: 'center', margin: [8, 16, 8, 16] })

  // 3 Verlagsübergreifend
  neu({ masterName: 'INHALT' })
  kicker('SEIT JANUAR 2023')
  SL.addText('Verlagsübergreifend – der Schlüssel zum Erfolg', { placeholder: 'title' })
  zeile(1, 0.55, 1.75, 5.7, 1.0, 'Seit Januar 2023 läuft jeden Monat ein Gewinnspiel, an dem mehrere unabhängige Verlagsgruppen teilnehmen.', { fs: 18 })
  zeile(2, 0.55, 2.85, 5.7, 0.5, 'Die Koordination übernimmt komplett Telemedia.', { fs: 18 })
  karte(3, 0.55, 3.55, 5.7, 1.15, [{ text: 'Ø 5 Verlagsgruppen', options: { bold: true, fontSize: 30, color: R, breakLine: true } }, { text: 'pro Monat im Jahr 2026 (gerundet)', options: { fontSize: 15, color: GR } }])
  karte(4, 6.65, 1.75, 6.28, 1.55, [
    { text: '1.000 € Tagespreis  ÷  5 Verlagsgruppen', options: { fontSize: 18, color: GR, breakLine: true } },
    { text: '= nur 200 € je Verlagsgruppe', options: { fontSize: 30, bold: true, color: DK } }], { valign: 'middle' })
  karte(5, 6.65, 3.5, 6.28, 1.2, [
    { text: '20.000 € ', options: { fontSize: 34, bold: true, color: W } },
    { text: 'weniger Preisgeld pro Spiel und Verlag – bei 5 Verlagsgruppen und 25 Spieltagen', options: { fontSize: 15, color: 'F2DDE3' } }], { fill: R, valign: 'middle' })
  zeile(6, 0.55, 4.95, 12.4, 0.4, 'Transparent für die Leser: Der Hinweis auf die gemeinsame Aktion steht in den Teilnahmebedingungen jeder Anzeige.', { fs: 15, color: GR })
  bild('tnb_strip', 0.55, 5.4, 7.4, 1.5, 6)
  karte(7, 8.35, 5.4, 4.58, 1.5, [{ text: 'Keine negativen Auswirkungen auf die Teilnahmezahlen – und keine uns bekannten Leserbeschwerden.', options: { fontSize: 15 } }],
    { fill: RL, line: RL, valign: 'middle' })

  // 4 Zwei Modelle
  neu({ masterName: 'INHALT' })
  kicker('ZWEI MODELLE')
  SL.addText('So funktionieren die beiden Modelle', { placeholder: 'title' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modell = (n: number, x: number, kurz: string, titel: string, unter: string, zeilen: string[], farbe: string, ziel: number, linkText: string) => karte(n, x, 1.6, 6.05, 4.15, [
    { text: kurz, options: { fontSize: 13, bold: true, color: farbe, charSpacing: 3, breakLine: true } },
    { text: titel, options: { fontSize: 24, bold: true, breakLine: true } },
    { text: unter, options: { fontSize: 15, color: GR, breakLine: true } },
    { text: ' ', options: { fontSize: 8, breakLine: true } },
    ...zeilen.flatMap((z) => [{ text: '●  ', options: { color: farbe, fontSize: 12 } }, { text: z, options: { fontSize: 15, breakLine: true } }]),
    { text: '→ ' + linkText, options: { fontSize: 14, bold: true, color: R, hyperlink: { slide: ziel, tooltip: linkText } } }],
    { margin: [16, 22, 14, 22], psa: 5 })
  modell(1, 0.55, 'AZS', 'Auszahlungsspiele', 'Die Rätselspiele – auf Wunsch auch als RSP', [
    'Die Verlage übernehmen ihren Anteil an den Geldpreisen – z. B. ⅕ bei fünf Verlagsgruppen.',
    'TMI übernimmt das komplette Gewinnerhandling bis zur Überweisung.',
    'aus 2 mach 1 · Fehlerjagd · Brückenrätsel · Kombinieren & Kassieren · Gitterrätsel · Kreuz & Quer (Oktober)'], R, 17, 'Abrechnung Auszahlungsspiele')
  modell(2, 6.88, 'RSP', 'Rundum-Sorglos-Paket', 'Geldregen und Juli-Spiele', [
    'Stop-Loss-Garantie: TMI bezahlt das Preisgeld und trägt das volle Risiko, dass es durch die Telefonerlöse gedeckt wird.',
    'TMI liefert täglich die druckfertige Anzeige in Ihrem CI.',
    'Geldregen (März, April als Kreuz & Quer, Nov., Dez.) · Juli-Spiele – optional jedes Rätselspiel'], 'A06F00', 18, 'Das Rundum-Sorglos-Paket')
  karte(3, 0.55, 5.88, 12.38, 0.62, [{ text: 'Auch bei den Auszahlungsspielen: ', options: { bold: true } }, { text: 'deutlich niedrigere Preisgeldkosten durch Synergien.' }],
    { fill: DK, color: W, fs: 16, valign: 'middle', align: 'center' })
  fussnote(['AZS', 'RSP'])

  // 5 Arbeitsteilung
  neu({ masterName: 'INHALT' })
  kicker('ARBEITSTEILUNG')
  SL.addText('Wir haben den Content – Sie haben den Platz', { placeholder: 'title' })
  T('DAS MACHT TELEMEDIA', { x: 0.55, y: 1.65, w: 7.6, h: 0.3, fontSize: 13, bold: true, color: R, charSpacing: 2 })
  ;([
    ['Planung', 'Spiele nach dem Gewinnspielkalender planen und mehrere Verlagsgruppen zusammenbringen.'],
    ['Technik', 'Die gesamte Infrastruktur bereitstellen und die Hotlines betreuen.'],
    ['AZS', 'Rätsel, Bilder, Gewinnerfoto und -text liefern – inklusive Gewinnerhandling und Überweisung.'],
    ['RSP', 'Täglich die Druckvorlagen in Ihrem CI per Online-Tool – mit allen Texten und Bildern.'],
    ['RSP', 'TMI bezahlt die Geld- und Sachpreise und trägt das Risiko (Stop-Loss-Garantie).'],
  ] as const).forEach(([tag, text], i) =>
    karte(i + 1, 0.55, 2.05 + i * 0.93, 7.6, 0.8, [{ text: tag + '   ', options: { bold: true, color: R, fontSize: 14 } }, { text, options: { fontSize: 15 } }], { valign: 'middle', margin: [6, 16, 6, 16] }))
  T('IHR PART', { x: 8.6, y: 1.65, w: 4.3, h: 0.3, fontSize: 13, bold: true, color: R, charSpacing: 2 })
  karte(6, 8.6, 2.05, 4.33, 3.6, [
    { text: 'Platz für die tägliche Anzeige', options: { bold: true, fontSize: 17, breakLine: true } },
    { text: ' ', options: { fontSize: 8, breakLine: true } },
    { text: 'Vorlagen freigeben', options: { bold: true, fontSize: 17, breakLine: true } },
    { text: ' ', options: { fontSize: 8, breakLine: true } },
    { text: 'Redaktionelle Beiträge ', options: { bold: true, fontSize: 17 } }, { text: 'steigern die Aufmerksamkeit – auch bei überregionalen Spielen.', options: { fontSize: 15, breakLine: true } },
    { text: ' ', options: { fontSize: 8, breakLine: true } },
    { text: 'Werbung ', options: { bold: true, fontSize: 17 } }, { text: 'über Social Media, Radio, Griffecken und Teaser bringt zusätzliche Anrufe.', options: { fontSize: 15 } }],
    { fill: DK, color: W, margin: [22, 22, 18, 22] })
  T('Kosten für extern beauftragte Rätsel werden zu gleichen Teilen auf die teilnehmenden Verlagsgruppen und TMI umgelegt.', { x: 8.6, y: 5.85, w: 4.33, h: 0.7, fontSize: 11, color: GR, valign: 'top' })
  fussnote(['AZS', 'RSP'])

  // 6 Teilnahme & Fristen
  neu({ masterName: 'INHALT' })
  kicker('TEILNAHME')
  SL.addText('Bedingung und Fristen', { placeholder: 'title' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kachel = (n: number, x: number, gross: string, titel: string, text: string, fill: string, color: string) => karte(n, x, 1.75, 3.95, 3.3, [
    { text: gross, options: { fontSize: 44, bold: true, color: fill === W ? R : GOLD, breakLine: true } },
    { text: titel, options: { fontSize: 19, bold: true, breakLine: true } },
    { text: ' ', options: { fontSize: 6, breakLine: true } },
    { text, options: { fontSize: 15, color: fill === W ? GR : 'D9D9DE' } }], { fill, color, margin: [20, 22, 18, 22] })
  kachel(1, 0.55, '1 ×', 'Bedingung', 'Mindestens ein GELDREGEN (März/April oder Nov./Dez.) oder ein Rätselspiel im RSP-Modell im Jahr 2027.', DK, W)
  kachel(2, 4.76, '8 Wochen', 'Anmeldefrist GELDREGEN', 'vor Spielbeginn', W, DK)
  kachel(3, 8.98, '2 Wochen', 'Anmeldefrist Rätselspiele', 'im AZS-Modell vor Spielbeginn', W, DK)
  karte(4, 0.55, 5.25, 12.38, 1.1, [{ text: 'Rätselspiele: ', options: { bold: true, color: R } }, { text: '1 Lösungswort · Tagespreis 500 € · am Supermittwoch 1.000 €' }],
    { fs: 20, valign: 'middle', align: 'center' })
  fussnote(['AZS', 'RSP'])

  // 7 Kalender
  neu({ masterName: 'INHALT' })
  kicker('GEWINNSPIELKALENDER 2027')
  SL.addText('Spielspaß das ganze Jahr', { placeholder: 'title' })
  const MON = [
    ['Januar', ['aus 2 mach 1', ''], 'hell', 8, 'AZS oder RSP', ''], ['Februar', ['Fehlerjagd', ''], 'hell', 9, 'AZS oder RSP', ''], ['März', ['GELDREGEN', ''], 'dunkel', 10, 'RSP', ''],
    ['April', ['GELDREGEN', 'NEU2:Kreuz & Quer als Spezial-Geldregen'], 'dunkel', 11, 'RSP', ''], ['Mai', ['Brückenrätsel', ''], 'hell', 12, 'AZS oder RSP', ''], ['Juni', ['Kombinieren &', 'Kassieren'], 'hell', 13, 'AZS oder RSP', ''],
    ['Juli', ['4 neue Ideen', 'mit Jackpot'], 'dunkel', 14, 'RSP', 'NEU'], ['August', ['Sommerpause', ''], 'pause', 0, '', ''], ['September', ['Gitterrätsel', ''], 'hell', 16, 'AZS oder RSP', ''],
    ['Oktober', ['Kreuz & Quer', ''], 'hell', 11, 'AZS oder RSP', ''], ['November', ['GELDREGEN', ''], 'dunkel', 10, 'RSP', ''], ['Dezember', ['GELDREGEN', ''], 'dunkel', 10, 'RSP', ''],
  ] as const
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MON.forEach(([m, zz, stil, ziel, mod, neuTxt]: any, i: number) => {
    const [z1, z2] = zz as [string, string]
    const reihe = Math.floor(i / 6), sp = i % 6
    const x = 0.55 + sp * 2.08, y = 1.7 + reihe * 2.3
    const dunkel = stil === 'dunkel', pause = stil === 'pause'
    const fill = pause ? 'E9E6E1' : (dunkel ? DK : W)
    const col = pause ? '9A9CA3' : (dunkel ? W : DK)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runs: any[] = [
      { text: (m as string).toUpperCase(), options: { fontSize: 12, bold: true, color: dunkel ? GOLD : R, charSpacing: 2, breakLine: true, ...(ziel ? { hyperlink: { slide: ziel, tooltip: (z1 + ' ' + z2.replace('NEU2:', '– ')).trim() } } : {}) } },
      { text: ' ', options: { fontSize: 6, breakLine: true } },
      { text: z1, options: { fontSize: pause ? 14 : 15, bold: true, color: col, breakLine: true } },
      ...(z2.startsWith('NEU2:') ? [
        { text: 'Neu: ', options: { fontSize: 9.5, bold: true, color: GOLD } },
        { text: z2.slice(5), options: { fontSize: 9.5, bold: true, color: col, breakLine: true } },
        { text: ' ', options: { fontSize: 1.5, breakLine: true } },
      ] : [
        { text: z2 || ' ', options: { fontSize: pause ? 14 : 15, bold: true, color: col, breakLine: true } },
        { text: ' ', options: { fontSize: 6, breakLine: true } },
      ]),
      { text: mod || ' ', options: { fontSize: 12, bold: true, color: dunkel ? 'BDBFC7' : GR, breakLine: true } },
      { text: neuTxt || ' ', options: { fontSize: 11, bold: true, color: dunkel ? GOLD : R } }]
    karte(reihe + 1, x, y, 1.95, 2.15, runs, { fill, color: col, line: pause ? 'E9E6E1' : (dunkel ? DK : LINE), margin: [14, 14, 10, 14], psa: 0 })
    if (ziel) SL.addImage({ data: 'image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFElEQVR4nGP8//8/AzJgYkADhAUAxo4DBW3qFtQAAAAASUVORK5CYII=', x, y, w: 1.95, h: 2.15,
      hyperlink: { slide: ziel, tooltip: (m + ': ' + z1 + ' ' + z2.replace('NEU2:', '– ')).trim() } })
  })
  karte(3, 0.55, 6.2, 12.38, 0.26, [{ text: 'Dunkel = immer im RSP-Modell (Geldregen bzw. Juli-Spiele)  ·  Rätselspiele: 1 Lösungswort, Tagespreis 500 €, am Supermittwoch 1.000 €  ·  Monat anklicken = zum Spiel', options: { fontSize: 11, color: GR } }],
    { fill: HL, line: HL, noShadow: true, margin: 0, valign: 'middle' })
  fussnote(['AZS', 'RSP'])

  // Spielfolien
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spiel = ({ monat, modell, titel, key, punkte }: { monat: string; modell: string; titel: string; key: string; punkte: any[] }) => {
    neu({ masterName: 'INHALT' })
    kicker(monat.toUpperCase() + '  ·  ' + modell)
    SL.addText(titel, { placeholder: 'title' })
    kalLink(KAL)
    bild(B[key + '_kontrast'] ? key + '_kontrast' : key, 0.6, 1.65, 7.3, 4.8)
    let y = 1.65
    punkte.forEach((p, i) => {
      const h = p.h || 1.0
      karte(i + 1, 8.35, y, 4.58, h, Array.isArray(p.t) ? p.t : [{ text: p.t }], { fs: p.fs || 16, valign: 'middle', fill: p.fill || W, color: p.color || DK, line: p.fill || W })
      y += h + 0.17
    })
    fussnote(['AZS', 'RSP'].filter((a) => modell.includes(a)))
  }
  const preis = { t: [{ text: 'Tagespreis 500 €', options: { bold: true, breakLine: true } }, { text: 'am Supermittwoch 1.000 €', options: { color: GR, fontSize: 14 } }] }

  spiel({ monat: 'Januar', modell: 'AZS oder RSP', titel: 'aus 2 mach 1', key: 'aus2mach1', punkte: [
    { t: 'Bilderrätsel: Zwei Bilder ergeben zusammen einen Begriff – das ist das Lösungswort.', h: 1.35 },
    { t: 'Die vorgegebenen Buchstaben helfen beim Lösen.' }, preis] })

  // Februar – Fehlerjagd (Vorschlag)
  neu({ masterName: 'INHALT' })
  kicker('FEBRUAR  ·  AZS ODER RSP')
  SL.addText('Fehlerjagd', { placeholder: 'title' })
  kalLink(KAL)
  bild('fehler_a', 0.6, 1.65, 3.55, 4.55)
  bild('fehler_b_markiert', 4.35, 1.65, 3.55, 4.55)
  T('ORIGINAL', { x: 0.6, y: 6.32, w: 3.55, h: 0.25, fontSize: 11, bold: true, color: GR, align: 'center', charSpacing: 2 })
  T('SUCHBILD  ·  5 UNTERSCHIEDE MARKIERT', { x: 4.35, y: 6.32, w: 3.55, h: 0.25, fontSize: 10, bold: true, color: R, align: 'center', charSpacing: 1 })
  karte(1, 8.35, 1.65, 4.58, 1.0, [{ text: 'Zwei fast gleiche Fotos: Wie viele Unterschiede hat das Suchbild? ' }, { text: 'Zwei Lösungen sind vorgegeben.', options: { bold: true } }], { fs: 14, valign: 'middle' })
  karte(2, 8.35, 2.82, 4.58, 1.15, [{ text: 'Eine Hotline für alle: ', options: { bold: true } }, { text: 'Ihre Leser sprechen die richtige Lösung auf und hinterlassen ihre Daten – einfacher geht es nicht.' }], { fs: 14, valign: 'middle' })
  karte(3, 8.35, 4.14, 4.58, 1.4, [{ text: 'Optional mit Spracherkennung ', options: { bold: true, color: GOLD } }, { text: '(+ 0,01 € pro Anruf): ', options: { color: GOLD } },
    { text: 'Ihre Leser erfahren sofort, ob ihre Antwort stimmt – und können bei falscher Antwort gleich noch einmal anrufen.' }], { fs: 14, valign: 'middle', fill: DK, color: W })
  karte(4, 8.35, 5.71, 4.58, 0.8, preis.t, { fs: 15, valign: 'middle', margin: [6, 16, 6, 16] })
  fussnote(['AZS', 'RSP'])

  spiel({ monat: 'März · April (Kreuz & Quer) · November · Dezember', modell: 'RSP', titel: 'GELDREGEN', key: 'geldregen', punkte: [
    { t: 'Eine Quizfrage, zwei Antworten – angerufen wird die Hotline mit der Endziffer der Antwort.', h: 0.95, fs: 15 },
    { t: [{ text: 'Sechs Geldpakete ', options: { bold: true } }, { text: 'von 100 bis 10.000 € – jeden Tag.' }], h: 0.72, fs: 15 },
    { t: 'Zeitfenster unterschiedlicher Länge, per Zufallsgenerator über den Spieltag verteilt.', h: 0.95, fs: 15 },
    { t: [{ text: 'Stop-Loss-Garantie: ', options: { bold: true, color: GOLD } }, { text: 'Nur die Preise auf vorher festgelegten Langzeitschienen werden anteilig vom Share jedes Verlags abgezogen (i. d. R. 70.000 € pro Spielmonat, aufgeteilt auf alle). Der Großteil der Preise liegt auf Kurzzeitschienen und ist versichert.', options: { breakLine: true } },
          { text: '→ zur Abrechnung', options: { bold: true, color: GOLD, hyperlink: { slide: 19, tooltip: 'Abrechnung RSP' } } }], fill: DK, color: W, h: 2.05, fs: 13 }] })

  // Kreuz & Quer – zwei Bilder
  neu({ masterName: 'INHALT' })
  kicker('APRIL  ·  GELDREGEN (RSP)     |     OKTOBER  ·  AZS ODER RSP')
  SL.addText('Kreuz & Quer', { placeholder: 'title' })
  kalLink(KAL)
  bild('kuq_april', 0.6, 1.65, 4.85, 3.65)
  bild('kuq_okt', 5.75, 1.65, 4.85, 3.65)
  T('April: Geldregen – neu mit Kreuz & Quer als Spezial-Geldregen', { x: 0.6, y: 5.42, w: 4.85, h: 0.3, fontSize: 11, bold: true, color: R, align: 'center' })
  T('Oktober: klassisch – AZS oder RSP', { x: 5.75, y: 5.42, w: 4.85, h: 0.3, fontSize: 13, bold: true, color: R, align: 'center' })
  karte(1, 10.95, 1.65, 1.98, 3.65, [{ text: 'Der Klassiker: ', options: { bold: true, breakLine: true } }, { text: 'Kreuzworträtsel lösen – die markierten Felder ergeben das Lösungswort.' }], { fs: 14 })
  karte(2, 0.6, 5.8, 6.0, 0.7, [{ text: 'April (Geldregen): ', options: { bold: true } }, { text: 'zwei Lösungswörter zur Wahl, sechs Geldpakete, Hotline mit Endziffer 1/2' }], { fs: 14, valign: 'middle', fill: DK, color: W })
  karte(3, 6.85, 5.8, 6.08, 0.7, [{ text: 'Oktober: ', options: { bold: true } }, { text: 'Tagespreis 500 €, am Supermittwoch 1.000 €' }], { fs: 14, valign: 'middle' })
  fussnote(['AZS', 'RSP'])

  spiel({ monat: 'Mai', modell: 'AZS oder RSP', titel: 'Brückenrätsel', key: 'bruecke', punkte: [
    { t: 'Brückenwörter verbinden zwei Begriffe – die gesuchten Buchstaben ergeben das Lösungswort.', h: 1.6 }, preis] })

  spiel({ monat: 'Juni', modell: 'AZS oder RSP', titel: 'Kombinieren & Kassieren', key: 'kombi', punkte: [
    { t: 'Bilderrätsel: Das Motiv steht für ein Begriffspaar – beide zusammen ergeben das Lösungswort.', h: 1.6 },
    { t: 'Die vorgegebenen Buchstaben helfen beim Lösen.' }, preis] })

  // Juli – Überblick
  neu({ masterName: 'INHALT' })
  kicker('JULI  ·  RSP  ·  NEU')
  SL.addText('4 neue Spielideen mit Jackpot', { placeholder: 'title' })
  kalLink(KAL)
  ;(['jul1', 'jul2', 'jul3', 'jul4'] as const).forEach((k, i) => bild(k, 6.75 + (i % 2) * 3.13, 1.7 + Math.floor(i / 2) * 2.6, 2.95, 2.4))
  const jp = [
    [[{ text: 'Vier Wochen, vier neue Spiele: Sommer-Postkarte, Wahr oder erfunden?, Sprichwort-Rätsel, Schattenrätsel.' }], 1.0, W, DK, 15],
    [[{ text: 'Täglich 500 € Tagespreis ', options: { bold: true } }, { text: '– verlost unter allen Anrufen mit der richtigen Antwort.' }], 0.75, W, DK, 15],
    [[{ text: 'Plus Jackpot 1.000 → 2.000 → 3.000 → 5.000 €: ', options: { bold: true, color: GOLD } }, { text: '1 × täglich in einem geheimen Zeitfenster – wer als Erster darin richtig anruft, gewinnt.' }], 1.0, DK, W, 15],
    [[{ text: 'Stop-Loss-Garantie: ', options: { bold: true } }, { text: 'Die Jackpots liegen auf Zeitschienen unterschiedlicher Länge. Nur 2 × 1.000 € und je einmal 2.000, 3.000 und 5.000 € liegen auf der Langzeitschiene, der Rest täglich auf Kurzzeitschienen – versichert. Aufzuteilendes Gesamtpreisgeld inkl. 500 € Tagespreis: rund 945 € pro Spieltag.' }], 1.75, 'FFF3D6', DK, 13],
  ] as const
  let yj = 1.65
  jp.forEach((entry, i) => {
    const [t, h, fill, color, fs] = entry as unknown as [unknown, number, string, string, number]
    karte(i + 1, 0.55, yj, 5.9, h, t, { fs, valign: 'middle', fill, color, line: fill === 'FFF3D6' ? GOLD : fill })
    yj += h + 0.15
  })
  fussnote(['RSP'])

  // Juli – Wochen
  neu({ masterName: 'INHALT' })
  kicker('JULI  ·  DIE VIER SPIELWOCHEN')
  SL.addText('Woche für Woche mehr Jackpot', { placeholder: 'title' })
  kalLink(KAL)
  const WO = [
    ['jul1', '1. Woche', '01.–11. Juli', 'Sommer-Postkarte', '1.000 €'],
    ['jul2', '2. Woche', '12.–18. Juli', 'Wahr oder erfunden?', '2.000 €'],
    ['jul3', '3. Woche', '19.–25. Juli', 'Sprichwort-Rätsel', '3.000 €'],
    ['jul4', '4. Woche', '26.–31. Juli', 'Schattenrätsel', '5.000 €'],
  ] as const
  WO.forEach(([k, w, z, s, j], i) => {
    const x = 0.55 + i * 3.13
    bild(k, x + 0.05, 1.75, 2.9, 2.3, i + 1)
    karte(i + 1, x, 4.25, 3.0, 2.25, [
      { text: w.toUpperCase() + '  ·  ' + z, options: { fontSize: 11, bold: true, color: R, charSpacing: 1, breakLine: true } },
      { text: s, options: { fontSize: 18, bold: true, breakLine: true } },
      { text: ' ', options: { fontSize: 6, breakLine: true } },
      { text: 'Jackpot täglich', options: { fontSize: 12, color: GR, breakLine: true } },
      { text: j, options: { fontSize: 30, bold: true, color: RD } }], { margin: [14, 16, 12, 16] })
  })
  T('Jeden Tag zusätzlich 500 € Tagespreis.', { x: 0.55, y: 6.56, w: 12.4, h: 0.25, fontSize: 12, color: GR })
  fussnote(['RSP'])

  spiel({ monat: 'September', modell: 'AZS oder RSP', titel: 'Gitterrätsel', key: 'gitter', punkte: [
    { t: 'Begriffe nach ihrer Länge ins Gitter einsetzen – die markierten Felder ergeben das Lösungswort.', h: 1.6 }, preis] })

  // Abrechnung AZS
  neu({ masterName: 'INHALT' })
  kicker('ABRECHNUNG  ·  AUSZAHLUNGSSPIELE (AZS)')
  SL.addText('So verdienen Sie bei den Auszahlungsspielen', { placeholder: 'title' })
  zurueck(['Zwei Modelle', 4])
  karte(1, 0.55, 1.75, 5.7, 1.85, [{ text: 'Ihre Vergütung', options: { bold: true, fontSize: 14, color: GOLD, charSpacing: 2, breakLine: true } },
    { text: 'Vereinbarte Ausschüttung pro Anruf × Anrufe Ihres Verlags im Spielmonat', options: { fontSize: 19, bold: true } }], { fill: DK, color: W })
  karte(2, 0.55, 3.8, 5.7, 2.2, [{ text: 'Preisgelder', options: { bold: true, fontSize: 14, color: R, charSpacing: 2, breakLine: true } },
    { text: 'Vor Spielbeginn überweisen Sie Ihren Anteil – z. B. ⅕ bei fünf Verlagsgruppen. TMI übernimmt das gesamte Gewinnerhandling inklusive Überweisung.', options: { fontSize: 16 } }])
  const rech = [
    ['Annahme', '5 Verlage · 24 Spieltage · 500 € täglich + 4 Supertage', 'Preisgelder gesamt ' + tsd(AZS_PREIS) + ' €'],
    ['Anrufe', '5.000 pro Tag über Ihre Titel', tsd(AZS_ANRUFE) + ' Anrufe'],
    ['Vergütung', euroCent(AZS) + ' (Ihr Satz) × ' + tsd(AZS_ANRUFE) + ' Anrufe', tsd(AZS_VERG) + ' €'],
    ['Preisgeldanteil', '20 % von ' + tsd(AZS_PREIS) + ' €', '− ' + tsd(AZS_ANTEIL) + ' €'],
  ] as const
  rech.forEach(([a, b, c], i) => karte(i + 3, 6.65, 1.75 + i * 0.95, 6.28, 0.82, [
    { text: a + '   ', options: { bold: true, color: R, fontSize: 13 } }, { text: b, options: { fontSize: 13, color: GR, breakLine: true } }, { text: c, options: { bold: true, fontSize: 16, align: 'right' } }],
    { valign: 'middle', margin: [4, 14, 4, 14], psa: 0 }))
  karte(7, 6.65, 5.6, 3.05, 1.2, [{ text: 'Ihr Verdienst', options: { fontSize: 13, color: 'F2DDE3', breakLine: true } }, { text: tsd(AZS_VERDIENST) + ' €', options: { fontSize: 30, bold: true } }], { fill: R, color: W, valign: 'middle' })
  karte(7, 9.88, 5.6, 3.05, 1.2, [{ text: 'Ihre Ersparnis an Preisgeldern', options: { fontSize: 13, color: GR, breakLine: true } }, { text: tsd(AZS_ERSPARNIS) + ' €', options: { fontSize: 30, bold: true, color: DK } }], { fill: 'FFF3D6', line: GOLD, valign: 'middle' })
  T('Beispielrechnung. Alle Preise zzgl. der gesetzlichen Umsatzsteuer von derzeit 19 %.', { x: 0.55, y: 6.25, w: 5.7, h: 0.5, fontSize: 11, color: GR })
  fussnote(['AZS'])

  // RSP Leistungen
  neu({ masterName: 'INHALT' })
  kicker('RUNDUM-SORGLOS-PAKET (RSP)')
  SL.addText('Wir übernehmen Preisgelder und Arbeit für Sie', { placeholder: 'title' })
  zurueck(['Zwei Modelle', 4])
  const rsp: [string, string][] = [
    ['Stop-Loss-Garantie', 'TMI liefert die druckfertigen Anzeigen, bezahlt das Preisgeld und trägt das volle Risiko, dass es durch die Telefonerlöse gedeckt wird.'],
    ['Gewinnerhandling', 'Optional und ohne Zusatzkosten im Namen der Zeitung: Benachrichtigung, Kontoverbindung, Überweisung, Gewinnerfoto.'],
    ['Tägliche Anzeige', 'Jeden Tag die druckfertige Anzeige – mit neuen Texten, Gewinnerbildern und Gewinnertexten.'],
    ['0800-Hotline', 'Bei Fragen und Problemen rufen Ihre Leser bei uns an – nicht im Verlag.'],
    ['Faire Teilung', SHARE === 50 ? 'Anruferlöse minus verlagsanteilige Preisgelder – der Rest wird hälftig zwischen Verlag und TMI geteilt.'
      : 'Anruferlöse minus verlagsanteilige Preisgelder – vom Rest erhält der Verlag ' + SHARE + ' %, TMI ' + (100 - SHARE) + ' %.'],
  ]
  rsp.forEach(([t, d], i) => {
    const x = 0.55 + (i % 3) * 4.18, y = 1.75 + Math.floor(i / 3) * 2.2
    karte(i + 1, x, y, 3.95, 2.0, [{ text: String(i + 1) + '  ', options: { fontSize: 26, bold: true, color: R } }, { text: t, options: { fontSize: 18, bold: true, breakLine: true } },
      { text: ' ', options: { fontSize: 5, breakLine: true } }, { text: d, options: { fontSize: 14, color: GR } }], { margin: [14, 18, 12, 18] })
  })
  karte(6, 8.91, 3.95, 4.02, 2.0, [{ text: 'Ihr Part: ', options: { bold: true, color: GOLD } }, { text: 'Anzeige abdrucken, Vorlagen freigeben, Erlösanteil verbuchen. Um alles andere kümmern wir uns.' }],
    { fill: DK, color: W, fs: 16, valign: 'middle', margin: [14, 18, 12, 18] })
  fussnote(['RSP'])

  // RSP Abrechnung
  neu({ masterName: 'INHALT' })
  kicker('ABRECHNUNG  ·  RSP  ·  BEISPIEL GELDREGEN')
  zurueck(['Geldregen', 10])
  SL.addText('So verdienen Sie beim Geldregen', { placeholder: 'title' })
  ;([
    ['0,36 € × Anrufe Ihres Verlags', '= Ihr Gewinnspielumsatz'],
    ['− anteilige Preisgelder', 'nur Langzeitschienen, nach Ihrem Anteil am Anrufvolumen = Vergütungsbasis'],
    ['× ' + SHARE + ' %', '= Ihre Vergütung'],
  ] as const).forEach(([a, b], i) => karte(i + 1, 0.55, 1.75 + i * 1.35, 5.7, 1.15, [
    { text: a, options: { bold: true, fontSize: 20, breakLine: true } }, { text: b, options: { fontSize: 14, color: i === 2 ? 'F2DDE3' : GR } }],
    { valign: 'middle', fill: i === 2 ? R : W, color: i === 2 ? W : DK }))
  const rr = [
    ['Anrufe', '1.200.000 im Verbund · Ihr Anteil 20 % (5 Verlage)', tsd(RSP_ANRUFE)],
    ['Preisgelder', 'auf Langzeitschienen im Spielmonat (i. d. R.)', '70.000 €'],
    ['Umsatz', '0,36 € × ' + tsd(RSP_ANRUFE) + ' Anrufe', tsd(RSP_UMSATZ) + ' €'],
    ['Preisgeldanteil', '20 % von 70.000 €', '− ' + tsd(RSP_ANTEIL) + ' €'],
    ['Basis', tsd(RSP_UMSATZ) + ' € − ' + tsd(RSP_ANTEIL) + ' €', tsd(RSP_BASIS) + ' €'],
  ] as const
  rr.forEach(([a, b, c], i) => karte(i + 4, 6.65, 1.75 + i * 0.8, 6.28, 0.7, [
    { text: a + '   ', options: { bold: true, color: R, fontSize: 12 } }, { text: b, options: { fontSize: 12, color: GR, breakLine: true } }, { text: c, options: { bold: true, fontSize: 15, align: 'right' } }],
    { valign: 'middle', margin: [2, 14, 2, 14], psa: 0 }))
  karte(9, 6.65, 5.85, 6.28, 0.95, [{ text: 'Ihre Vergütung (' + SHARE + ' %):  ', options: { fontSize: 16, color: 'F2DDE3' } }, { text: tsd(RSP_VERG) + ' €', options: { fontSize: 30, bold: true } }],
    { fill: R, color: W, valign: 'middle' })
  T('Beispielrechnung. Alle Preise zzgl. der gesetzlichen Umsatzsteuer von derzeit 19 %.', { x: 0.55, y: 6.0, w: 5.7, h: 0.5, fontSize: 11, color: GR })
  fussnote(['RSP'])

  // Referenzen
  neu({ masterName: 'INHALT' })
  kicker('REFERENZEN')
  SL.addText('Diese Verlage vertrauen uns', { placeholder: 'title' })
  const REG = 'Allgäuer Zeitung · Allgemeine Zeitung Uelzen · Altmark Zeitung · Augsburger Allgemeine · Badische Zeitung · Berliner Zeitung · Der Standard (Wien) · Frankenpost · Frankfurter Neue Presse · Fränkischer Tag · Freie Presse · Gießener Allgemeine Zeitung · Gießener Anzeiger · Hamburger Morgenpost · Heilbronner Stimme · HNA – Kassel · Isenhagener Kreisblatt · Kieler Nachrichten · Kleine Zeitung (Graz) · Kölner Express · Kreiszeitung Syke · Kronenzeitung (Österreich) · Lausitzer Rundschau · Leipziger Volkszeitung · Lübecker Nachrichten · Main-Post · Mannheimer Morgen · Märkische Oderzeitung · Mitteldeutsche Zeitung · Mittelbayerische Zeitung · Morgenpost Dresden · Münchner Merkur · Neue Osnabrücker Zeitung · Nordbayerischer Kurier · Nordkurier · Nordwest-Zeitung · Nordsee-Zeitung · Nürnberger Nachrichten · Oberbayerisches Volksblatt · Oberpfalz Medien · Ostsee-Zeitung · Rhein-Main-Presse · Ruhr Nachrichten · Schwarzwälder Bote · Schweriner Volkszeitung · sh:z Verlag · Suhler Verlagsgesellschaft · Süddeutsche Zeitung · Südkurier · Südthüringer Presse · Südwest Presse · Straubinger Tagblatt · Trierischer Volksfreund · TZ München · Westfälischer Anzeiger · Westfälische Nachrichten · Wetzlarer Neue Zeitung'
  const UPS = 'Allgäuer Zeitung · Allgemeine Zeitung Uelzen · Altmark Zeitung · Berliner Zeitung · HNA · Isenhagener Kreisblatt · Kieler Nachrichten · Main-Post · Madsack-Gruppe · Kronenzeitung Österreich · Morgenpost Sachsen · Münchner Merkur · Neue Presse Ulm · Nordkurier · Nordwest-Zeitung · Rhein-Zeitung · Ruhr Nachrichten · Saarbrücker Zeitung · Schwäbische Zeitung · Schwarzwälder Bote · sh:z · Trierischer Volksfreund · TZ München'
  karte(1, 0.55, 1.75, 3.8, 5.05, [
    { text: 'GRUPPENÜBERGREIFEND IM GEWINNSPIELPLAN', options: { bold: true, fontSize: 11, color: R, charSpacing: 1, breakLine: true } },
    { text: 'Augsburger Allgemeine\nSWMH-Gruppe\nNOZ/mh:n-Mediengruppe\nFunke Medien Thüringen\nNeue Westfälische\nSchwäbische Zeitung\nSaarbrücker Zeitung, Trierischer Volksfreund, Pfälzischer Merkur\nRhein-Zeitung\nIppen-Gruppe\nNPG inkl. LR und MOZ', options: { fontSize: 13, breakLine: true } },
    { text: ' ', options: { fontSize: 8, breakLine: true } },
    { text: 'ALS VERLAGSGRUPPE OHNE GEWINNSPIELPLAN', options: { bold: true, fontSize: 11, color: R, charSpacing: 1, breakLine: true } },
    { text: 'Verlagsgruppe Madsack', options: { fontSize: 13 } }], { margin: [16, 18, 14, 18] })
  karte(2, 4.55, 1.75, 4.6, 5.05, [{ text: 'REGIONAL – GEWINNSPIELE', options: { bold: true, fontSize: 11, color: R, charSpacing: 1, breakLine: true } },
    { text: REG, options: { fontSize: 10.5, color: '3A3C44' } }], { margin: [16, 18, 14, 18] })
  karte(3, 9.35, 1.75, 3.58, 5.05, [{ text: 'ABO- / E-PAPER-UPSELLING', options: { bold: true, fontSize: 11, color: GOLD, charSpacing: 1, breakLine: true } },
    { text: UPS, options: { fontSize: 11, color: 'E6E3E8' } }], { fill: DK, color: W, margin: [16, 18, 14, 18] })

  // Kontakt
  neu()
  SL.background = { color: DK }
  SL.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: R }, line: { color: R } })
  SL.addImage({ path: B.logo_weiss[2], x: 0.7, y: 0.55, w: 2.3, h: 0.8 })
  T('Lassen Sie uns 2027 gemeinsam spielen.', { x: 0.7, y: 1.75, w: 12, h: 0.9, fontSize: 38, bold: true, color: W })
  T('Wir freuen uns darauf, den Gewinnspielplan mit Ihnen umzusetzen. Für Rückfragen sind wir jederzeit da.', { x: 0.7, y: 2.65, w: 11.5, h: 0.5, fontSize: 17, color: 'C9CBD2' })
  const person = (n: number, x: number, _key: string, name: string, rolle: string, tel: string, mail: string) => {
    SL.addText([
      { text: name, options: { fontSize: 22, bold: true, color: W, breakLine: true } },
      { text: rolle, options: { fontSize: 14, color: GOLD, breakLine: true } },
      { text: ' ', options: { fontSize: 8, breakLine: true } },
      { text: tel, options: { fontSize: 15, color: 'E6E3E8', breakLine: true } },
      { text: mail, options: { fontSize: 15, color: 'E6E3E8', hyperlink: { url: 'mailto:' + mail } } }],
      { isTextBox: true, x, y: 3.6, w: 5.8, h: 2.15, margin: 0, fontFace: FONT, valign: 'middle', objectName: kn(n) + '_text' })
  }
  person(1, 0.7, 'AG', 'Andreas Gnam', 'Geschäftsführer', 'Telefon 089 530 720 75', 'andreas.gnam@telemedia-interactive.de')
  person(2, 6.9, 'YS', 'Yasmina Salah', 'Leitung Customer Care', 'Telefon 089 530 720 70', 'ys@telemedia-interactive.de')
  T('Telemedia Interactive GmbH · Kochelseestraße 10 · 81371 München · www.telemedia-interactive.de', { x: 0.7, y: 6.75, w: 12, h: 0.35, fontSize: 12, color: '9EA1AA' })

  // Export als ArrayBuffer → Uint8Array (vermeidet Buffer-Dependency im Browser; funktioniert auch in Node)
  const ab = (await pres.write({ outputType: 'arraybuffer' })) as ArrayBuffer
  return new Uint8Array(ab)
}
