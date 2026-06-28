
import React, { useEffect, useMemo, useState } from 'react'
import { loadAllEntries, DailyEntry, getProgressForMonth, deleteEntry } from '../services/storage'
import Modal from '../components/Modal'
import { exportEcoFriendlyExcel } from '../utils/exportExcel'
import { roundNumber } from '../utils/formatNumber'
import PageHeader from '../components/PageHeader'
import { useEntryForm } from '../hooks/useEntryForm'
import MonthProgress from '../components/MonthProgress'
import StatsFilters from '../components/StatsFilters'
import StatsResults from '../components/StatsResults'
import EntryEditModal from '../components/EntryEditModal'

export default function StatsPage() {
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [mode, setMode] = useState<'day' | 'month' | 'range'>('day')
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [dayDate, setDayDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [progress, setProgress] = useState<{ category: string; target: number; achieved: number }[]>([])
  const [categoryQuery, setCategoryQuery] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [customerFilter, setCustomerFilter] = useState('')
  const [showEntries, setShowEntries] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<DailyEntry | null>(null)
  const [deleting, setDeleting] = useState(false)

  const reload = async () => {
    const all = await loadAllEntries()
    setEntries(all || [])
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const all = await loadAllEntries()
      if (!mounted) return
      setEntries(all || [])
    })()
    const onChange = () => { reload().catch(() => {}) }
    window.addEventListener('ws:entries-updated' as any, onChange)
    return () => {
      mounted = false
      window.removeEventListener('ws:entries-updated' as any, onChange)
    }
  }, [])

  useEffect(() => {
    if (mode !== 'month') return
    getProgressForMonth(year, month).then(setProgress)
  }, [mode, year, month])

  const {
    editing, saving,
    errors: editErrors,
    category: editCategory, setCategory: setEditCategory,
    points: editPoints, setPoints: setEditPoints,
    dateOnly: editDateOnly, setDateOnly: setEditDateOnly,
    homeType: editHomeType, setHomeType: setEditHomeType,
    orderNumber: editOrderNumber, setOrderNumber: setEditOrderNumber,
    customerName: editCustomerName, setCustomerName: setEditCustomerName,
    afm: editAfm, setAfm: setEditAfm,
    mobilePhone: editMobilePhone, setMobilePhone: setEditMobilePhone,
    landlinePhone: editLandlinePhone, setLandlinePhone: setEditLandlinePhone,
    openEdit, closeEdit, submitEdit,
  } = useEntryForm({ onSuccess: reload })

  useEffect(() => {
    const set = Array.from(new Set(entries.map(e => (e.category || '').trim()).filter(Boolean)))
    set.sort()
    setCategories(set)
    if (selectedCategories.length === 0) setSelectedCategories(set)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries])

  const dateOnly = (iso: string) => {
    const s = String(iso || '')
    return s.length >= 10 ? s.slice(0, 10) : s
  }

  const visible = useMemo(() => {
    return entries.filter(e => {
      if (selectedCategories.length && !selectedCategories.includes((e.category || '').trim())) return false
      if (customerFilter && !(e.customerName || '').toLowerCase().includes(customerFilter.toLowerCase())) return false
      const d = dateOnly(e.date)
      if (mode === 'month') {
        const dt = new Date(e.date)
        if (dt.getFullYear() !== year) return false
        if (dt.getMonth() + 1 !== month) return false
      } else if (mode === 'day') {
        if (dayDate && d !== dayDate) return false
      } else {
        if (startDate && d < startDate) return false
        if (endDate && d > endDate) return false
      }
      return true
    })
  }, [entries, selectedCategories, customerFilter, mode, year, month, dayDate, startDate, endDate])

  const isRantevou = (e: DailyEntry) => String(e.category || '').trim().toUpperCase() === 'ΡΑΝΤΕΒΟΥ'

  const visibleWithoutRantevou = useMemo(() => visible.filter(e => !isRantevou(e)), [visible])

  const totalRantevouMoney = useMemo(() => visible.reduce((s, e) => (isRantevou(e) ? s + (e.points || 0) : s), 0), [visible])

  const totalPointsAll = useMemo(() => visibleWithoutRantevou.reduce((s, e) => s + (e.points || 0), 0), [visibleWithoutRantevou])

  const totalEntriesAll = visible.length

  const avgPerPeriod = useMemo(() => {
    const periods = new Set<string>()
    for (const e of visibleWithoutRantevou) {
      const d = dateOnly(e.date)
      if (d) periods.add(d)
    }
    const n = periods.size
    return n > 0 ? roundNumber(totalPointsAll / n, 2) : 0
  }, [visibleWithoutRantevou, totalPointsAll])

  const goPrevMonth = () => {
    setMonth(prev => {
      if (prev <= 1) { setYear(y => y - 1); return 12 }
      return prev - 1
    })
  }

  const goNextMonth = () => {
    setMonth(prev => {
      if (prev >= 12) { setYear(y => y + 1); return 1 }
      return prev + 1
    })
  }

  const jumpToToday = () => {
    setMode('day')
    setDayDate(new Date().toISOString().slice(0, 10))
  }

  const jumpToCurrentMonth = () => {
    const d = new Date()
    setMode('month')
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
  }

  async function downloadExcel() {
    const headers = ['Κατηγορία', 'Πελάτης', 'Αρ. Παραγγελίας', 'Ποσότητα']
    const data = visible.map(e => ({
      'Κατηγορία': e.category || '',
      'Πελάτης': e.customerName || '',
      'Αρ. Παραγγελίας': e.orderNumber || '',
      'Ποσότητα': e.points || 0,
    }))
    await exportEcoFriendlyExcel({
      data,
      filename: `entries-${new Date().toISOString().slice(0, 10)}.xlsx`,
      headers,
      sheetName: 'Εγγραφές',
      greenHeader: true,
    })
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Στατιστικά & Αναφορές"
        subtitle="Ανάλυση επιδόσεων και αναφορές ανά περίοδο"
        breadcrumb="Στατιστικά"
      />
      <div className="page-inner">
        <MonthProgress progress={progress} month={month} year={year} entries={entries} mode={mode} />

        <StatsFilters
          mode={mode} setMode={setMode}
          year={year} setYear={setYear}
          month={month} setMonth={setMonth}
          dayDate={dayDate} setDayDate={setDayDate}
          startDate={startDate} setStartDate={setStartDate}
          endDate={endDate} setEndDate={setEndDate}
          categories={categories}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          categoryQuery={categoryQuery} setCategoryQuery={setCategoryQuery}
          customerFilter={customerFilter} setCustomerFilter={setCustomerFilter}
          showEntries={showEntries} setShowEntries={setShowEntries}
          onDownloadExcel={downloadExcel}
          jumpToToday={jumpToToday}
          jumpToCurrentMonth={jumpToCurrentMonth}
          goPrevMonth={goPrevMonth}
          goNextMonth={goNextMonth}
        />

        <StatsResults
          totalPoints={totalPointsAll}
          totalEntries={totalEntriesAll}
          avgPerPeriod={avgPerPeriod}
          totalRantevou={totalRantevouMoney}
          visible={visible}
          showEntries={showEntries}
          onEdit={openEdit}
          onDelete={setPendingDelete}
        />

        <EntryEditModal
          editing={editing}
          saving={saving}
          errors={editErrors}
          category={editCategory}
          setCategory={setEditCategory}
          points={editPoints}
          setPoints={setEditPoints}
          dateOnly={editDateOnly}
          setDateOnly={setEditDateOnly}
          homeType={editHomeType}
          setHomeType={setEditHomeType}
          orderNumber={editOrderNumber}
          setOrderNumber={setEditOrderNumber}
          customerName={editCustomerName}
          setCustomerName={setEditCustomerName}
          afm={editAfm}
          setAfm={setEditAfm}
          mobilePhone={editMobilePhone}
          setMobilePhone={setEditMobilePhone}
          landlinePhone={editLandlinePhone}
          setLandlinePhone={setEditLandlinePhone}
          closeEdit={closeEdit}
          submitEdit={submitEdit}
        />
      </div>

      {pendingDelete && (
        <Modal isOpen={!!pendingDelete} onClose={() => { if (!deleting) setPendingDelete(null) }}>
          <div style={{ minWidth: 300, maxWidth: 380 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'rgba(255,255,255,0.9)', marginBottom: 10 }}>Διαγραφή εγγραφής;</div>
            <div style={{ fontSize: '0.87rem', color: 'rgba(255,255,255,0.55)', marginBottom: 6, lineHeight: 1.6 }}>
              <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{pendingDelete.category}</strong>
              {pendingDelete.customerName ? ` · ${pendingDelete.customerName}` : ''}
              {' · '}{new Date(pendingDelete.date).toLocaleDateString('el-GR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.38)', marginBottom: 20 }}>
              Η ενέργεια δεν αναιρείται. Τα στατιστικά θα ενημερωθούν αυτόματα.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true)
                  await deleteEntry(pendingDelete.id)
                  setPendingDelete(null)
                  setDeleting(false)
                }}
                style={{ flex: 1, padding: '10px 0', fontWeight: 700, borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#dc2626,#b91c1c)', color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? 'Διαγραφή...' : 'Διαγραφή εγγραφής'}
              </button>
              <button className="btn-ghost" onClick={() => setPendingDelete(null)} disabled={deleting} style={{ padding: '10px 18px' }}>Ακύρωση</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
