import React, { useMemo, useState, useEffect } from 'react'
import { DailyEntry } from '../services/storage'
import Modal from './Modal'
import { formatNumber } from '../utils/formatNumber'

interface ProgressRow { category: string; target: number; achieved: number; color?: string }

interface Props {
  progress: ProgressRow[]
  month: number
  year: number
  entries: DailyEntry[]
  mode: string
}

const MONTH_NAMES = ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος','Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος']

const ACCENT_COLORS = ['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316','#6366f1']

const CAT_COLORS_KEY = 'ws_category_colors'

function loadCategoryColors(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(CAT_COLORS_KEY) || '{}') } catch { return {} }
}
function saveCategoryColors(map: Record<string, string>) {
  try { localStorage.setItem(CAT_COLORS_KEY, JSON.stringify(map)) } catch {}
}

export default function MonthProgress({ progress, month, year, entries, mode }: Props) {
  const [monthView, setMonthView] = useState<'percent' | 'table'>('percent')
  const [drillCategory, setDrillCategory] = useState<string | null>(null)
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(loadCategoryColors)

  const drillEntries = useMemo(() => {
    if (!drillCategory || mode !== 'month') return []
    return entries.filter(e => {
      if (!e.category || String(e.category).trim() !== drillCategory) return false
      const d = new Date(e.date)
      return d.getFullYear() === year && (d.getMonth() + 1) === month
    })
  }, [drillCategory, entries, year, month, mode])

  if (mode !== 'month' || progress.length === 0) return null

  const totalAchieved = progress.reduce((s, r) => s + r.achieved, 0)
  const totalTarget = progress.reduce((s, r) => s + r.target, 0)
  const overallPct = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0
  const overallClamped = Math.max(0, Math.min(100, overallPct))

  return (
    <div className="panel-card mb-4" style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" stroke="white" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)' }}>Στόχοι — {MONTH_NAMES[month - 1]} {year}</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Συνολικά: {formatNumber(totalAchieved, 2)} / {formatNumber(totalTarget, 2)} · {overallClamped}%</div>
          </div>
        </div>

        {/* View toggle */}
        <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 3, gap: 2 }}>
          {(['percent', 'table'] as const).map(v => (
            <button key={v} type="button" onClick={() => setMonthView(v)} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, border: 'none', cursor: 'pointer',
              background: monthView === v ? 'rgba(124,58,237,0.35)' : 'transparent',
              color: monthView === v ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
              transition: 'all 120ms',
            }}>
              {v === 'percent' ? 'Μπάρες' : 'Πίνακας'}
            </button>
          ))}
        </div>
      </div>

      {/* Overall progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${overallClamped}%`, background: 'linear-gradient(90deg,#7c3aed,#ff6b8a)', borderRadius: 999, transition: 'width 500ms ease' }} />
        </div>
      </div>

      {monthView === 'percent' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {progress.map((row, idx) => {
            const pct = row.target > 0 ? Math.round((row.achieved / row.target) * 100) : 0
            const pctClamped = Math.max(0, Math.min(100, pct))
            const color = categoryColors[row.category] || row.color || ACCENT_COLORS[idx % ACCENT_COLORS.length]
            return (
              <div
                key={row.category}
                role="button"
                tabIndex={0}
                onClick={() => setDrillCategory(row.category)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setDrillCategory(row.category) }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, cursor: 'pointer', transition: 'background 120ms' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.045)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
              >
                {/* Donut */}
                <svg width="48" height="48" viewBox="0 0 36 36" aria-hidden style={{ flexShrink: 0 }}>
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9155"
                    fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${pctClamped} ${100 - pctClamped}`}
                    transform="rotate(-90 18 18)"
                    style={{ transition: 'stroke-dasharray 600ms ease' }}
                  />
                  <text x="18" y="21" textAnchor="middle" fontSize="6" fill={color} fontWeight="bold">{pct}%</text>
                </svg>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <label
                      title="Αλλαγή χρώματος"
                      onClick={e => e.stopPropagation()}
                      style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: color, border: '2px solid rgba(255,255,255,0.25)', flexShrink: 0 }} />
                      <input
                        type="color"
                        value={color}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          e.stopPropagation()
                          const next = { ...categoryColors, [row.category]: e.target.value }
                          setCategoryColors(next)
                          saveCategoryColors(next)
                        }}
                      />
                    </label>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.category}</div>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pctClamped}%`, background: color, borderRadius: 999, transition: 'width 600ms ease' }} />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>
                    {formatNumber(row.achieved, 2)} / {formatNumber(row.target, 2)}
                  </div>
                </div>

                <div style={{ fontSize: '1.1rem', fontWeight: 900, color, flexShrink: 0, minWidth: 40, textAlign: 'right' }}>{pct}%</div>
              </div>
            )
          })}
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginTop: 4, textAlign: 'right' }}>Πάτα σε κατηγορία για αναλυτικές εγγραφές</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Κατηγορία','Στόχος','Επίτευξη','%'].map((h, i) => (
                  <th key={i} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {progress.map((row, idx) => {
                const pct = row.target > 0 ? Math.round((row.achieved / row.target) * 100) : 0
                const pctClamped = Math.max(0, Math.min(100, pct))
                const color = categoryColors[row.category] || row.color || ACCENT_COLORS[idx % ACCENT_COLORS.length]
                return (
                  <tr key={row.category} onClick={() => setDrillCategory(row.category)} style={{ cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '10px 12px', fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{row.category}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)' }}>{formatNumber(row.target, 2)}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)' }}>{formatNumber(row.achieved, 2)}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.9rem', fontWeight: 700, color }}>{pct}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {drillCategory && (
        <Modal isOpen={!!drillCategory} onClose={() => setDrillCategory(null)}>
          <div style={{ maxWidth: 620 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 3v18h18" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)' }}>
                {drillCategory} · {MONTH_NAMES[month - 1]} {year}
              </div>
            </div>
            {drillEntries.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '20px 0' }}>Δεν βρέθηκαν εγγραφές.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Ημερομηνία','Πελάτης','Παραγγελία','Ποσότητα'].map((h, i) => (
                      <th key={i} style={{ padding: '7px 10px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drillEntries.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px 10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }}>{e.date ? e.date.slice(0, 10) : ''}</td>
                      <td style={{ padding: '8px 10px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)' }}>{e.customerName || '—'}</td>
                      <td style={{ padding: '8px 10px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>{e.orderNumber || '—'}</td>
                      <td style={{ padding: '8px 10px', fontSize: '0.88rem', fontWeight: 700, color: '#c4b5fd', textAlign: 'right' }}>{formatNumber(e.points || 0, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
