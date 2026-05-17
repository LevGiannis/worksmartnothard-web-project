import React, { useEffect, useState } from 'react'

const SCHEDULE: Record<number, { h: number; m: number }> = {
  1: { h: 15, m: 20 },
  2: { h: 20, m: 55 },
  3: { h: 15, m: 20 },
  4: { h: 20, m: 55 },
  5: { h: 20, m: 55 },
  6: { h: 15, m: 20 },
}

function getNextBackup(): Date {
  const now = new Date()
  for (let i = 0; i < 8; i++) {
    const candidate = new Date(now)
    candidate.setDate(now.getDate() + i)
    const slot = SCHEDULE[candidate.getDay()]
    if (!slot) continue
    candidate.setHours(slot.h, slot.m, 0, 0)
    if (candidate > now) return candidate
  }
  // fallback: next Monday 15:20
  const fallback = new Date(now)
  fallback.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7))
  fallback.setHours(15, 20, 0, 0)
  return fallback
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'τώρα'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

export default function BackupCountdown() {
  const [remaining, setRemaining] = useState(() => getNextBackup().getTime() - Date.now())

  useEffect(() => {
    const tick = () => {
      const diff = getNextBackup().getTime() - Date.now()
      setRemaining(diff)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const isImminent = remaining < 5 * 60 * 1000 // < 5 min

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 10px',
      borderRadius: 999,
      background: isImminent
        ? 'linear-gradient(90deg, rgba(124,58,237,0.35), rgba(124,58,237,0.20))'
        : 'rgba(255,255,255,0.04)',
      border: `1px solid ${isImminent ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`,
      backdropFilter: 'blur(8px)',
      fontSize: '0.78rem',
      color: isImminent ? '#c4b5fd' : 'rgba(255,255,255,0.55)',
      fontVariantNumeric: 'tabular-nums',
      transition: 'background 600ms ease, border-color 600ms ease, color 600ms ease',
      pointerEvents: 'none',
    }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {formatCountdown(remaining)}
    </div>
  )
}
