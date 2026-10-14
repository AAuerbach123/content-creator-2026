// Gemeinsame Inline-Stile der Seite /serie (Telemedia-Logofarben, weißer Grund).
import type { CSSProperties } from 'react'

export const ROT = '#C8102E'
export const DUNKELROT = '#9E0B22'
export const HELLGRAU = '#D2D4DC'
export const TEXT = '#1d1d1f'
export const GRAU_TEXT = '#6E7380'

export const karte: CSSProperties = {
  background: '#ffffff',
  border: `1px solid ${HELLGRAU}`,
  borderRadius: 10,
  padding: 16,
  minWidth: 0,
}

export const kartenTitel: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: '0 0 10px',
  fontSize: 15,
  fontWeight: 700,
  color: TEXT,
}

export const label: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: GRAU_TEXT,
  margin: '10px 0 4px',
}

export const eingabe: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '7px 9px',
  border: `1px solid ${HELLGRAU}`,
  borderRadius: 6,
  fontSize: 13,
  fontFamily: 'inherit',
  color: TEXT,
  background: '#fff',
  minWidth: 0,
}

export const knopfPrimaer: CSSProperties = {
  background: ROT,
  color: '#fff',
  border: `1px solid ${ROT}`,
  borderRadius: 6,
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

export const knopf: CSSProperties = {
  background: '#fff',
  color: TEXT,
  border: `1px solid ${HELLGRAU}`,
  borderRadius: 6,
  padding: '7px 12px',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

export const knopfKlein: CSSProperties = { ...knopf, padding: '4px 9px', fontSize: 12 }

export const gesperrt: CSSProperties = { opacity: 0.45, cursor: 'not-allowed' }

export function segment(aktiv: boolean): CSSProperties {
  return {
    ...knopf,
    padding: '6px 12px',
    background: aktiv ? DUNKELROT : '#fff',
    color: aktiv ? '#fff' : TEXT,
    borderColor: aktiv ? DUNKELROT : HELLGRAU,
    fontWeight: aktiv ? 700 : 400,
  }
}

export const hinweisGelb: CSSProperties = {
  background: '#FFF8DB',
  border: '1px solid #F2D46B',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 12,
  color: '#5b4500',
}

export const hinweisRot: CSSProperties = {
  background: '#FDECEE',
  border: `1px solid ${ROT}`,
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 12,
  color: DUNKELROT,
}
