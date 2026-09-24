'use client'

import { useEffect, useState } from 'react'
import { tabGuardStarten } from '@/lib/tabguard'

export default function TabGuardBanner() {
  const [fremderTab, setFremderTab] = useState(false)

  useEffect(() => tabGuardStarten(setFremderTab), [])

  if (!fremderTab) return null

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '12px 20px',
        background: '#7f1d1d',
        color: '#fee2e2',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontSize: 14,
        textAlign: 'center',
        borderBottom: '1px solid #b91c1c',
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      }}
    >
      ⚠ ContentCreator2026 ist bereits in einem anderen Tab dieses Browsers geöffnet.
      Bitte schließe den anderen Tab, um Datenkonflikte zu vermeiden.
    </div>
  )
}
