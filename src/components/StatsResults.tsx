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
  onDelete: (entry: DailyEntry) => void
}

interface KpiProps { title: string; value: number; decimals: number; accent: string; icon: React.ReactNode }

function KpiCard({ title, value, decimals, accent, icon }: KpiProps) {
  return (
    <div style={{ flex: 1, minWidth: 140, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 12, right: 14, opacity: 0.15 }}>{icon}</div>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: accent, lineHeight: 1 }}>
        <AnimatedNumber value={value} decimals={decimals} />
      </div>
    </div>
  )
}

export default function StatsResults({ totalPoints, totalEntries, avgPerPeriod, totalRantevou, visible, showEntries, onEdit, onDelete }: Props) {
  return (
    <section className="panel-card" style={{ width: '100%', padding: 24, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 3v18h18" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M7 14v-3M12 18v-8M17 10V7" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)' }}>Σύνοψη</div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: showEntries ? 20 : 0 }}>
        <KpiCard
          title="Σύνολο γραμμών"
          value={totalPoints}
          decimals={2}
          accent="#c4b5fd"
          icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20" stroke="white" strokeWidth="2"/></svg>}
        />
        <KpiCard
          title="Καταχωρήσεις"
          value={totalEntries}
          decimals={0}
          accent="#6ee7b7"
          icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="white" strokeWidth="2"/></svg>}
        />
        <KpiCard
          title="Μέσο ανά περίοδο"
          value={avgPerPeriod}
          decimals={2}
          accent="#67e8f9"
          icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M3 12h18" stroke="white" strokeWidth="2"/></svg>}
        />
        <KpiCard
          title="Ραντεβού (€)"
          value={totalRantevou}
          decimals={2}
          accent="#fcd34d"
          icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2"/></svg>}
        />
      </div>

      {showEntries && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Λίστα εγγραφών</div>
            <div style={{ padding: '2px 10px', borderRadius: 999, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)', fontSize: '0.75rem', fontWeight: 700, color: '#c4b5fd' }}>{visible.length}</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Ημερομηνία','Κατηγορία','Υποτύπος','Αρ. Παραγ.','Πελάτης','ΑΦΜ','Μονάδες',''].map((h, i) => (
                    <th key={i} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px 10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>{new Date(e.date).toLocaleString('el-GR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: '8px 10px', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>{e.category}</td>
                    <td style={{ padding: '8px 10px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>{e.homeType || '—'}</td>
                    <td style={{ padding: '8px 10px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>{e.orderNumber || '—'}</td>
                    <td style={{ padding: '8px 10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>{e.customerName || '—'}</td>
                    <td style={{ padding: '8px 10px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>{e.afm || '—'}</td>
                    <td style={{ padding: '8px 10px', fontSize: '0.88rem', fontWeight: 700, color: '#c4b5fd', textAlign: 'right' }}>{formatNumber(e.points || 0, 2)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn-ghost" onClick={() => onEdit(e)} style={{ fontSize: '0.75rem', padding: '4px 10px' }}>Επεξεργασία</button>
                      <button
                        onClick={() => onDelete(e)}
                        style={{ marginLeft: 6, fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: 'rgba(239,68,68,0.7)', cursor: 'pointer' }}
                      >Διαγραφή</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>Δεν βρέθηκαν εγγραφές για αυτά τα κριτήρια.</div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
