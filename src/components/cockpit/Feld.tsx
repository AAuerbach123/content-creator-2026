'use client'

import { useId, type ChangeEvent, type ReactNode } from 'react'

type Basis = {
  label: string
  hilfe?: string
  fehler?: string
  zaehler?: { ist: number; max: number }
  pflicht?: boolean
}

type TextProps = Basis & {
  art: 'text' | 'number' | 'date' | 'email'
  wert: string
  onAendern: (wert: string) => void
  platzhalter?: string
}

type AreaProps = Basis & {
  art: 'textarea'
  wert: string
  onAendern: (wert: string) => void
  platzhalter?: string
  zeilen?: number
}

type SelectProps = Basis & {
  art: 'select'
  wert: string
  onAendern: (wert: string) => void
  optionen: Array<{ wert: string; name: string }>
}

type KinderProps = Basis & {
  art: 'eigen'
  children: ReactNode
}

type Props = TextProps | AreaProps | SelectProps | KinderProps

export default function Feld(props: Props) {
  const id = useId()
  const hinweisId = `${id}-hinweis`
  const fehlerId = `${id}-fehler`
  const zaehlerUeberschritten = props.zaehler ? props.zaehler.ist > props.zaehler.max : false
  const fehlerAktiv = Boolean(props.fehler) || zaehlerUeberschritten
  const klasse = `cockpit-feld${fehlerAktiv ? ' fehler' : ''}`

  const gemeinsameAria = {
    id,
    'aria-describedby': [props.hilfe ? hinweisId : null, fehlerAktiv ? fehlerId : null].filter(Boolean).join(' ') || undefined,
    'aria-invalid': fehlerAktiv || undefined,
    'aria-required': props.pflicht || undefined,
  }

  return (
    <div className={klasse}>
      <label htmlFor={id}>
        {props.label}
        {props.pflicht && <span aria-hidden style={{ color: 'var(--tm-rot)', marginLeft: 4 }}>*</span>}
      </label>
      {props.art === 'text' || props.art === 'number' || props.art === 'date' || props.art === 'email' ? (
        <input
          type={props.art}
          value={props.wert}
          placeholder={props.platzhalter}
          onChange={(e: ChangeEvent<HTMLInputElement>) => props.onAendern(e.target.value)}
          {...gemeinsameAria}
        />
      ) : props.art === 'textarea' ? (
        <textarea
          value={props.wert}
          placeholder={props.platzhalter}
          rows={props.zeilen ?? 3}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => props.onAendern(e.target.value)}
          {...gemeinsameAria}
        />
      ) : props.art === 'select' ? (
        <select
          value={props.wert}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => props.onAendern(e.target.value)}
          {...gemeinsameAria}
        >
          {props.optionen.map((o) => (
            <option key={o.wert} value={o.wert}>{o.name}</option>
          ))}
        </select>
      ) : props.art === 'eigen' ? (
        <div {...gemeinsameAria}>{props.children}</div>
      ) : null}
      {props.hilfe && !fehlerAktiv && <span id={hinweisId} className="hinweis">{props.hilfe}</span>}
      {props.zaehler && (
        <span className="zaehler" aria-live="polite">
          {props.zaehler.ist} / {props.zaehler.max}
        </span>
      )}
      {fehlerAktiv && (
        <span id={fehlerId} className="fehlertext" role="alert">
          {props.fehler ?? `Noch ${props.zaehler!.ist - props.zaehler!.max} Zeichen zu lang`}
        </span>
      )}
    </div>
  )
}
