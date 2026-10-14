'use client'

export type Status = 'vorbereitet' | 'gewinner-fehlen' | 'raetsel-fehlt' | 'fehler' | 'freigegeben'

const KONFIG: Record<Status, { klasse: string; symbol: string; textDe: string; textEn: string }> = {
  'vorbereitet':      { klasse: 'grau',  symbol: '○', textDe: 'vorbereitet',          textEn: 'prepared' },
  'gewinner-fehlen':  { klasse: 'gelb',  symbol: '◐', textDe: 'Gewinner fehlen',      textEn: 'winners missing' },
  'raetsel-fehlt':    { klasse: 'gelb',  symbol: '◐', textDe: 'Rätsel fehlt',         textEn: 'puzzle missing' },
  'fehler':           { klasse: 'rot',   symbol: '✕', textDe: 'Fehler',               textEn: 'error' },
  'freigegeben':      { klasse: 'gruen', symbol: '✓', textDe: 'freigegeben',          textEn: 'approved' },
}

type Props = { status: Status; sprache?: 'de' | 'en' }

export default function StatusChip({ status, sprache = 'de' }: Props) {
  const k = KONFIG[status]
  return (
    <span className={`cockpit-chip ${k.klasse}`} role="status">
      <span aria-hidden>{k.symbol}</span>
      <span>{sprache === 'de' ? k.textDe : k.textEn}</span>
    </span>
  )
}
