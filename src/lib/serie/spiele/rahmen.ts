// Rahmen-Engine für alle Spiele des Katalogs: drei Gestaltungsfamilien wie beim Geldregen 2027
//   A „Goldene Nacht“ (Nachtblau/Gold) · B „Hell & Hausfarbe“ (Farbspalte links) · C „Hausfarbe mit Verlauf“
// Feste Bausteine: Kopf, Rätselfeld (vom Spiel), Antworten (2 Antworten oder Lösungswort), Preise je Mechanik
// (6 Geldpakete / Tagespreis + Supermittwoch / Tagespreis + Jackpot), Gewinner (1 oder 4), Teilnahmebedingungen,
// die die Logos unten rechts umfließen (6,0 pt, notfalls 5,5 pt – Einpass-Skript fit-source.ts).
// Struktur-Vertrag mit dem Einpass-/Prüf-Skript: .ad[data-h][data-wmm] > .body (1575 × 922) + .tband;
// alle Inhaltsblöcke tragen .blk[data-n] (Überlappungsprüfung); .card/.ant/.tile werden auf Überlauf geprüft.

import { FIT_JS } from '../fit-source'
import { BODY_H, PAKETE, PREIS, W, basisCss, bild, fehlt, mischen, pad2, pyRound, GEW_NAMEN, ZITATE } from '../generator'
import type { GewinnerAnzahl, PfadFn, Vorschlag, Zeitung } from '../types'
import { istMittwoch } from './kalender'
import { spielTnb } from './tnb'
import type { Inhalt, SpielDef, SpielSeitenArgs } from './typen'

// ------------------------------------------------------------------ Bausteine
const NAVY = '#0D1B36'
const GOLD = '#F2C14E'

function hotline(z: Zeitung): string {
  return z.raetsel_nummer ? z.raetsel_nummer : fehlt('NUMMER FOLGT')
}

function nrGeldpaket(z: Zeitung, p: number, e: number): string {
  if (!z.nummer) return `<span class="nr">${fehlt('NR. FOLGT')}<i>${e}</i></span>` // kurz, passt in die Paket-Tabelle
  const d = z.nummer.replace(/ /g, '').replace(/-/g, '') + String(p)
  return `<span class="nr">${d.slice(0, 5)} ${d.slice(5)}<i>${e}</i></span>`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export type Stil = {
  akzent: string // Akzent (Ziffern-Kreise, Beträge)
  akzentText: string // Textfarbe auf Akzent
  aufDunkel: boolean // steht der Block auf dunklem/farbigem Grund?
}

/** Antwort-Block: zwei Antworten mit Endziffer – oder Lösungswort-Kästchen */
function antworten(spiel: SpielDef, inh: Inhalt, s: Stil): string {
  if (spiel.antwort === 'ansagen') {
    const a1 = inh.a1 ? esc(inh.a1) : fehlt('Antwort A folgt')
    const a2 = inh.a2 ? esc(inh.a2) : fehlt('Antwort B folgt')
    return (
      `<div class="ant"><div class="d">A</div><b>${a1}</b><small>am Telefon ansagen</small></div>` +
      `<div class="ant"><div class="d">B</div><b>${a2}</b><small>am Telefon ansagen</small></div>`
    )
  }
  if (spiel.antwort === 'zwei') {
    const a1 = inh.a1 ? esc(inh.a1) : fehlt('Antwort 1 folgt')
    const a2 = inh.a2 ? esc(inh.a2) : fehlt('Antwort 2 folgt')
    return (
      `<div class="ant"><div class="d">1</div><b>${a1}</b><small>Endziffer 1</small></div>` +
      `<div class="ant"><div class="d">2</div><b>${a2}</b><small>Endziffer 2</small></div>`
    )
  }
  const n = Math.max(4, Math.min(14, (inh.loesung ?? '').replace(/\s/g, '').length || 8))
  const k = Array.from({ length: n }, () => '<span class="lk"></span>').join('')
  return `<div class="lw"><div class="lwl">LÖSUNGSWORT</div><div class="lks">${k}</div><div class="lwh">Nennen Sie das Lösungswort am Telefon.</div></div>`
}

/** Preise / Hotlines je Mechanik */
function preise(spiel: SpielDef, z: Zeitung, inh: Inhalt, schmal = false): string {
  const m = spiel.mechanik
  if (m.art === 'geldpakete') {
    const rows = PAKETE.map(
      ([a, b], i) =>
        `<tr><td><div class="pk">PAKET ${i + 1}</div><div class="an">${a} Gewinne</div></td><td class="bt rc">${b} €</td>` +
        `<td class="nrs${schmal ? '' : ' inl'}"><div class="nz">${nrGeldpaket(z, i + 1, 1)}${nrGeldpaket(z, i + 1, 2)}</div><div class="pr">${PREIS}</div></td></tr>`,
    ).join('')
    return `<table class="gp card"><tr><th>PAKET</th><th>GEWINN</th><th>HOTLINE + ENDZIFFER</th></tr>${rows}</table>`
  }
  const super_ = m.art === 'tagespreis' && m.supertag && istMittwoch(inh.datum)
  const tp = super_ ? (m as { supertag: string }).supertag : m.tagespreis
  let kacheln = `<div class="tile tp"><div class="pl">${super_ ? 'HEUTE SUPERMITTWOCH' : 'TAGESPREIS'}</div><div class="pv rc">${tp}</div>` +
    `<div class="pt">${super_ ? 'verlost unter allen richtigen Anrufen' : 'täglich verlost unter allen richtigen Anrufen'}</div></div>`
  if (m.art === 'tagespreis' && m.supertag && !super_)
    kacheln += `<div class="tile tp"><div class="pl">AM SUPERMITTWOCH</div><div class="pv rc">${m.supertag}</div><div class="pt">jeden Mittwoch</div></div>`
  if (m.art === 'jackpot')
    kacheln += `<div class="tile tp jp"><div class="pl">+ JACKPOT</div><div class="pv rc">${inh.jackpot ? esc(inh.jackpot) : fehlt('Jackpot folgt')}</div><div class="pt">1 × täglich im geheimen Zeitfenster*</div></div>`
  const nr = hotline(z)
  const nrHtml =
    spiel.antwort === 'zwei'
      ? `<div class="hz"><span class="nr">${nr}<i>1</i></span><span class="nr">${nr}<i>2</i></span></div>`
      : `<div class="hz"><span class="nr">${nr}</span></div>`
  return `<div class="kach">${kacheln}</div><div class="hot card"><div class="hk">IHRE GEWINN-HOTLINE${spiel.antwort === 'zwei' ? ' + ENDZIFFER' : ''}</div>${nrHtml}<div class="pr">${PREIS}</div></div>`
}

type GewDaten = { i: number; name: string; betrag: string; zitat: string; ort: string; foto?: string }

function gewinnerDaten(spiel: SpielDef, z: Zeitung, inh: Inhalt): { g1: GewDaten; g4: GewDaten[] } {
  const n = inh.tag
  const m = spiel.mechanik
  if (inh.gewinner && inh.gewinner.length) {
    const ex = inh.gewinner.slice(0, 4).map((e, k): GewDaten => ({ i: k, name: e.name, betrag: e.betrag, zitat: e.text, ort: e.ort, foto: e.foto }))
    return { g1: ex[0], g4: ex }
  }
  const betr = (k: number): string => {
    if (m.art === 'geldpakete') return ['1.000 €', '5.000 €', '500 €', '250 €', '10.000 €', '100 €', '1.000 €', '500 €'][(n + k) % 8]
    if (m.art === 'tagespreis') return k % 4 === 1 && m.supertag ? m.supertag : m.tagespreis
    return k % 3 === 2 && inh.jackpot ? inh.jackpot : m.tagespreis
  }
  const g4: GewDaten[] = []
  for (let k = 0; k < 4; k++) {
    const i = ((n * 3) % 8 + k) % 8
    g4.push({ i, name: GEW_NAMEN[i], betrag: betr(k), zitat: ZITATE[(n + k) % 8], ort: z.orte[k % z.orte.length] })
  }
  const i1 = (n * 5 + 3) % 8
  return { g1: { i: i1, name: GEW_NAMEN[i1], betrag: betr(2), zitat: ZITATE[(n + 4) % 8], ort: z.orte[n % z.orte.length] }, g4 }
}

function gewLabel(inh: Inhalt): string {
  return inh.tag === 1 ? 'UNSER GLÜCKSPILZ' : `GEWINNER VOM ${inh.tag - 1}. SPIELTAG`
}

function gewinner(spiel: SpielDef, z: Zeitung, inh: Inhalt, g: GewinnerAnzahl, rahmen: string, groesse: number, spalten: number): string {
  const { g1, g4 } = gewinnerDaten(spiel, z, inh)
  if (g === 4) {
    const cells = g4
      .map((x) => `<div class="gz">${bild([x.i, x.name, x.betrag, x.zitat, x.ort, x.foto], groesse, groesse, '50%', `border:3px solid ${rahmen};`)}<div class="gq"><b>${x.betrag}</b>${x.name}<br><small>${x.ort}</small></div></div>`)
      .join('')
    return `<div class="glbl">UNSERE GLÜCKSPILZE</div><div class="gg" style="grid-template-columns:repeat(${spalten},1fr)">${cells}</div>`
  }
  return (
    `<div class="g1">${bild([g1.i, g1.name, g1.betrag, g1.zitat, g1.ort, g1.foto], groesse + 24, groesse + 24, '50%', `border:4px solid ${rahmen};`)}` +
    `<div class="gq"><span class="glbl">${gewLabel(inh)}</span><b class="gb">${g1.betrag} · ${g1.name}, ${g1.ort}</b><small class="gzit">${g1.zitat}</small></div></div>`
  )
}

function tnbBand(spiel: SpielDef, args: SpielSeitenArgs): string {
  const { z, daten, monat, pfad } = args
  const n = z.logos.length
  let floats = ''
  if (n) {
    const mh = ({ 1: 110, 2: 62, 3: 46 } as Record<number, number>)[n] ?? 40
    const lg = z.logos
      .map((l, k) => `<img src="${pfad('logos/' + l + '.png')}" style="display:block;max-width:180px;max-height:${mh}px;margin:${k ? 4 : 0}px 0 0 auto">`)
      .join('')
    floats = `<div class="sp"></div><div class="lg">${lg}</div>`
  }
  return `<div class="tband" data-pad="20"><div class="tnb">${floats}${spielTnb(spiel, daten, z, monat)}</div></div>`
}

function kopfText(spiel: SpielDef): string {
  const m = spiel.mechanik
  return spiel.unterzeile
    .replace('{TAGESPREIS}', m.art === 'geldpakete' ? '10.000 €' : m.tagespreis)
    .replace('{SUPERTAG}', m.art === 'tagespreis' && m.supertag ? m.supertag : '')
}

function frageKopf(inh: Inhalt): string {
  const muster = inh.muster ? ` ${fehlt('MUSTER-INHALT')}` : ''
  return `<div class="lbl">RÄTSEL · ${esc(inh.label.toUpperCase())}${muster}</div><div class="frage">${inh.frage ? esc(inh.frage) : fehlt('Aufgabe folgt')}</div>`
}

function schritte(spiel: SpielDef): string {
  return `<ol class="steps">${spiel.schritte.map((s, i) => `<li><b>${i + 1}</b><span>${s}</span></li>`).join('')}</ol>`
}

// Gemeinsame Teil-CSS (Klassen werden je Familie eingefärbt)
function teilCss(k: string, s: Stil, kartenText = '#1d1d1f'): string {
  const auf = s.aufDunkel ? '#fff' : '#1d1d1f'
  return `
.${k} .rc{font-family:RC,"Arial Narrow",sans-serif;font-weight:700}
.${k} .lbl{font-size:15px;font-weight:800;letter-spacing:3px;color:${s.akzent}}
.${k} .frage{font-size:25px;font-weight:800;line-height:1.15;margin:4px 0 0;color:${kartenText}}
.${k} .ant{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #E2E5E9;border-radius:12px;padding:9px 14px;margin-top:8px;color:#1d1d1f}
.${k} .ant .d{width:40px;height:40px;border-radius:50%;background:${s.akzent};color:${s.akzentText};font-weight:800;font-size:23px;display:flex;align-items:center;justify-content:center;flex:none}
.${k} .ant b{font-size:24px;line-height:1.1} .${k} .ant small{font-size:14px;color:#666;margin-left:auto;white-space:nowrap}
.${k} .lw{background:#fff;border:1px solid #E2E5E9;border-radius:14px;padding:12px 16px;color:#1d1d1f}
.${k} .lwl{font-size:14px;font-weight:800;letter-spacing:3px;color:${s.akzent === GOLD ? '#B07A16' : s.akzent}}
.${k} .lks{display:flex;gap:6px;margin:8px 0 6px;flex-wrap:wrap} .${k} .lk{width:34px;height:40px;border:2.5px solid ${s.akzent === GOLD ? NAVY : s.akzent};border-radius:6px;background:#fff}
.${k} .lwh{font-size:15px;color:#555}
.${k} table.gp{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden;color:#1d1d1f;display:table}
.${k} table.gp th{font-size:12px;letter-spacing:2px;color:#fff;background:${s.akzent === GOLD ? NAVY : mischen(s.akzent, '#000000', 0.3)};text-align:left;padding:7px 10px;font-weight:800}
.${k} table.gp th:nth-child(2),.${k} table.gp td.bt{text-align:right}
.${k} table.gp td{padding:4px 8px;border-bottom:1.5px solid #EEE;vertical-align:middle}
.${k} .pk{font-size:12px;font-weight:800;color:${s.akzent === GOLD ? '#B07A16' : s.akzent};letter-spacing:1px;white-space:nowrap} .${k} .an{font-size:15px;color:#555;font-weight:700;white-space:nowrap}
.${k} td.bt{font-size:30px;line-height:1;color:${s.akzent === GOLD ? NAVY : s.akzent};white-space:nowrap;font-variant-numeric:tabular-nums}
.${k} td.nrs .nr{display:block;font-size:19px;line-height:1.22} .${k} td.nrs.inl .nz{display:flex;gap:12px} .${k} td.nrs.inl .nr{display:inline-block}
.${k} .nr i{width:25px;height:25px;background:${s.akzent};color:${s.akzentText};font-size:16px}
.${k} .pr{font-size:8.6px;color:#888;line-height:1.15;margin-top:2px}
.${k} .kach{display:flex;gap:12px}
.${k} .tile.tp{flex:1;background:#fff;border:1px solid #E2E5E9;border-radius:14px;padding:10px 14px;color:#1d1d1f;display:flex;flex-direction:column}
.${k} .tile .pl{font-size:13px;font-weight:800;letter-spacing:2.5px;color:${s.akzent === GOLD ? '#B07A16' : s.akzent}}
.${k} .tile .pv{font-size:54px;line-height:1;color:${s.akzent === GOLD ? NAVY : s.akzent};text-align:right;font-variant-numeric:tabular-nums}
.${k} .tile .pt{font-size:13px;color:#555;line-height:1.2;margin-top:4px}
.${k} .tile.jp{background:${s.akzent};color:${s.akzentText}} .${k} .tile.jp .pl,.${k} .tile.jp .pv,.${k} .tile.jp .pt{color:${s.akzentText}}
.${k} .hot{background:#fff;border:1px solid #E2E5E9;border-radius:14px;padding:10px 16px;margin-top:12px;color:#1d1d1f}
.${k} .hk{font-size:13px;font-weight:800;letter-spacing:2.5px;color:${s.akzent === GOLD ? '#B07A16' : s.akzent}}
.${k} .hz{display:flex;gap:18px;flex-wrap:wrap} .${k} .hz .nr{font-size:34px;line-height:1.2}
.${k} .hz .nr i{width:34px;height:34px;font-size:21px}
.${k} .steps{font-size:17px;line-height:1.25;list-style:none;color:${auf}} .${k} .steps li{display:flex;gap:10px;margin-bottom:6px}
.${k} .steps li>b{flex:none;width:26px;height:26px;border-radius:50%;background:${s.akzent};color:${s.akzentText};display:flex;align-items:center;justify-content:center;font-size:15px}
.${k} .hw{font-size:14.5px;line-height:1.3;color:${auf};margin-top:6px} .${k} .hw b{color:${s.aufDunkel ? (s.akzent === GOLD ? GOLD : '#FFE08A') : s.akzent}}
.${k} .gq{font-size:15px;line-height:1.2;color:${auf}} .${k} .gq b{display:block;font-size:20px;color:${s.aufDunkel ? (s.akzent === GOLD ? GOLD : '#FFE08A') : s.akzent}}
.${k} .gq small{font-size:13px;opacity:.85}
.${k} .glbl{font-size:14px;font-weight:800;letter-spacing:3px;color:${s.aufDunkel ? (s.akzent === GOLD ? GOLD : '#fff') : s.akzent};display:block;margin-bottom:6px}
.${k} .gg{display:grid;gap:10px} .${k} .gz{display:flex;gap:10px;align-items:center}
.${k} .g1{display:flex;gap:18px;align-items:center} .${k} .gb{font-size:26px!important;margin:2px 0} .${k} .gzit{font-size:15px!important;display:block}
.${k} .rt{background:#fff;border-radius:18px;color:#1d1d1f}
.${k} .rtk{position:absolute;left:22px;top:18px;right:22px}
.${k} .rtf{position:absolute;left:22px;right:22px;bottom:20px;overflow:hidden;display:flex;align-items:center;justify-content:center}
.${k} .rtf>*{max-width:100%;max-height:100%}`
}

// ------------------------------------------------------------------ Familien
/** Rechte Spalte: Antworten, Preise, Schritte/Hinweis – exakt so hoch wie das Rätselfeld (oben und unten bündig),
 *  Zwischenräume gleichmäßig verteilt; läuft der Inhalt über, meldet das Prüf-Skript es (.card). */
function spalteRechts(spiel: SpielDef, a: SpielSeitenArgs, s: Stil, left: number, top: number, w: number, h: number, mitSchritten: boolean): string {
  const so = `${mitSchritten ? schritte(spiel) : ''}<div class="hw"><b>${spiel.hinweis.titel}: </b>${spiel.hinweis.text}</div>`
  return (
    `<div class="abs blk card" data-n="Antwort/Preise" style="left:${left}px;top:${top}px;width:${w}px;height:${h}px;display:flex;flex-direction:column;justify-content:space-between;gap:12px">` +
    `<div>${antworten(spiel, a.inhalt, s)}</div><div>${preise(spiel, a.z, a.inhalt)}</div><div>${so}</div></div>`
  )
}

type Familie = { css: string; inhalt: string; klasse: string; vorab: string }

const RT_KOPF = 104 // Höhe Label + Frage über dem Rätselfeld

function rFeld(spiel: SpielDef, a: SpielSeitenArgs, left: number, top: number, w: number, h: number, akzent: string): { css: string; html: string } {
  const box = { w: w - 44, h: h - RT_KOPF - 20 - 18 }
  const r = spiel.raetsel({ z: a.z, inhalt: a.inhalt, akzent, vorschlag: a.vorschlag, box, pfad: a.pfad })
  return {
    css: r.css,
    html:
      `<div class="abs blk rt card" data-n="Rätsel" style="left:${left}px;top:${top}px;width:${w}px;height:${h}px">` +
      `<div class="rtk">${frageKopf(a.inhalt)}</div><div class="rtf" style="height:${box.h}px">${r.html}</div></div>`,
  }
}

function familieA(spiel: SpielDef, a: SpielSeitenArgs): Familie {
  const s: Stil = { akzent: GOLD, akzentText: NAVY, aufDunkel: true }
  const k = 'sa'
  const rf = rFeld(spiel, a, 48, 250, 880, 640, GOLD)
  const css =
    `.${k}{background:radial-gradient(120% 90% at 85% 0%,#1F3A6E 0%,${NAVY} 55%,#08122A 100%)}
.${k} .kick{color:${GOLD};font-weight:800;letter-spacing:4px;font-size:20px}
.${k} .hl{font-size:104px;line-height:.92;letter-spacing:-1px;background:linear-gradient(180deg,#FFE7A3 0%,${GOLD} 45%,#C8902A 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.${k} .sub{color:#fff;font-size:30px;font-weight:300;margin-top:8px} .${k} .sub b{color:${GOLD};font-weight:800}
.${k} .rt .lbl{color:#B07A16}` + teilCss(k, s) + rf.css
  const kopf = `<div class="abs blk" data-n="Kopf" style="left:48px;top:28px;width:880px"><div class="kick">GEWINNSPIEL · ${a.inhalt.tag}. SPIELTAG</div>
  <div class="hl rc">${spiel.titel}</div><div class="sub">${kopfText(spiel)}</div></div>`
  const gew = `<div class="abs blk" data-n="Gewinner" style="left:960px;top:30px;width:567px;height:196px;display:flex;flex-direction:column;justify-content:center">${gewinner(spiel, a.z, a.inhalt, a.gewinner, GOLD, 64, 2)}</div>`
  const rechts = spalteRechts(spiel, a, s, 960, 250, 567, 640, spiel.mechanik.art !== 'geldpakete')
  const so = ''
  return { css, inhalt: `<div class="body">${kopf}${gew}${rf.html}${rechts}${so}</div>${tnbBand(spiel, a)}`, klasse: k, vorab: '' }
}

function familieB(spiel: SpielDef, a: SpielSeitenArgs): Familie {
  const F = a.z.farbe
  const s: Stil = { akzent: F, akzentText: '#fff', aufDunkel: false }
  const k = 'sb'
  // Geldpakete (12 Nummern) brauchen Breite: Tabelle dann über die ganze rechte Fläche unter Rätsel + Antworten
  const gp = spiel.mechanik.art === 'geldpakete'
  const rf = rFeld(spiel, a, 556, 30, 560, gp ? 450 : 700, F)
  const css =
    `.${k}{background:#fff} .${k} .colbg{position:absolute;left:0;top:0;background:${F}}
.${k} .hl{font-size:84px;line-height:.9;color:#fff;letter-spacing:-1px}
.${k} .kick{font-size:17px;font-weight:800;letter-spacing:3px;color:#fff;opacity:.85}
.${k} .sub{font-size:26px;line-height:1.15;margin-top:12px;font-weight:300;color:#fff} .${k} .sub b{font-weight:800}
.${k} .rt{border:1.5px solid #E2E5E9}
.${k} .tband{border-top:6px solid ${F}}
.${k} .tile .pv{font-size:38px;white-space:nowrap} .${k} .kach{flex-wrap:wrap} .${k} .tile.tp{min-width:160px}
.${k} .col .gq,.${k} .col .glbl{color:#fff} .${k} .col .gq b{color:#fff}` + teilCss(k, s) + rf.css
  const spalte =
    `<div class="abs" style="left:0;top:0;width:520px;height:${BODY_H}px">` +
    `<div class="abs blk" data-n="Titel" style="left:40px;top:38px;width:450px"><div class="kick">GEWINNSPIEL · ${a.inhalt.tag}. SPIELTAG</div>` +
    `<div class="hl rc" style="margin-top:8px">${spiel.titel}</div><div class="sub">${kopfText(spiel)}</div></div>` +
    `<div class="abs blk col" data-n="Gewinner" style="left:40px;bottom:30px;width:450px">${gewinner(spiel, a.z, a.inhalt, a.gewinner, '#fff', 74, 2)}</div></div>`
  const rechts = gp
    ? `<div class="abs blk card" data-n="Antwort" style="left:1140px;top:30px;width:395px;height:450px;display:flex;flex-direction:column;justify-content:space-between;gap:12px">` +
      `<div>${antworten(spiel, a.inhalt, s)}</div><div class="hw"><b>${spiel.hinweis.titel}: </b>${spiel.hinweis.text}</div></div>` +
      `<div class="abs blk card" data-n="Preise" style="left:556px;top:500px;width:979px;height:392px">${preise(spiel, a.z, a.inhalt)}</div>`
    : `<div class="abs blk card" data-n="Antwort/Preise" style="left:1140px;top:30px;width:395px;height:700px;display:flex;flex-direction:column;justify-content:space-between;gap:12px">` +
      `<div>${antworten(spiel, a.inhalt, s)}</div><div>${preise(spiel, a.z, a.inhalt, true)}</div></div>`
  const so = gp
    ? ''
    : `<div class="abs blk" data-n="Schritte" style="left:556px;top:748px;width:979px;height:144px;display:flex;flex-direction:column;justify-content:space-between">${schritte(spiel)}<div class="hw"><b>${spiel.hinweis.titel}: </b>${spiel.hinweis.text}</div></div>`
  return {
    css: css + `\n.${k} .steps{display:grid;grid-template-columns:repeat(${spiel.schritte.length},1fr);gap:12px} .${k} .steps li{margin:0}`,
    inhalt: `<div class="body">${spalte}${rf.html}${rechts}${so}</div>${tnbBand(spiel, a)}`,
    klasse: k,
    vorab: '<div class="colbg"></div>',
  }
}

function familieC(spiel: SpielDef, a: SpielSeitenArgs): Familie {
  const F = a.z.farbe
  const HELL = mischen(F, '#FFFFFF', 0.22)
  const DUNKEL = mischen(F, '#000000', 0.3)
  const s: Stil = { akzent: F, akzentText: '#fff', aufDunkel: true }
  const k = 'sc'
  const rf = rFeld(spiel, a, 44, 250, 884, 640, F)
  const css =
    `.${k}{background:linear-gradient(160deg,${HELL} 0%,${F} 50%,${DUNKEL} 100%)}
.${k} .hl{font-size:104px;line-height:.9;color:#fff;letter-spacing:-1px}
.${k} .kick{font-size:19px;font-weight:800;letter-spacing:3px;color:#fff}
.${k} .sub{font-size:30px;color:#fff;margin-top:8px} .${k} .sub b{background:#fff;color:${F};padding:0 10px;border-radius:6px}
.${k} .rt{border:1.5px solid rgba(255,255,255,.35)}` + teilCss(k, s) + rf.css
  const kopf = `<div class="abs blk" data-n="Kopf" style="left:44px;top:30px;width:884px"><div class="kick">GEWINNSPIEL · ${a.inhalt.tag}. SPIELTAG</div>
  <div class="hl rc" style="margin-top:4px">${spiel.titel}</div><div class="sub">${kopfText(spiel)}</div></div>`
  const gew = `<div class="abs blk" data-n="Gewinner" style="left:960px;top:30px;width:570px;height:196px;display:flex;flex-direction:column;justify-content:center">${gewinner(spiel, a.z, a.inhalt, a.gewinner, '#fff', 64, 2)}</div>`
  const rechts = spalteRechts(spiel, a, s, 960, 250, 570, 640, spiel.mechanik.art !== 'geldpakete')
  const so = ''
  return { css, inhalt: `<div class="body">${kopf}${gew}${rf.html}${rechts}${so}</div>${tnbBand(spiel, a)}`, klasse: k, vorab: '' }
}

const FAMILIEN = { A: familieA, B: familieB, C: familieC } as const

// ------------------------------------------------------------------ Seiten
export function spielSeite(a: SpielSeitenArgs): string {
  const [wmm, hmm] = a.z.format
  const H = pyRound((W * hmm) / wmm)
  const { css, inhalt, klasse, vorab } = FAMILIEN[a.vorschlag](a.spiel, a)
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${a.spiel.name} ${a.z.id} ${a.monat} ST${a.inhalt.tag} ${a.vorschlag} ${a.gewinner}</title>
<style>${basisCss(a.pfad)}${css}</style></head><body>
<div class="ad ${klasse}" id="ad" data-name="${a.z.id}" data-h="${H}" data-wmm="${wmm}" data-hmm="${hmm}" style="height:${H}px">${vorab}${inhalt}</div>
${a.inline ? '<script>window.__VORSCHAU=1</script>' : ''}${FIT_JS}</body></html>`
}

/** Prüfseite: viele Anzeigen eines Spiels + Prüftabelle oben */
export function spielPruefseite(liste: SpielSeitenArgs[], pfad: PfadFn): string {
  const cssAll = [basisCss(pfad)]
  const ads: string[] = []
  liste.forEach((a, n) => {
    const [wmm, hmm] = a.z.format
    const H = pyRound((W * hmm) / wmm)
    const { css, inhalt, klasse, vorab } = FAMILIEN[a.vorschlag](a.spiel, { ...a, pfad })
    cssAll.push(css.split('.' + klasse + ' ').join(`#ad${n} `).split('.' + klasse + '{').join(`#ad${n}{`))
    ads.push(
      `<div class="zelle"><div class="ad ${klasse}" id="ad${n}" data-name="${a.spiel.id} · ${a.z.id} · ST${a.inhalt.tag} · ${a.vorschlag} · ${a.gewinner} Gew. · ${wmm}x${hmm}" data-h="${H}" data-wmm="${wmm}" style="height:${H}px">${vorab}${inhalt}</div></div>`,
    )
  })
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Prüfseite</title><style>${cssAll.join('')}
body{font-family:Arial,sans-serif;padding:10px;background:#ddd} #bericht{border-collapse:collapse;font-size:13px;margin-bottom:12px;background:#fff} #bericht td,#bericht th{border:1px solid #bbb;padding:3px 6px;text-align:left}
#zoom{display:grid;grid-template-columns:repeat(3,${W}px);gap:40px} .zelle .ad{box-shadow:0 0 0 3px #999}</style></head><body>
<table id="bericht"></table><div id="zoom">${ads.join('')}</div>${FIT_JS}</body></html>`
}

export function spielDateiname(spiel: SpielDef, z: Zeitung, monat: string, inh: Inhalt, v: Vorschlag, g: GewinnerAnzahl): string {
  const [wmm, hmm] = z.format
  const dd = inh.datum.slice(8, 10) + '-' + inh.datum.slice(5, 7)
  const name = spiel.name.replace(/&/g, 'und').replace(/[^A-Za-z0-9ÄÖÜäöüß]+/g, '-').replace(/^-|-$/g, '')
  return `${name}_${monat}_ST${pad2(inh.tag)}_${dd}_${z.id}_${v}_${g}-Gewinner_${wmm}x${hmm}`
}
