import React from 'react'

type Mode = 'day' | 'month' | 'range'

interface Props {
  mode: Mode
  setMode: (mode: Mode) => void
  year: number
  setYear: (year: number) => void
  month: number
  setMonth: (month: number) => void
  dayDate: string
  setDayDate: (date: string) => void
  startDate: string
  setStartDate: (date: string) => void
  endDate: string
  setEndDate: (date: string) => void
  categories: string[]
  selectedCategories: string[]
  setSelectedCategories: (cats: string[] | ((prev: string[]) => string[])) => void
  categoryQuery: string
  setCategoryQuery: (q: string) => void
  customerFilter: string
  setCustomerFilter: (f: string) => void
  showEntries: boolean
  setShowEntries: (show: boolean | ((prev: boolean) => boolean)) => void
  onDownloadExcel: () => void
  jumpToToday: () => void
  jumpToCurrentMonth: () => void
  goPrevMonth: () => void
  goNextMonth: () => void
}

export default function StatsFilters({
  mode, setMode,
  year, setYear,
  month, setMonth,
  dayDate, setDayDate,
  startDate, setStartDate,
  endDate, setEndDate,
  categories, selectedCategories, setSelectedCategories,
  categoryQuery, setCategoryQuery,
  customerFilter, setCustomerFilter,
  showEntries, setShowEntries,
  onDownloadExcel,
  jumpToToday, jumpToCurrentMonth,
  goPrevMonth, goNextMonth,
}: Props) {
  return (
    <div className="panel-card mb-4">
      <div className="stats-controls" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14, alignItems: 'start' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          <div>
            <label className="text-sm muted">Τρόπος αναφοράς</label>
            <div style={{ marginTop: 6 }}>
              <select className="panel-input" value={mode} onChange={e => setMode(e.target.value as Mode)}>
                <option value="day">Εγγραφές ημέρας</option>
                <option value="month">Εγγραφές μήνα</option>
                <option value="range">Χρονική περίοδος</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button type="button" className="btn-ghost" onClick={jumpToToday}>Σήμερα</button>
              <button type="button" className="btn-ghost" onClick={jumpToCurrentMonth}>Τρέχων μήνας</button>
            </div>
          </div>

          {mode === 'month' ? (
            <div>
              <label className="text-sm muted">Μήνας</label>
              <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                <button type="button" className="btn-ghost btn-icon" aria-label="Προηγούμενος μήνας" title="Προηγούμενος μήνας" onClick={goPrevMonth}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <input className="panel-input" type="number" min={2000} max={2100} value={year} onChange={e => setYear(parseInt(e.target.value || String(new Date().getFullYear())))} style={{ width: 110 }} />
                <select className="panel-input" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <button type="button" className="btn-ghost btn-icon" aria-label="Επόμενος μήνας" title="Επόμενος μήνας" onClick={goNextMonth}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
          ) : mode === 'day' ? (
            <div>
              <label className="text-sm muted">Ημερομηνία</label>
              <input className="panel-input" type="date" value={dayDate} onChange={e => setDayDate(e.target.value)} />
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm muted">Από</label>
                <input className="panel-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm muted">Έως</label>
                <input className="panel-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </>
          )}

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="text-sm muted">Φίλτρο κατηγορίας</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <input className="panel-input" placeholder="Αναζήτηση κατηγορίας" value={categoryQuery} onChange={e => setCategoryQuery(e.target.value)} style={{ flex: 1 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-ghost btn-icon" aria-label="Επιλογή όλων" title="Επιλογή όλων" onClick={() => setSelectedCategories(categories)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button type="button" className="btn-ghost btn-icon" aria-label="Εκκαθάριση" title="Εκκαθάριση" onClick={() => setSelectedCategories([])}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
            <div className="category-list" style={{ marginTop: 8 }}>
              {categories.filter(c => !categoryQuery || c.toLowerCase().includes(categoryQuery.toLowerCase())).map(c => (
                <button
                  key={c}
                  type="button"
                  className={`category-item ${selectedCategories.includes(c) ? 'selected' : ''}`}
                  onClick={() => setSelectedCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                >
                  <span className="cat-label">{c}</span>
                </button>
              ))}
            </div>
            <div className="input-hint" style={{ marginTop: 8 }}>Επίλεξε μία ή περισσότερες κατηγορίες</div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="text-sm muted">Φίλτρο πελάτη</label>
            <input className="panel-input" value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} placeholder="μέρος ονόματος πελάτη" />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onDownloadExcel}>Λήψη Excel (eco)</button>
            <button className="btn-ghost" onClick={() => setShowEntries(s => !s)}>{showEntries ? 'Απόκρυψη εγγραφών' : 'Εμφάνιση εγγραφών'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
