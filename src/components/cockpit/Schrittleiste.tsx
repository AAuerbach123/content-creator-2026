'use client'

export type Schritt = { nr: string; name: string; angelegt?: boolean }

type Props = {
  schritte: Schritt[]
  aktiv: number
  onWechsel?: (index: number) => void
  beschriftung?: string
}

export default function Schrittleiste({ schritte, aktiv, onWechsel, beschriftung }: Props) {
  return (
    <nav aria-label={beschriftung ?? 'Schritte'}>
      <ol className="cockpit-stepper">
        {schritte.map((s, i) => (
          <li key={s.nr}>
            <button
              type="button"
              className={i === aktiv ? 'aktiv' : ''}
              aria-current={i === aktiv ? 'step' : undefined}
              onClick={() => onWechsel?.(i)}
            >
              <span className="nr">Phase {s.nr}</span>
              <span className="name">{s.name}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
