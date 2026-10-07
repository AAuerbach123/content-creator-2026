// Nachbearbeitung der von pptxgenjs erzeugten PPTX (Pendant zu _quellen_loop_2026-10/praesentation/gsp2027_anim.py).
// Setzt OHNE_ANIM-Semantik: keine Klick-Animationen, aber Fade-Folienübergang + eindeutige p:cNvPr-IDs je Folie
// (Lehre aus gsp2027_anim.py – PowerPoint braucht pro Folie eindeutige Shape-IDs, sonst spielen Nachbearbeitungen
// Hyperlinks nicht sauber ab).

import JSZip from 'jszip'

const UEBERGANG = '<p:transition spd="med"><p:fade/></p:transition>'

/** Nummeriert alle `<p:cNvPr id="…">`-IDs innerhalb einer Folie neu durch (startet bei 2). */
function idsEindeutig(xml: string): string {
  let zaehler = 1
  return xml.replace(/(<p:cNvPr )id="\d+"/g, () => {
    zaehler += 1
    return `$1id="${zaehler}"`.replace('$1', '<p:cNvPr ')
  })
}

/** Fügt den Fade-Übergang in jede Folie ein und sorgt für eindeutige IDs. Keine Klick-Animationen (OHNE_ANIM). */
export async function nachbearbeiten(pptx: Uint8Array): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(pptx)
  const slides = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
  for (const name of slides) {
    const original = await zip.file(name)!.async('string')
    let xml = idsEindeutig(original)
    // Übergang eintragen – nach </p:clrMapOvr> oder sonst vor </p:sld>
    if (xml.includes('</p:clrMapOvr>')) xml = xml.replace('</p:clrMapOvr>', '</p:clrMapOvr>' + UEBERGANG)
    else xml = xml.replace('</p:sld>', UEBERGANG + '</p:sld>')
    zip.file(name, xml)
  }
  const buf = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
  return buf
}
