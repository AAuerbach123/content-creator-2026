// Die 17 Stil-Presets aus dem Ad-Creator, motiv-neutral und full-bleed (Regel 10).
// Übernommen aus ~/Desktop/wissensquiz/app/page.tsx (IMAGE_STYLE_PRESETS).
//
// preferredModel: undefined heißt „nutze die Standard-Kette gpt-image-2 → 1.5 → 1".
// styleHint: derzeit nicht mehr an der OpenAI-API — reserviert für spätere DALL-E-3-Kompatibilität.

const STYLE_FULLBLEED_RULE = `Render exactly as described. CRITICAL: the image must cover the ENTIRE canvas edge to edge — no margins, no empty borders, no vignette.`

const STYLE_ONLY_SUBJECT_RULE = `Depict ONLY the subject described below in its natural, typical setting — do NOT add animals, people or other subjects that are not part of the description. The subject is`

const STYLE_COMMON_SUFFIX = `shown in the centre of the frame as a WIDE LANDSCAPE SHOT, fully visible with comfortable margin, never cropped. FULL-BLEED: the scene fills the entire canvas edge to edge — no margins, no empty bands, no vignette.`

const PHOTO_CARD_STYLE = `PROFESSIONAL NATURE / EDITORIAL PHOTOGRAPHY in the subject's natural environment. Photo-real, sun-lit, natural colors, no cinematic film LUT. Wide landscape composition. FULL-BLEED: edge to edge, no vignette, no dark border.`

export type StilPreset = {
  id: string
  label: string
  instruction: string
  subjectPrefix: string
  subjectSuffix: string
  preferredModel?: string
}

export const STIL_PRESETS: StilPreset[] = [
  {
    id: 'aquarell',
    label: 'Aquarell',
    instruction: `Render exactly as described. CRITICAL: the painting must cover the ENTIRE canvas edge to edge — absolutely no white margins, no unpainted paper borders, no vignette, no empty bands at any edge. Every pixel of the canvas is painted watercolour scene.`,
    subjectPrefix:
      'A traditional hand-painted watercolour aquarelle illustration in soft, natural colours with gentle saturation. THE WHOLE PICTURE — including the main subject itself — is rendered entirely in transparent watercolour washes and visible brushstrokes, in the style of classical illustrated-book artwork. Depict ONLY the subject described below in its natural, typical setting — do NOT add animals, people or other subjects that are not part of the description. The subject is',
    subjectSuffix:
      'shown in the centre of the frame as a WIDE LANDSCAPE SHOT. COMPOSITION: the main subject is fully visible with comfortable margin — no part of it touching any edge, NEVER cropped. FULL-BLEED RULE (very important): the painted scene fills the ENTIRE canvas edge to edge — sky, water, landscape, architecture or interior continue all the way to all four borders. ABSOLUTELY NO white margins, NO unpainted borders, NO vignette fading to white at the edges, NO empty paper bands at the top or bottom — every part of the canvas is painted scene. The subject is formed by loose painterly brushstrokes and soft pigment bleeds — NOT photographic detail. COLOUR: soft, natural watercolour colours with GENTLE, restrained saturation. Still unmistakably real watercolour: transparent washes, wet-on-wet bleeds, visible cold-press paper texture shining through the paint. ABSOLUTELY NO photo-realistic rendering, NO smooth gradients, NO photographic surface textures, NO 3D rendering, NO close-up cropping, NO portrait framing.',
  },
  {
    id: 'fotorealistisch',
    label: 'Fotorealistisch',
    instruction: PHOTO_CARD_STYLE,
    subjectPrefix: 'A professional editorial photograph of',
    subjectSuffix: 'in its natural environment. ' + STYLE_COMMON_SUFFIX,
  },
  {
    id: 'ghibli',
    label: 'Studio Ghibli',
    instruction: STYLE_FULLBLEED_RULE,
    subjectPrefix:
      'A Studio Ghibli–inspired illustration with soft painterly backgrounds, diffused natural lighting, vibrant yet grounded colors, a whimsical and nostalgic mood, a hand-drawn anime aesthetic and gentle organic texture. ' +
      STYLE_ONLY_SUBJECT_RULE,
    subjectSuffix: STYLE_COMMON_SUFFIX + ' NO photo-realism, NO 3D rendering, NO text or labels.',
  },
  {
    id: 'pixar',
    label: 'Pixar (3D)',
    instruction: STYLE_FULLBLEED_RULE,
    subjectPrefix:
      'A Pixar-style 3D render with rounded friendly shapes, smooth detailed textures, cinematic soft lighting, shallow depth of field and polished character design. ' +
      STYLE_ONLY_SUBJECT_RULE,
    subjectSuffix: STYLE_COMMON_SUFFIX + ' NO photo-realism, NO text or labels.',
  },
  {
    id: 'disney',
    label: 'Disney-Animation',
    instruction: STYLE_FULLBLEED_RULE,
    subjectPrefix:
      'A Disney-style animated illustration with clean linework, soft painterly shading, warm lighting and a polished storybook animation aesthetic. ' +
      STYLE_ONLY_SUBJECT_RULE,
    subjectSuffix: STYLE_COMMON_SUFFIX + ' NO photo-realism, NO text or labels.',
  },
  {
    id: 'retroAnime',
    label: 'Retro-Anime (80er/90er)',
    instruction: STYLE_FULLBLEED_RULE,
    subjectPrefix:
      'A retro anime illustration inspired by 80s–90s cel animation with bold outlines, flat color shading, subtle grain, slightly muted tones and a nostalgic hand-painted animation feel. ' +
      STYLE_ONLY_SUBJECT_RULE,
    subjectSuffix: STYLE_COMMON_SUFFIX + ' NO photo-realism, NO 3D rendering, NO text or labels.',
  },
  {
    id: 'claymation',
    label: 'Claymation (Knete)',
    instruction: STYLE_FULLBLEED_RULE,
    subjectPrefix:
      'A claymation-style scene with hand-molded clay textures, visible imperfections, soft studio lighting, shallow depth of field and a whimsical stop-motion aesthetic. ' +
      STYLE_ONLY_SUBJECT_RULE,
    subjectSuffix: STYLE_COMMON_SUFFIX + ' NO text or labels.',
  },
  {
    id: 'filz',
    label: 'Filz-Figur',
    instruction: STYLE_FULLBLEED_RULE,
    subjectPrefix:
      'A felt-toy style scene with soft fabric textures, visible stitching, simplified shapes, muted colors and a cozy handmade craft aesthetic. ' +
      STYLE_ONLY_SUBJECT_RULE,
    subjectSuffix: STYLE_COMMON_SUFFIX + ' NO text or labels.',
  },
  {
    id: 'lego',
    label: 'Lego',
    instruction: STYLE_FULLBLEED_RULE,
    subjectPrefix:
      'A LEGO-style scene rendered entirely from interlocking plastic bricks with smooth glossy surfaces, simplified features, bright primary colors and clean studio lighting. ' +
      STYLE_ONLY_SUBJECT_RULE,
    subjectSuffix: STYLE_COMMON_SUFFIX + ' NO text or labels.',
  },
  {
    id: 'muppet',
    label: 'Muppet-Puppe',
    instruction: STYLE_FULLBLEED_RULE,
    subjectPrefix:
      'A Muppet-style puppet scene with fuzzy felt textures, visible stitching, googly expressive eyes, soft studio lighting and playful puppet-like proportions. ' +
      STYLE_ONLY_SUBJECT_RULE,
    subjectSuffix: STYLE_COMMON_SUFFIX + ' NO text or labels.',
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    instruction: STYLE_FULLBLEED_RULE,
    subjectPrefix:
      'A cyberpunk-style scene with neon lighting, high-contrast shadows, futuristic details, holographic accents, saturated blues and magentas and a gritty sci-fi atmosphere. ' +
      STYLE_ONLY_SUBJECT_RULE,
    subjectSuffix: STYLE_COMMON_SUFFIX + ' NO text or labels.',
  },
  {
    id: 'popart',
    label: 'Pop Art',
    instruction: STYLE_FULLBLEED_RULE,
    subjectPrefix:
      'A pop art style image with bold graphic shapes, high-contrast colors, halftone patterns, thick outlines and a vibrant poster-like aesthetic inspired by print art. ' +
      STYLE_ONLY_SUBJECT_RULE,
    subjectSuffix: STYLE_COMMON_SUFFIX + ' NO photo-realism, NO text or labels.',
  },
  {
    id: 'bauhaus',
    label: 'Bauhaus',
    instruction: STYLE_FULLBLEED_RULE,
    subjectPrefix:
      'A Bauhaus-inspired design with geometric forms, minimal ornamentation, flat color fields, strong contrast and a functional modernist aesthetic. ' +
      STYLE_ONLY_SUBJECT_RULE,
    subjectSuffix: STYLE_COMMON_SUFFIX + ' NO photo-realism, NO text or labels.',
  },
  {
    id: 'jugendstil',
    label: 'Art Nouveau (Jugendstil)',
    instruction: STYLE_FULLBLEED_RULE,
    subjectPrefix:
      'An Art Nouveau–inspired illustration with flowing organic lines, decorative patterns, elegant curves, muted jewel tones and an ornamental poster-like look. ' +
      STYLE_ONLY_SUBJECT_RULE,
    subjectSuffix: STYLE_COMMON_SUFFIX + ' NO photo-realism, NO text or labels.',
  },
  {
    id: 'tusche',
    label: 'Tuschemalerei (chinesisch)',
    instruction: STYLE_FULLBLEED_RULE,
    subjectPrefix:
      'A traditional Chinese ink painting with expressive brushwork, limited ink washes, visible paper texture, soft gradients and a calm, poetic atmosphere. ' +
      STYLE_ONLY_SUBJECT_RULE,
    subjectSuffix: STYLE_COMMON_SUFFIX + ' NO photo-realism, NO text or labels.',
  },
  {
    id: 'wesAnderson',
    label: 'Wes Anderson',
    instruction: STYLE_FULLBLEED_RULE,
    subjectPrefix:
      'A Wes Anderson–inspired photograph with symmetrical framing, a centered subject, pastel color palettes, soft even lighting and a whimsical storybook aesthetic. ' +
      STYLE_ONLY_SUBJECT_RULE,
    subjectSuffix: STYLE_COMMON_SUFFIX + ' NO text or labels.',
  },
  {
    id: 'charlieLola',
    label: 'Charlie & Lola (Kinderbuch)',
    instruction: STYLE_FULLBLEED_RULE,
    subjectPrefix:
      "A Charlie and Lola–inspired children's book illustration with collage-like textures, hand-drawn scribbles, uneven outlines, pastel colors and a playful childlike aesthetic. " +
      STYLE_ONLY_SUBJECT_RULE,
    subjectSuffix: STYLE_COMMON_SUFFIX + ' NO photo-realism, NO text or labels.',
  },
]

export function stilById(id: string): StilPreset | undefined {
  return STIL_PRESETS.find((p) => p.id === id)
}

// Baut den Endsprompt aus Motiv + Preset.
export function stilPromptBauen(preset: StilPreset, motiv: string): string {
  const subject = `${preset.subjectPrefix} ${motiv.trim()} ${preset.subjectSuffix}`
  return `${subject}\n\nSTYLE REQUIREMENTS:\n${preset.instruction}`
}
