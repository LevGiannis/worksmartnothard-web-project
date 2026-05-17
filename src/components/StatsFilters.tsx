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

const MONTH_NAMES = ['Ιαν','Φεβ','Μαρ','Απρ','Μαι','Ιουν','Ιουλ','Αυγ','Σεπ','Οκτ','Νοε','Δεκ']

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

  const modeOptions: { value: Mode; label: string }[] = [
    { value: 'day', label: 'Ημέρα' },
    { value: 'month', label: 'Μήνας' },
    { value: 'range', label: 'Περίοδος' },
  ]

  return (
    <div className="panel-card mb-4" style={{ padding: 24 }}>
      {/* Top row: mode tabs + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        {/* Segmented control for mode */}
        <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 3, gap: 2 }}>
          {modeOptions.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => setMode(o.value)}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                transition: 'background 150ms, color 150ms',
                background: mode === o.value ? 'linear-gradient(90deg,#7c3aed,#5b21b6)' : 'transparent',
                color: mode === o.value ? '#fff' : 'rgba(255,255,255,0.5)',
                boxShadow: mode === o.value ? '0 4px 12px rgba(124,58,237,0.35)' : 'none',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Quick jump + actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn-ghost" onClick={jumpToToday} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Σήμερα</button>
          <button type="button" className="btn-ghost" onClick={jumpToCurrentMonth} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Τρέχων μήνας</button>
          <button className="btn" onClick={onDownloadExcel} style={{ fontSize: '0.8rem', padding: '6px 14px', background: 'linear-gradient(90deg,#10b981,#059669)', border: 'none' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 3v13M8 12l4 4 4-4" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M3 18h18" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              Excel
            </span>
          </button>
          <button className="btn-ghost" onClick={() => setShowEntries(s => !s)} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            {showEntries ? 'Απόκρυψη' : 'Εγγραφές'}
          </button>
        </div>
      </div>

      {/* Date controls */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18, alignItems: 'center' }}>
        {mode === 'month' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" className="btn-ghost" onClick={goPrevMonth} aria-label="Προηγούμενος μήνας" style={{ padding: '6px 10px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
            <input className="panel-input" type="number" min={2000} max={2100} value={year} onChange={e => setYear(parseInt(e.target.value || String(new Date().getFullYear())))} style={{ width: 90 }} />
            <select className="panel-input" value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ width: 100 }}>
              {MONTH_NAMES.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
            </select>
            <button type="button" className="btn-ghost" onClick={goNextMonth} aria-label="Επόμενος μήνας" style={{ padding: '6px 10px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        ) : mode === 'day' ? (
          <input className="panel-input" type="date" value={dayDate} onChange={e => setDayDate(e.target.value)} style={{ width: 180 }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input className="panel-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: 160 }} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem' }}>έως</span>
            <input className="panel-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: 160 }} />
          </div>
        )}
      </div>

      {/* Filters row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Category filter */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Κατηγορία</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input className="panel-input" placeholder="Αναζήτηση..." value={categoryQuery} onChange={e => setCategoryQuery(e.target.value)} style={{ flex: 1 }} />
            <button type="button" className="btn-ghost" onClick={() => setSelectedCategories(categories)} title="Επιλογή όλων" style={{ padding: '6px 10px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6H21M3 12H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
            <button type="button" className="btn-ghost" onClick={() => setSelectedCategories([])} title="Εκκαθάριση" style={{ padding: '6px 10px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {categories.filter(c => !categoryQuery || c.toLowerCase().includes(categoryQuery.toLowerCase())).map(c => {
              const selected = selectedCategories.includes(c)
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: `1px solid ${selected ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    background: selected ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
                    color: selected ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    transition: 'all 120ms',
                  }}
                >
                  {c}
                </button>
              )
            })}
            {categories.length === 0 && <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.78rem' }}>Δεν υπάρχουν κατηγορίες</div>}
          </div>
        </div>

        {/* Customer filter */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Πελάτης</div>
          <input className="panel-input" value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} placeholder="Μέρος ονόματος πελάτη..." style={{ width: '100%' }} />
          {customerFilter && (
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 5 }}>
              Φίλτρο ενεργό: "{customerFilter}"
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
