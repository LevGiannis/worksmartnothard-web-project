import React from 'react'
import { DailyEntry } from '../services/storage'
import { formatNumber } from '../utils/formatNumber'
import AnimatedNumber from './AnimatedNumber'

interface Props {
  totalPoints: number
  totalEntries: number
  avgPerPeriod: number
  totalRantevou: number
  visible: DailyEntry[]
  showEntries: boolean
  onEdit: (entry: DailyEntry) => void
}

export default function StatsResults({ totalPoints, totalEntries, avgPerPeriod, totalRantevou, visible, showEntries, onEdit }: Props) {
  return (
    <section className="panel-card results-panel" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
        <h2 className="text-lg font-semibold mb-3">Σύνοψη</h2>
      </div>

      <div className="kpi-row" style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <div className="kpi-card">
          <div className="kpi-title">Σύνολο Γραμμών</div>
          <AnimatedNumber value={totalPoints} decimals={2} />
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Σύνολο καταχωρήσεων</div>
          <AnimatedNumber value={totalEntries} decimals={0} />
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Μέσο ανά περίοδο</div>
          <AnimatedNumber value={avgPerPeriod} decimals={2} />
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Ραντεβού (€)</div>
          <AnimatedNumber value={totalRantevou} decimals={2} />
        </div>
      </div>

      {showEntries && (
        <div className="mt-4 entries-card">
          <h3 className="font-semibold mb-2">Λίστα εγγραφών ({visible.length})</h3>
          <div style={{ overflow: 'auto' }}>
            <table className="entries-table w-full">
              <thead>
                <tr className="muted text-xs" style={{ textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Ημερομηνία</th>
                  <th style={{ padding: '6px 8px' }}>Κατηγορία</th>
                  <th style={{ padding: '6px 8px' }}>Υποτύπος</th>
                  <th style={{ padding: '6px 8px' }}>Αρ. Παραγ.</th>
                  <th style={{ padding: '6px 8px' }}>Πελάτης</th>
                  <th style={{ padding: '6px 8px' }}>ΑΦΜ</th>
                  <th style={{ padding: '6px 8px' }}>Μονάδες</th>
                  <th style={{ padding: '6px 8px' }} />
                </tr>
              </thead>
              <tbody>
                {visible.map(e => (
                  <tr key={e.id} className="border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: '6px 8px' }}>{new Date(e.date).toLocaleString()}</td>
                    <td style={{ padding: '6px 8px' }}>{e.category}</td>
                    <td style={{ padding: '6px 8px' }}>{e.homeType || '-'}</td>
                    <td style={{ padding: '6px 8px' }}>{e.orderNumber || '-'}</td>
                    <td style={{ padding: '6px 8px' }}>{e.customerName || '-'}</td>
                    <td style={{ padding: '6px 8px' }}>{e.afm || '-'}</td>
                    <td style={{ padding: '6px 8px' }}>{formatNumber(e.points || 0, 2)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn-ghost" onClick={() => onEdit(e)}>Επεξεργασία</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
