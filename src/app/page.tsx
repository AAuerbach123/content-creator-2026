export default function Home() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        background: '#0b0b0f',
        color: '#f5f5f7',
        padding: '2rem',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 640 }}>
        <p
          style={{
            opacity: 0.55,
            letterSpacing: '0.24em',
            fontSize: 12,
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Phase 0 · Fundament
        </p>
        <h1
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            margin: '0.75rem 0 1rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          ContentCreator2026
        </h1>
        <p style={{ opacity: 0.75, lineHeight: 1.55, margin: 0 }}>
          Das Fundament steht. Als Nächstes: IndexedDB-Stores (Jobs, Assets, Snapshots),
          App-Shell mit KI-Zentrum, DE/EN-Umschalter.
        </p>
      </div>
    </main>
  )
}
