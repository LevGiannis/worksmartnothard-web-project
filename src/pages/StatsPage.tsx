
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { loadAllEntries, DailyEntry, updateEntry } from '../services/storage'
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
  const [mode, setMode] = useState<'by-day'|'by-month'>('by-day')
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 1000*60*60*24*30).toISOString().slice(0,10))
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0,10))

  const [categoryQuery, setCategoryQuery] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [customerFilter, setCustomerFilter] = useState('')
  const [showEntries, setShowEntries] = useState(false)

  const hoverTimeout = useRef<number|undefined>(undefined)
  const [tooltipInfo, setTooltipInfo] = useState<{cat:string,x:number,y:number}|null>(null)

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

  function hideCategoryTooltip(){ setTooltipInfo(null) }

  useEffect(()=>{
    const onKey = (ev:KeyboardEvent) => { if(ev.key === 'Escape') hideCategoryTooltip() }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  }, [])

  // filtered visible entries
  const visible = useMemo(()=>{
    return entries.filter(e => {
      if(selectedCategories.length && !selectedCategories.includes((e.category||'').trim())) return false
      if(customerFilter && !(e.customerName||'').toLowerCase().includes(customerFilter.toLowerCase())) return false
      if(mode === 'by-month'){
        const d = new Date(e.date)
        if(d.getFullYear() !== year) return false
        if(d.getMonth() + 1 !== month) return false
      } else {
        if(startDate && new Date(e.date) < new Date(startDate)) return false
        if(endDate && new Date(e.date) > new Date(endDate + 'T23:59:59')) return false
      }
      return true
    })
  }, [entries, selectedCategories, customerFilter, mode, year, month, startDate, endDate])

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

  // top customers per category
  const categoryTopCustomers = useMemo(()=>{
    const map: Record<string, Array<{name:string,count:number}>> = {}
    const temp: Record<string, Record<string,number>> = {}
    for(const e of entries){
      const k = (e.category||'').trim(); if(!k) continue
      const name = (e.customerName||'Άγνωστος').toString()
      temp[k] = temp[k] || {}
      temp[k][name] = (temp[k][name] || 0) + 1
    }
    for(const k of Object.keys(temp)){
      const arr = Object.entries(temp[k]).map(([name,count])=>({name,count}))
      arr.sort((a,b)=> b.count - a.count)
      map[k] = arr.slice(0,3)
    }
    return map
  }, [entries])

  function showCategoryTooltip(cat:string, rect:DOMRect){
    // simple positioning: right of element if space, else left
    const pad = 8
    const width = 240
    let x = rect.right + pad
    let y = rect.top
    if(x + width > window.innerWidth) x = rect.left - width - pad
    if(x < 8) x = 8
    if(y + 120 > window.innerHeight) y = Math.max(8, window.innerHeight - 140)
    setTooltipInfo({cat,x,y})
  }

  // aggregation by period
  const aggregated = useMemo(()=>{
    const map: Record<string,{period:string,total:number,count:number}> = {}
    const keyFn = (d:string) => {
      const dt = new Date(d)
      if(mode === 'by-month') return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`
      return dt.toISOString().slice(0,10)
    }
    for(const e of visible){
      const k = keyFn(e.date)
      if(!map[k]) map[k] = { period:k, total:0, count:0 }
      map[k].total += (e.points||0)
      map[k].count += 1
    }
    return Object.values(map).sort((a,b)=> a.period.localeCompare(b.period))
  }, [visible, mode])

  const [animateBars, setAnimateBars] = useState(false)
  useEffect(()=>{
    setAnimateBars(false)
    const id = requestAnimationFrame(()=> setAnimateBars(true))
    return ()=> cancelAnimationFrame(id)
  }, [aggregated.length, aggregated.map(a=>a.total).join(',')])

  const totalPointsAll = aggregated.reduce((s,a) => s + (a.total || 0), 0)
  const totalEntriesAll = aggregated.reduce((s,a) => s + (a.count || 0), 0)
  const avgPerPeriod = aggregated.length ? Math.round(totalPointsAll / aggregated.length) : 0

  function downloadCsv(){
    const rows = ['period,total_points,entries_count,category_filter,customer_filter']
    for(const r of aggregated){
      rows.push(`${r.period},${r.total},${r.count},"${selectedCategories.join('|')}","${customerFilter}"`)
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${mode}-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{padding:'28px 16px', paddingTop: '220px'}}>
      <PageHeader
        title="Στατιστικά & Αναφορές"
        subtitle="Ανάλυση επιδόσεων και αναφορές ανά περίοδο"
        breadcrumb="Στατιστικά"
      />
      <div style={{maxWidth:1400, margin:'0 auto', width:'100%'}}>
  <div className="panel-card mb-4">
        <div className="stats-controls" style={{display:'grid',gridTemplateColumns:'1fr',gap:14,alignItems:'start'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
            <div>
              <label className="text-sm muted">Τρόπος αναφοράς</label>
              <div style={{marginTop:6}}>
                <select className="panel-input" value={mode} onChange={e=> setMode(e.target.value as any)}>
                  <option value="by-day">Ανά ημέρα (ημερολογιακό εύρος)</option>
                  <option value="by-month">Ανά μήνα</option>
                </select>
              </div>
            </div>

            {mode === 'by-month' ? (
              <div>
                <label className="text-sm muted">Μήνας</label>
                <div style={{marginTop:6,display:'flex',gap:8}}>
                  <input className="panel-input" type="number" min={2000} max={2100} value={year} onChange={e=> setYear(parseInt(e.target.value||String(now.getFullYear())))} style={{width:110}} />
                  <select className="panel-input" value={month} onChange={e=> setMonth(parseInt(e.target.value))}>
                    {Array.from({length:12},(_,i)=>(i+1)).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
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
                    title={`${categoryCountsMap[c] || 0} εγγραφές — ${(categoryPoints[c] || 0)} σημεία`}
                    aria-label={`${c}: ${categoryCountsMap[c] || 0} εγγραφές, ${categoryPoints[c] || 0} σημεία`}
                    onMouseEnter={(e) => {
                      if(hoverTimeout.current) window.clearTimeout(hoverTimeout.current)
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      showCategoryTooltip(c, rect)
                    }}
                    onMouseLeave={() => { hoverTimeout.current = window.setTimeout(()=> hideCategoryTooltip(), 220) as unknown as number }}
                    onFocus={(e) => {
                      if(hoverTimeout.current) window.clearTimeout(hoverTimeout.current)
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      showCategoryTooltip(c, rect)
                    }}
                    onBlur={() => { hoverTimeout.current = window.setTimeout(()=> hideCategoryTooltip(), 220) as unknown as number }}
                  >
                    <span className="cat-label">{c}</span>
                    <span className="cat-count">{categoryCountsMap[c] || 0}</span>
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
              <button className="btn" onClick={downloadCsv}>Λήψη CSV</button>
              <button className="btn-ghost" onClick={()=> setShowEntries(s => !s)}>{showEntries ? 'Απόκρυψη εγγραφών' : 'Εμφάνιση εγγραφών'}</button>
            </div>
          </div>
        </div>
  </div>

      {/* Results section: chart + table */}
  <section className="panel-card results-panel" style={{width:'100%'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,justifyContent:'space-between'}}>
          <h2 className="text-lg font-semibold mb-3">Αποτελέσματα ({aggregated.length})</h2>
        </div>

        <div className="stats-grid" style={{display:'grid',gap:16,alignItems:'stretch',gridTemplateColumns: '1fr 420px'}}>
          <div style={{height: '100%'}}>
            {aggregated.length > 0 ? (
              <div className="chart-wrapper" aria-hidden>
                <svg viewBox={`0 0 ${Math.max(aggregated.length * 36, 300)} 200`} style={{width:'100%',height:200}} preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="gbar" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#ff6b8a" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const barW = 26
                    const gap = 18
                    const svgH = 200
                    const top = 20
                    const bottom = 40
                    const left = 44
                    const w = Math.max(aggregated.length * (barW + gap), 300)
                    const chartH = svgH - top - bottom
                    const max = Math.max(...aggregated.map(a => a.total || 0), 1)
                    const baselineY = top + chartH
                    const axisX2 = left + w - 8
                    return (
                      <>
                        <line x1={left} y1={baselineY} x2={axisX2} y2={baselineY} stroke="rgba(0,0,0,0.08)" strokeWidth={1} />
                        {Array.from({length:5}).map((_, ti) => {
                          const t = ti
                          const frac = t / 4
                          const y = top + (chartH * frac)
                          const val = Math.round(max * (1 - frac))
                          return (
                            <g key={`tick-${t}`}>
                              <line x1={left} y1={y} x2={axisX2} y2={y} stroke="rgba(0,0,0,0.02)" strokeWidth={1} />
                              <text className="y-axis-label" x={Math.max(6, left - 8)} y={y + 4} textAnchor="end">{val}</text>
                            </g>
                          )
                        })}

                        {aggregated.map((row,i) => {
                          const x = left + i * (barW + gap)
                          const h = Math.round(((row.total || 0) / max) * chartH)
                          const y = top + (chartH - h)
                          return (
                            <g key={row.period}>
                              <rect className="bar-rect" x={x} y={y} width={barW} height={h} fill="url(#gbar)" style={{ transformOrigin: 'center bottom', transform: animateBars ? 'scaleY(1)' : 'scaleY(0)' }}>
                                <title>{`${row.period}: ${row.total} σημεία (${row.count} καταχωρήσεις)`}</title>
                              </rect>
                              <text className="chart-label" x={x + barW/2} y={y - 8} textAnchor="middle">{row.total}</text>
                              <text className="chart-label" x={x + barW/2} y={baselineY + 16} textAnchor="middle">{row.period.slice(5)}</text>
                            </g>
                          )
                        })}
                      </>
                    )
                  })()}
                </svg>
              </div>
            ) : (
              <div className="muted" style={{padding:14}}>Δεν βρέθηκαν δεδομένα για την περίοδο/τα φίλτρα που επιλέξατε.</div>
            )}
          </div>

          <div style={{overflow:'auto',height: '100%'}}>
            <table className="stats-table">
              <thead>
                <tr className="muted text-xs" style={{textAlign:'left'}}>
                  <th style={{padding:'8px 12px'}}>Περίοδος</th>
                  <th style={{padding:'8px 12px'}}>Σύνολο σημεία</th>
                  <th style={{padding:'8px 12px'}}>Καταχωρήσεις</th>
                </tr>
              </thead>
              <tbody>
                {aggregated.map((r:any) => (
                  <tr key={r.period} className="border-b" style={{borderColor:'rgba(0,0,0,0.06)'}}>
                    <td style={{padding:'8px 12px'}}>{r.period}</td>
                    <td style={{padding:'8px 12px'}}>{r.total}</td>
                    <td style={{padding:'8px 12px'}}>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* KPIs below results */}
        <div className="kpi-row" style={{display:'flex',gap:12,marginTop:12}}>
          <div className="kpi-card">
            <div className="kpi-title">Σύνολο σημείων</div>
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

      {tooltipInfo && (
        <div
          className={`cat-tooltip visible`}
          style={{left: tooltipInfo.x, top: tooltipInfo.y, position: 'fixed', zIndex: 60}}
          role="dialog"
          aria-label={`Πληροφορίες κατηγορίας ${tooltipInfo.cat}`}
          tabIndex={0}
          onMouseEnter={() => { if(hoverTimeout.current) window.clearTimeout(hoverTimeout.current) }}
          onMouseLeave={() => { hoverTimeout.current = window.setTimeout(()=> hideCategoryTooltip(), 200) as unknown as number }}
        >
          <div className="cat-tooltip-content">
            <div className="cat-tooltip-title">{tooltipInfo.cat}</div>
            <div className="cat-tooltip-meta">{(categoryCountsMap[tooltipInfo.cat]||0)} εγγραφές • {(categoryPoints[tooltipInfo.cat]||0)} σημεία</div>
            {categoryTopCustomers[tooltipInfo.cat] && categoryTopCustomers[tooltipInfo.cat].length > 0 && (
              <div className="cat-tooltip-list">
                <div style={{fontWeight:700,marginBottom:6}}>Top πελάτες</div>
                <ul style={{margin:0,paddingLeft:12}}>
                  {categoryTopCustomers[tooltipInfo.cat].map(tc => (
                    <li key={tc.name} style={{fontSize:12}}>{tc.name} — {tc.count}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

