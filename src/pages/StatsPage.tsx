
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { loadAllEntries, DailyEntry, updateEntry, getProgressForMonth } from '../services/storage'
import { exportEcoFriendlyExcel } from '../utils/exportExcel'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

// Minimal AnimatedNumber for KPI count-up
function AnimatedNumber({ value }: { value: number }){
  const [v, setV] = useState(0)
  useEffect(()=>{
    let raf = 0
    const start = performance.now()
    const from = v
    const dur = 600
    const step = (t:number) => {
      const p = Math.min(1, (t - start) / dur)
      const next = Math.round(from + (value - from) * p)
      setV(next)
      if(p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return ()=> cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return <span className="kpi-value">{v}</span>
}

export default function StatsPage(){
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [mode, setMode] = useState<'day'|'month'|'range'>('day')
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [dayDate, setDayDate] = useState<string>(new Date().toISOString().slice(0,10))
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 1000*60*60*24*30).toISOString().slice(0,10))
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0,10))

  const [progress, setProgress] = useState<{category:string,target:number,achieved:number}[]>([])
  const [drillCategory, setDrillCategory] = useState<string|null>(null)

  // Φόρτωση στόχων/επίτευξης για τον μήνα
  useEffect(()=>{
    if(mode !== 'month') return
    getProgressForMonth(year, month).then(setProgress)
  }, [mode, year, month])

  // Εγγραφές του μήνα για την επιλεγμένη κατηγορία (drill-down)
  const drillEntries: DailyEntry[] = useMemo(() => {
    if (!drillCategory || mode !== 'month') return []
    return entries.filter((e: DailyEntry) => {
      if (!e.category || String(e.category).trim() !== drillCategory) return false
      const d = new Date(e.date)
      return d.getFullYear() === year && (d.getMonth() + 1) === month
    })
  }, [drillCategory, entries, year, month, mode])

  const dateOnly = (iso: string) => {
    const s = String(iso || '')
    return s.length >= 10 ? s.slice(0, 10) : s
  }

  const goPrevMonth = () => {
    setMonth(prev => {
      if (prev <= 1) {
        setYear(y => y - 1)
        return 12
      }
      return prev - 1
    })
  }

  const goNextMonth = () => {
    setMonth(prev => {
      if (prev >= 12) {
        setYear(y => y + 1)
        return 1
      }
      return prev + 1
    })
  }

  const jumpToToday = () => {
    const today = new Date().toISOString().slice(0, 10)
    setMode('day')
    setDayDate(today)
  }

  const jumpToCurrentMonth = () => {
    const d = new Date()
    setMode('month')
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
  }

  const [categoryQuery, setCategoryQuery] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [customerFilter, setCustomerFilter] = useState('')
  const [showEntries, setShowEntries] = useState(false)

  const [editing, setEditing] = useState<DailyEntry | null>(null)
  const [saving, setSaving] = useState(false)
  const [editErrors, setEditErrors] = useState<string[]>([])

  const [editCategory, setEditCategory] = useState('')
  const [editPoints, setEditPoints] = useState<number | ''>('')
  const [editDateOnly, setEditDateOnly] = useState('')
  const [editHomeType, setEditHomeType] = useState('')
  const [editOrderNumber, setEditOrderNumber] = useState('')
  const [editCustomerName, setEditCustomerName] = useState('')
  const [editAfm, setEditAfm] = useState('')
  const [editMobilePhone, setEditMobilePhone] = useState('')
  const [editLandlinePhone, setEditLandlinePhone] = useState('')

  const HOME_TYPE_OPTIONS = [
    'ADSL DOUBLE',
    'ADSL TRIPLE',
    'VDSL DOUBLE',
    'VDSL TRIPLE',
    '300/500/1000 FTTH DOUBLE',
    '300/500/1000 FTTH TRIPLE',
    'FWA',
    'FWA VOICE'
  ]

  const reload = async () => {
    const all = await loadAllEntries()
    setEntries(all || [])
  }

  useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      const all = await loadAllEntries()
      if(!mounted) return
      setEntries(all || [])
    })()

    const onChange = () => { reload().catch(()=>{}) }
    window.addEventListener('ws:entries-updated' as any, onChange)

    return ()=> {
      mounted = false
      window.removeEventListener('ws:entries-updated' as any, onChange)
    }
  }, [])

  const openEdit = (e: DailyEntry) => {
    setEditing(e)
    setEditErrors([])
    setEditCategory(String(e.category || '').toUpperCase())
    setEditPoints(typeof e.points === 'number' ? e.points : '')
    try{
      const d = e.date ? new Date(e.date) : new Date()
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth()+1).padStart(2,'0')
      const dd = String(d.getDate()).padStart(2,'0')
      setEditDateOnly(`${yyyy}-${mm}-${dd}`)
    }catch{
      setEditDateOnly('')
    }
    setEditHomeType(String(e.homeType || ''))
    setEditOrderNumber(String(e.orderNumber || ''))
    setEditCustomerName(String(e.customerName || ''))
    setEditAfm(String(e.afm || ''))
    setEditMobilePhone(String(e.mobilePhone || ''))
    setEditLandlinePhone(String(e.landlinePhone || ''))
  }

  const closeEdit = () => {
    if (saving) return
    setEditing(null)
    setEditErrors([])
  }

  const validateEdit = () => {
    const errs: string[] = []
    const categoryUpper = String(editCategory || '').toUpperCase().trim()
    const pts = typeof editPoints === 'number' ? editPoints : parseFloat(String(editPoints || '0'))
    if (!categoryUpper) errs.push('Επίλεξε ή γράψε κατηγορία')
    if (!editOrderNumber.trim()) errs.push('Πρόσθεσε αριθμό παραγγελίας')
    if (!editCustomerName.trim()) errs.push('Πρόσθεσε ονοματεπώνυμο πελάτη')
    if (!pts || pts <= 0) errs.push('Πρόσθεσε έγκυρα σημεία (>0)')
    setEditErrors(errs)
    return errs.length === 0
  }

  const submitEdit = async () => {
    if (!editing) return
    if (!validateEdit()) return

    setSaving(true)
    try{
      const categoryUpper = String(editCategory || '').toUpperCase().trim()
      const pts = typeof editPoints === 'number' ? editPoints : parseFloat(String(editPoints || '0'))

      const isoDate = editDateOnly
        ? new Date(`${editDateOnly}T12:00:00`).toISOString()
        : (editing.date || new Date().toISOString())

      const nextPatch: Partial<DailyEntry> = {
        category: categoryUpper,
        points: Number(pts),
        date: isoDate,
        homeType: categoryUpper === 'VODAFONE HOME W/F' ? editHomeType : '',
        orderNumber: editOrderNumber.trim(),
        customerName: editCustomerName.trim(),
        afm: editAfm.trim(),
        mobilePhone: editMobilePhone.trim(),
        landlinePhone: editLandlinePhone.trim()
      }

      await updateEntry(editing.id, nextPatch)
      await reload()
      setEditing(null)
    }catch(e){
      console.error(e)
      setEditErrors(['Σφάλμα ενημέρωσης καταχώρησης'])
    }finally{
      setSaving(false)
    }
  }

  useEffect(()=>{
    const set = Array.from(new Set(entries.map(e => (e.category||'').trim()).filter(Boolean)))
    set.sort()
    setCategories(set)
    if(selectedCategories.length === 0) setSelectedCategories(set)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries])


  // filtered visible entries
  const visible = useMemo(()=>{
    return entries.filter(e => {
      if(selectedCategories.length && !selectedCategories.includes((e.category||'').trim())) return false
      if(customerFilter && !(e.customerName||'').toLowerCase().includes(customerFilter.toLowerCase())) return false

      const dOnly = dateOnly(e.date)
      if(mode === 'month'){
        const d = new Date(e.date)
        if(d.getFullYear() !== year) return false
        if(d.getMonth() + 1 !== month) return false
      } else if (mode === 'day') {
        if (dayDate && dOnly !== dayDate) return false
      } else {
        if(startDate && dOnly < startDate) return false
        if(endDate && dOnly > endDate) return false
      }
      return true
    })
  }, [entries, selectedCategories, customerFilter, mode, year, month, dayDate, startDate, endDate])

  // counts per category
  const categoryCounts = useMemo(()=>{
    const m: Record<string, number> = {}
    const pts: Record<string, number> = {}
    for(const e of entries){
      const k = (e.category||'').trim()
      if(!k) continue
      m[k] = (m[k]||0) + 1
      pts[k] = (pts[k]||0) + (e.points||0)
    }
    return { counts: m, points: pts }
  }, [entries])

  const categoryPoints = categoryCounts.points
  const categoryCountsMap = categoryCounts.counts

  const isRantevou = (e: DailyEntry) => {
    const cat = String(e.category || '').trim().toUpperCase()
    return cat === 'ΡΑΝΤΕΒΟΥ'
  }

  const totalRantevouMoney = useMemo(() => {
    return visible.reduce((s, e) => (isRantevou(e) ? s + (e.points || 0) : s), 0)
  }, [visible])

  const visibleWithoutRantevou = useMemo(() => {
    return visible.filter(e => !isRantevou(e))
  }, [visible])

  const totalPointsAll = useMemo(() => {
    // Σημεία χωρίς τα ΡΑΝΤΕΒΟΥ
    return visibleWithoutRantevou.reduce((s, e) => s + (e.points || 0), 0)
  }, [visibleWithoutRantevou])

  const totalEntriesAll = visible.length

  const avgPerPeriod = useMemo(() => {
    const periods = new Set<string>()
    for (const e of visibleWithoutRantevou) {
      const d = dateOnly(e.date)
      if (d) periods.add(d)
    }
    const n = periods.size
    return n > 0 ? Math.round(totalPointsAll / n) : 0
  }, [visibleWithoutRantevou, totalPointsAll])

  async function downloadExcel(){
    // Εξαγωγή μόνο με κατηγορία, όνομα πελάτη, παραγγελία, ποσότητα
    const headers = ['Κατηγορία', 'Πελάτης', 'Αρ. Παραγγελίας', 'Ποσότητα']
    const data = visible.map(e => ({
      'Κατηγορία': e.category || '',
      'Πελάτης': e.customerName || '',
      'Αρ. Παραγγελίας': e.orderNumber || '',
      'Ποσότητα': e.points || 0
    }))
    await exportEcoFriendlyExcel({
      data,
      filename: `entries-${new Date().toISOString().slice(0,10)}.xlsx`,
      headers,
      sheetName: 'Εγγραφές',
      greenHeader: true
    })
  }

  return (
    <div style={{padding:'28px 16px', paddingTop: '220px'}}>
      <PageHeader
        title="Στατιστικά & Αναφορές"
        subtitle="Ανάλυση επιδόσεων και αναφορές ανά περίοδο"
        breadcrumb="Στατιστικά"
      />
      <div style={{maxWidth:1400, margin:'0 auto', width:'100%'}}>
        {mode === 'month' && progress.length > 0 && (
          <div className="panel-card mb-4">
            <h3 className="font-semibold mb-2">Στόχοι ανά κατηγορία ({month}/{year})</h3>
            <table className="stats-table">
              <thead>
                <tr className="muted text-xs" style={{textAlign:'left'}}>
                  <th style={{padding:'8px 12px'}}>Κατηγορία</th>
                  <th style={{padding:'8px 12px'}}>Στόχος</th>
                  <th style={{padding:'8px 12px'}}>Επίτευξη</th>
                </tr>
              </thead>
              <tbody>
                {progress.map(row => (
                  <tr key={row.category} style={{cursor:'pointer'}} onClick={()=> setDrillCategory(row.category)}>
                    <td style={{padding:'8px 12px', textDecoration:'underline'}}>{row.category}</td>
                    <td style={{padding:'8px 12px'}}>{row.target}</td>
                    <td style={{padding:'8px 12px'}}>{row.achieved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Drill-down modal για εγγραφές κατηγορίας */}
            {drillCategory && (
              <Modal isOpen={!!drillCategory} onClose={()=>setDrillCategory(null)}>
                <div style={{maxWidth:600}}>
                  <h3 className="font-semibold mb-2">Εγγραφές για "{drillCategory}" ({month}/{year})</h3>
                  {drillEntries.length === 0 ? (
                    <div className="muted">Δεν βρέθηκαν εγγραφές.</div>
                  ) : (
                    <table className="stats-table">
                      <thead>
                        <tr className="muted text-xs" style={{textAlign:'left'}}>
                          <th style={{padding:'8px 12px'}}>Ημερομηνία</th>
                          <th style={{padding:'8px 12px'}}>Πελάτης</th>
                          <th style={{padding:'8px 12px'}}>Παραγγελία</th>
                          <th style={{padding:'8px 12px'}}>Ποσότητα</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drillEntries.map((e: DailyEntry) => (
                          <tr key={e.id}>
                            <td style={{padding:'8px 12px'}}>{e.date ? e.date.slice(0,10) : ''}</td>
                            <td style={{padding:'8px 12px'}}>{e.customerName || ''}</td>
                            <td style={{padding:'8px 12px'}}>{e.orderNumber || ''}</td>
                            <td style={{padding:'8px 12px'}}>{e.points || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Modal>
            )}
          </div>
        )}
      <div className="panel-card mb-4">
        <div className="stats-controls" style={{display:'grid',gridTemplateColumns:'1fr',gap:14,alignItems:'start'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
            <div>
              <label className="text-sm muted">Τρόπος αναφοράς</label>
              <div style={{marginTop:6}}>
                <select className="panel-input" value={mode} onChange={e=> setMode(e.target.value as any)}>
                  <option value="day">Εγγραφές ημέρας</option>
                  <option value="month">Εγγραφές μήνα</option>
                  <option value="range">Χρονική περίοδος</option>
                </select>
              </div>

              <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
                <button type="button" className="btn-ghost" onClick={jumpToToday}>Σήμερα</button>
                <button type="button" className="btn-ghost" onClick={jumpToCurrentMonth}>Τρέχων μήνας</button>
              </div>
            </div>

            {mode === 'month' ? (
              <div>
                <label className="text-sm muted">Μήνας</label>
                <div style={{marginTop:6,display:'flex',gap:8}}>
                  <button type="button" className="btn-ghost btn-icon" aria-label="Προηγούμενος μήνας" title="Προηγούμενος μήνας" onClick={goPrevMonth}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <input className="panel-input" type="number" min={2000} max={2100} value={year} onChange={e=> setYear(parseInt(e.target.value||String(now.getFullYear())))} style={{width:110}} />
                  <select className="panel-input" value={month} onChange={e=> setMonth(parseInt(e.target.value))}>
                    {Array.from({length:12},(_,i)=>(i+1)).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <button type="button" className="btn-ghost btn-icon" aria-label="Επόμενος μήνας" title="Επόμενος μήνας" onClick={goNextMonth}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>
            ) : mode === 'day' ? (
              <div>
                <label className="text-sm muted">Ημερομηνία</label>
                <input className="panel-input" type="date" value={dayDate} onChange={e=> setDayDate(e.target.value)} />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm muted">Από</label>
                  <input className="panel-input" type="date" value={startDate} onChange={e=> setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm muted">Έως</label>
                  <input className="panel-input" type="date" value={endDate} onChange={e=> setEndDate(e.target.value)} />
                </div>
              </>
            )}

            <div style={{gridColumn:'1 / -1'}}>
              <label className="text-sm muted">Φίλτρο κατηγορίας</label>
              <div style={{display:'flex',gap:8,marginTop:8,alignItems:'center'}}>
                <input className="panel-input" placeholder="Αναζήτηση κατηγορίας" value={categoryQuery} onChange={e=> setCategoryQuery(e.target.value)} style={{flex:1}} />
                <div style={{display:'flex',gap:8}}>
                  <button type="button" className="btn-ghost btn-icon" aria-label="Επιλογή όλων" title="Επιλογή όλων" onClick={()=> setSelectedCategories(categories)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button type="button" className="btn-ghost btn-icon" aria-label="Εκκαθάριση" title="Εκκαθάριση" onClick={()=> setSelectedCategories([])}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>

              <div className="category-list" style={{marginTop:8}}>
                {categories.filter(c => !categoryQuery || c.toLowerCase().includes(categoryQuery.toLowerCase())).map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`category-item ${selectedCategories.includes(c) ? 'selected' : ''}`}
                    onClick={() => setSelectedCategories(prev => prev.includes(c) ? prev.filter(x=>x!==c) : [...prev, c])}
                  >
                    <span className="cat-label">{c}</span>
                  </button>
                ))}
              </div>
              <div className="input-hint" style={{marginTop:8}}>Επίλεξε μία ή περισσότερες κατηγορίες</div>
            </div>

            <div style={{gridColumn:'1 / -1'}}>
              <label className="text-sm muted">Φίλτρο πελάτη</label>
              <input className="panel-input" value={customerFilter} onChange={e=> setCustomerFilter(e.target.value)} placeholder="μέρος ονόματος πελάτη" />
            </div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:10,alignItems:'stretch'}}>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn" onClick={downloadExcel}>Λήψη Excel (eco)</button>
              <button className="btn-ghost" onClick={()=> setShowEntries(s => !s)}>{showEntries ? 'Απόκρυψη εγγραφών' : 'Εμφάνιση εγγραφών'}</button>
            </div>
          </div>
        </div>
          </div>

      {/* Results section: KPIs + optional entries list */}
  <section className="panel-card results-panel" style={{width:'100%'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,justifyContent:'space-between'}}>
          <h2 className="text-lg font-semibold mb-3">Σύνοψη</h2>
        </div>

        {/* KPIs below results */}
        <div className="kpi-row" style={{display:'flex',gap:12,marginTop:12}}>
          <div className="kpi-card">
            <div className="kpi-title">Σύνολο Γραμμών</div>
            <AnimatedNumber value={totalPointsAll} />
          </div>
          <div className="kpi-card">
            <div className="kpi-title">Σύνολο καταχωρήσεων</div>
            <AnimatedNumber value={totalEntriesAll} />
          </div>
          <div className="kpi-card">
            <div className="kpi-title">Μέσο ανά περίοδο</div>
            <AnimatedNumber value={avgPerPeriod} />
          </div>
          <div className="kpi-card">
            <div className="kpi-title">Ραντεβού (€)</div>
            <AnimatedNumber value={Math.round(totalRantevouMoney)} />
          </div>
        </div>

        {showEntries && (
          <div className="mt-4 entries-card">
            <h3 className="font-semibold mb-2">Λίστα εγγραφών ({visible.length})</h3>
            <div style={{overflow:'auto'}}>
              <table className="entries-table w-full">
                <thead>
                  <tr className="muted text-xs" style={{textAlign:'left'}}>
                    <th style={{padding:'6px 8px'}}>Ημερομηνία</th>
                    <th style={{padding:'6px 8px'}}>Κατηγορία</th>
                    <th style={{padding:'6px 8px'}}>Υποτύπος</th>
                    <th style={{padding:'6px 8px'}}>Αρ. Παραγ.</th>
                    <th style={{padding:'6px 8px'}}>Πελάτης</th>
                    <th style={{padding:'6px 8px'}}>ΑΦΜ</th>
                    <th style={{padding:'6px 8px'}}>Μονάδες</th>
                    <th style={{padding:'6px 8px'}} />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((e:DailyEntry) => (
                    <tr key={e.id} className="border-b" style={{borderColor:'rgba(0,0,0,0.06)'}}>
                      <td style={{padding:'6px 8px'}}>{new Date(e.date).toLocaleString()}</td>
                      <td style={{padding:'6px 8px'}}>{e.category}</td>
                      <td style={{padding:'6px 8px'}}>{e.homeType || '-'}</td>
                      <td style={{padding:'6px 8px'}}>{e.orderNumber || '-'}</td>
                      <td style={{padding:'6px 8px'}}>{e.customerName || '-'}</td>
                      <td style={{padding:'6px 8px'}}>{e.afm || '-'}</td>
                      <td style={{padding:'6px 8px'}}>{e.points}</td>
                      <td style={{padding:'6px 8px', textAlign:'right', whiteSpace:'nowrap'}}>
                        <button className="btn-ghost" onClick={()=> openEdit(e)}>Επεξεργασία</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <Modal
        isOpen={!!editing}
        title={editing ? `Επεξεργασία: ${editing.category || 'Entry'}` : 'Επεξεργασία'}
        onClose={closeEdit}
        size="md"
        height="short"
      >
        <div className="grid gap-3">
          {editErrors.length > 0 && (
            <div className="panel-card" style={{padding:'12px 14px'}}>
              <div style={{fontWeight:700, marginBottom:6}}>Διόρθωσε τα παρακάτω:</div>
              <ul style={{margin:0, paddingLeft:18}}>
                {editErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <div className="form-row">
            <label className="text-sm font-medium">Κατηγορία</label>
            <div style={{flex:1}}>
              <input className="panel-input" value={editCategory} onChange={e=> setEditCategory(e.target.value ? e.target.value.toUpperCase() : '')} />
            </div>
          </div>

          <div className="form-row">
            <label className="text-sm font-medium">Ημερομηνία</label>
            <div style={{flex:1}}>
              <input className="panel-input" type="date" value={editDateOnly} onChange={e=> setEditDateOnly(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label className="text-sm font-medium">Αρ. παραγγελίας</label>
            <div style={{flex:1}}>
              <input className="panel-input" value={editOrderNumber} onChange={e=> setEditOrderNumber(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label className="text-sm font-medium">Ονοματεπώνυμο πελάτη</label>
            <div style={{flex:1}}>
              <input className="panel-input" value={editCustomerName} onChange={e=> setEditCustomerName(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label className="text-sm font-medium">Κινητό (προαιρετικό)</label>
            <div style={{flex:1}}>
              <input className="panel-input" value={editMobilePhone} onChange={e=> setEditMobilePhone(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label className="text-sm font-medium">Σταθερό (προαιρετικό)</label>
            <div style={{flex:1}}>
              <input className="panel-input" value={editLandlinePhone} onChange={e=> setEditLandlinePhone(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label className="text-sm font-medium">ΑΦΜ (προαιρετικό)</label>
            <div style={{flex:1}}>
              <input className="panel-input" value={editAfm} onChange={e=> setEditAfm(e.target.value)} />
            </div>
          </div>

          {String(editCategory || '').toUpperCase() === 'VODAFONE HOME W/F' && (
            <div className="form-row">
              <label className="text-sm font-medium">Υποτύπος</label>
              <div style={{flex:1}}>
                <select className="panel-input" value={editHomeType} onChange={e=> setEditHomeType(e.target.value)}>
                  {HOME_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="form-row">
            <label className="text-sm font-medium">Μονάδες / Σημεία</label>
            <div style={{flex:1}}>
              <input
                className="panel-input"
                type="number"
                step="0.1"
                value={editPoints}
                onChange={e=> setEditPoints(e.target.value === '' ? '' : parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div style={{display:'flex', gap:10, justifyContent:'flex-end', marginTop:8}}>
            <button className="btn-ghost" onClick={closeEdit} disabled={saving}>Ακύρωση</button>
            <button className="btn" onClick={submitEdit} disabled={saving}>{saving ? 'Αποθήκευση…' : 'Αποθήκευση'}</button>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  )
}

