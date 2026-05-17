import React, { useMemo, useState } from 'react'
import { DailyEntry } from '../services/storage'
import Modal from './Modal'
import { formatNumber } from '../utils/formatNumber'

interface ProgressRow { category: string; target: number; achieved: number }

interface Props {
  progress: ProgressRow[]
  month: number
  year: number
  entries: DailyEntry[]
  mode: string
}

export default function MonthProgress({ progress, month, year, entries, mode }: Props) {
  const [monthView, setMonthView] = useState<'percent' | 'table'>('percent')
  const [drillCategory, setDrillCategory] = useState<string | null>(null)

  const drillEntries = useMemo(() => {
    if (!drillCategory || mode !== 'month') return []
    return entries.filter(e => {
      if (!e.category || String(e.category).trim() !== drillCategory) return false
      const d = new Date(e.date)
      return d.getFullYear() === year && (d.getMonth() + 1) === month
    })
  }, [drillCategory, entries, year, month, mode])

  if (mode !== 'month' || progress.length === 0) return null

  return (
    <div className="panel-card mb-4">
      <h3 className="font-semibold mb-2">Στόχοι ανά κατηγορία ({month}/{year})</h3>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" className={monthView === 'percent' ? 'btn' : 'btn-ghost'} onClick={() => setMonthView('percent')}>
          Ποσοστά
        </button>
        <button type="button" className={monthView === 'table' ? 'btn' : 'btn-ghost'} onClick={() => setMonthView('table')}>
          Πίνακας
        </button>
      </div>

      {monthView === 'percent' ? (
        <div className="stats-panel" aria-label="Ποσοστά επιτυχίας ανά κατηγορία">
          <div>
            {progress.map(row => {
              const pct = row.target > 0 ? Math.round((row.achieved / row.target) * 100) : 0
              const pctClamped = Math.max(0, Math.min(100, pct))
              return (
                <div
                  key={row.category}
                  className="stat-row"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setDrillCategory(row.category)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setDrillCategory(row.category) }}
                >
                  <div className="stat-donut">
                    <svg width="56" height="56" viewBox="0 0 36 36" className="donut-shadow" aria-hidden>
                      <circle className="donut-bg" cx="18" cy="18" r="15.9155" fill="none" strokeWidth="3" />
                      <circle
                        className="donut-fg"
                        cx="18" cy="18" r="15.9155"
                        fill="none" strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={`${pctClamped} ${100 - pctClamped}`}
                        transform="rotate(-90 18 18)"
                      />
                      <text x="18" y="20" textAnchor="middle" fontSize="6.5" fill="#fff">{pctClamped}%</text>
                    </svg>
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">{row.category}</div>
                    <div className="stat-sub">{formatNumber(row.achieved || 0, 2)} / {formatNumber(row.target || 0, 2)} ({pctClamped}%)</div>
                    <div className="stat-bar" role="progressbar" aria-valuenow={pctClamped} aria-valuemin={0} aria-valuemax={100}>
                      <div className="fill" style={{ width: `${pctClamped}%` }} />
                    </div>
                  </div>
                  <div className="stat-percent">{pctClamped}%</div>
                </div>
              )
            })}
          </div>
          <div className="muted text-xs" style={{ marginTop: 10 }}>Tip: πάτα σε κατηγορία για drill-down εγγραφές.</div>
        </div>
      ) : (
        <table className="stats-table">
          <thead>
            <tr className="muted text-xs" style={{ textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Κατηγορία</th>
              <th style={{ padding: '8px 12px' }}>Στόχος</th>
              <th style={{ padding: '8px 12px' }}>Επίτευξη</th>
            </tr>
          </thead>
          <tbody>
            {progress.map(row => (
              <tr key={row.category} style={{ cursor: 'pointer' }} onClick={() => setDrillCategory(row.category)}>
                <td style={{ padding: '8px 12px', textDecoration: 'underline' }}>{row.category}</td>
                <td style={{ padding: '8px 12px' }}>{formatNumber(row.target, 2)}</td>
                <td style={{ padding: '8px 12px' }}>{formatNumber(row.achieved, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {drillCategory && (
        <Modal isOpen={!!drillCategory} onClose={() => setDrillCategory(null)}>
          <div style={{ maxWidth: 600 }}>
            <h3 className="font-semibold mb-2">Εγγραφές για "{drillCategory}" ({month}/{year})</h3>
            {drillEntries.length === 0 ? (
              <div className="muted">Δεν βρέθηκαν εγγραφές.</div>
            ) : (
              <table className="stats-table">
                <thead>
                  <tr className="muted text-xs" style={{ textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Ημερομηνία</th>
                    <th style={{ padding: '8px 12px' }}>Πελάτης</th>
                    <th style={{ padding: '8px 12px' }}>Παραγγελία</th>
                    <th style={{ padding: '8px 12px' }}>Ποσότητα</th>
                  </tr>
                </thead>
                <tbody>
                  {drillEntries.map(e => (
                    <tr key={e.id}>
                      <td style={{ padding: '8px 12px' }}>{e.date ? e.date.slice(0, 10) : ''}</td>
                      <td style={{ padding: '8px 12px' }}>{e.customerName || ''}</td>
                      <td style={{ padding: '8px 12px' }}>{e.orderNumber || ''}</td>
                      <td style={{ padding: '8px 12px' }}>{formatNumber(e.points || 0, 2)}</td>
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
