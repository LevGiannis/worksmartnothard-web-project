import React, { useEffect, useMemo, useState } from 'react'
import { DailyEntry, loadAllEntries } from '../services/storage'
import PageHeader from '../components/PageHeader'
import { formatNumber } from '../utils/formatNumber'
import { useEntryForm } from '../hooks/useEntryForm'
import EntryEditModal from '../components/EntryEditModal'

export default function HistoryPage() {
  const [entries, setEntries] = useState<DailyEntry[]>([])

  const reload = async () => {
    const all = await loadAllEntries()
    setEntries(all)
  }

  const {
    editing, saving, errors,
    category, setCategory,
    points, setPoints,
    dateOnly, setDateOnly,
    homeType, setHomeType,
    orderNumber, setOrderNumber,
    customerName, setCustomerName,
    afm, setAfm,
    mobilePhone, setMobilePhone,
    landlinePhone, setLandlinePhone,
    openEdit, closeEdit, submitEdit,
  } = useEntryForm({ onSuccess: reload })

  useEffect(() => {
    reload()
    const onChange = () => { reload().catch(() => {}) }
    window.addEventListener('ws:entries-updated' as any, onChange)
    return () => window.removeEventListener('ws:entries-updated' as any, onChange)
  }, [])

  const reversed = useMemo(() => entries.slice().reverse(), [entries])

  return (
    <div style={{ padding: '28px 16px', paddingTop: '220px' }}>
      <PageHeader
        title="History"
        subtitle="Χρονολογική λίστα καταχωρήσεων"
        breadcrumb="History"
      />

      <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        <div className="panel-card" style={{ marginBottom: 20 }}>
          <h2 className="heading-xl font-extrabold" style={{ fontSize: '1.3rem', margin: 0 }}>Καταχωρήσεις</h2>
          <div className="muted" style={{ marginTop: 4 }}>Δες τις πρόσφατες ενέργειες με σειρά αναστροφής.</div>
        </div>

        <div className="grid gap-2">
          {reversed.map(e => (
            <div key={e.id} className="panel-card flex items-center justify-between" style={{ padding: '16px 18px', gap: 14 }}>
              <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                <div className="w-10 h-10 rounded-md bg-primary-50 flex items-center justify-center text-sm font-medium text-primary-700">{(e.category || 'E').charAt(0)}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="font-medium" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.category || 'Entry'}</div>
                  <div className="text-sm text-gray-500">{new Date(e.date).toLocaleDateString()}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <div className="text-sm" style={{ minWidth: 90, textAlign: 'right' }}>{formatNumber(e.points || 0, 2)} {String(e.category).toUpperCase() === 'ΡΑΝΤΕΒΟΥ' ? '€' : 'pts'}</div>
                <button className="btn-ghost" onClick={() => openEdit(e)}>Επεξεργασία</button>
              </div>
            </div>
          ))}
          {entries.length === 0 && <div className="panel-card muted">Δεν υπάρχουν καταχωρήσεις.</div>}
        </div>
      </div>

      <EntryEditModal
        editing={editing}
        saving={saving}
        errors={errors}
        category={category}
        setCategory={setCategory}
        points={points}
        setPoints={setPoints}
        dateOnly={dateOnly}
        setDateOnly={setDateOnly}
        homeType={homeType}
        setHomeType={setHomeType}
        orderNumber={orderNumber}
        setOrderNumber={setOrderNumber}
        customerName={customerName}
        setCustomerName={setCustomerName}
        afm={afm}
        setAfm={setAfm}
        mobilePhone={mobilePhone}
        setMobilePhone={setMobilePhone}
        landlinePhone={landlinePhone}
        setLandlinePhone={setLandlinePhone}
        closeEdit={closeEdit}
        submitEdit={submitEdit}
      />
    </div>
  )
}
