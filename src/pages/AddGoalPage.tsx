import React, { useEffect, useMemo, useState } from 'react'
import { saveGoal, loadAllGoals, loadEntriesForMonth, Goal, DailyEntry } from '../services/storage'
import { useNavigate } from 'react-router-dom'
import { showNotification } from '../utils/notifications'
import PageHeader from '../components/PageHeader'
import { safeJsonParse, safeLocalStorageGet, safeLocalStorageSet } from '../utils/safeLocalStorage'

export default function AddGoalPage(){
  const navigate = useNavigate()
  const now = new Date()
  const [category, setCategory] = useState('')
  const [target, setTarget] = useState<number | ''>('')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()+1)
  const [notes, setNotes] = useState('')
  const [color, setColor] = useState('#7c3aed')
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [toastMsg, setToastMsg] = useState('')

  // Static categories copied from the Android AddGoalActivity
  const STATIC_CATEGORIES = [
    'PORTIN MOBILE',
    'EXPREPAY',
    'VODAFONE HOME W/F',
    'MIGRATION FTTH',
    'POST2POST',
    'EC2POST',
    'FIRST',
    'NEW CONNECTION',
    'ΡΑΝΤΕΒΟΥ',
    'ΣΥΣΚΕΥΕΣ',
    'TV',
    'MIGRATION VDSL'
  ]

  useEffect(()=>{
    // load past goal categories to suggest, merged with static categories
    loadAllGoals().then((goals: Goal[]) => {
      const past = Array.from(new Set(goals.map((g: Goal) => String(g.category || g.title || '').toUpperCase()).filter(Boolean))) as string[]
      const merged = Array.from(new Set([...STATIC_CATEGORIES, ...past]))
      setSuggestions(merged)
      if(!category && merged.length) setCategory(merged[0])
    })
  }, [])

  // helper to persist goal category suggestions locally
  const persistCategorySuggestion = (value: string) => {
    if (!value) return
    try {
      const key = 'ws_suggestions_goal_category'
      const raw = safeJsonParse<any[]>(safeLocalStorageGet(key), [])
      const arr = Array.isArray(raw) ? raw : []
      const upper = value.toUpperCase()
      const filtered = arr.filter((x: string) => x.toUpperCase() !== upper)
      const next = [upper, ...filtered].slice(0, 30)
      safeLocalStorageSet(key, JSON.stringify(next))
    } catch (e) {
      console.warn('persist category suggestion', e)
    }
  }

  const validate = () => {
    const errs: string[] = []
    if(!String(category || '').trim()) errs.push('Η κατηγορία είναι απαραίτητη')
    const tnum = typeof target === 'number' ? target : parseFloat(String(target||'0'))
    if(!tnum || tnum <= 0) errs.push('Ο στόχος πρέπει να είναι μεγαλύτερος του 0')
    setErrors(errs)
    return errs.length === 0
  }

  // preview achieved for this category/month
  const [achieved, setAchieved] = useState(0)
  useEffect(()=>{
    let mounted = true
    loadEntriesForMonth(year, month).then((entries: DailyEntry[]) => {
      if(!mounted) return
  const key = String(category || '').toUpperCase()
  const filtered = entries.filter((e: DailyEntry) => String(e.category || '').toUpperCase() === key)
      const sum = filtered.reduce((s: number, e: DailyEntry)=> s + (e.points||0), 0)
      setAchieved(sum)
      setEntries(filtered.slice().sort((a,b)=> (b.date||'').localeCompare(a.date)))
    })
    return ()=>{ mounted = false }
  }, [category, year, month])

  const years = useMemo(()=>{
    const y = now.getFullYear()
    return [y, y+1]
  }, [now])

  // derived preview values
  const safeTarget = (typeof target === 'number' && target > 0) ? target : (parseFloat(String(target || '0')) || 0)
  const percent = safeTarget > 0 ? Math.round((achieved / safeTarget) * 100) : 0
  const percentClamped = Math.max(0, Math.min(100, percent))

  const onSave = async () =>{
    if(!validate()) return
    setSaving(true)
    try{
      const parsedTarget = typeof target === 'number' ? target : parseFloat(String(target))
      const normalizedCategory = String(category || '').toUpperCase()
      // persist category suggestion for future use
      persistCategorySuggestion(normalizedCategory)
      // Save goal using category as primary label and include notes/color
      await saveGoal({ category: normalizedCategory, title: '', target: parsedTarget, year, month, notes, color })
      setToastMsg('Ο στόχος αποθηκεύτηκε')
      showNotification('Στόχος αποθηκεύτηκε', { body: `${normalizedCategory} — στόχος ${parsedTarget}` })
      setTimeout(()=> navigate('/'), 600)
    }catch(e){
      console.error(e)
      setErrors(['Σφάλμα αποθήκευσης'])
    }finally{ setSaving(false) }
  }

  // quick validity flag for disabling the save button
  const isValid = String(category || '').trim().length > 0 && (typeof target === 'number' ? target > 0 : parseFloat(String(target||'0')) > 0)

  // transient inline toast
  useEffect(()=>{
    if(!toastMsg) return
    const t = setTimeout(()=> setToastMsg(''), 1800)
    return ()=> clearTimeout(t)
  }, [toastMsg])

  return (
    <div style={{minHeight: 'calc(100vh - 100px)', padding:'20px 12px'}}>
      <PageHeader
        title="Προσθήκη στόχου"
        subtitle="Δημιούργησε νέο μηνιαίο στόχο"
        breadcrumb="Στόχοι"
      />
      <div className="space-y-4" style={{width:'100%', maxWidth:1400, margin:'0 auto'}}>

      <section className="panel-card grid grid-cols-1 md:grid-cols-3 gap-4" style={{padding:'14px', width:'100%'}}>
        {/* Form column (2/3 width on md+) */}
        <div className="md:col-span-2">
          <div>
            <div className="form-row" style={{marginBottom:10}}>
              <label className="text-sm font-medium">Κατηγορία / Περιγραφή</label>
              <div style={{flex:1}}>
                <div style={{display:'flex',gap:8}}>
                  <select className="panel-input" value={category} onChange={e=> setCategory(e.target.value ? e.target.value.toUpperCase() : '')} aria-label="Επιλογή κατηγορίας στόχου" style={{fontSize: '1rem', padding:'8px'}}>
                    {suggestions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input aria-label="Ή νέα κατηγορία" className="panel-input" placeholder="ή νέα κατηγορία" value={category} onChange={e=> setCategory(e.target.value ? e.target.value.toUpperCase() : '')} style={{fontSize: '1rem', padding:'8px'}} />
                </div>
                {errors.some(er=> er.includes('κατηγορ')) && <div role="alert" className="text-sm text-red-300 mt-1">Η κατηγορία είναι απαραίτητη.</div>}
              </div>
            </div>

            <div className="form-row" style={{marginBottom:10}}>
              <label className="text-sm font-medium">Στόχος (μονάδες)</label>
              <div style={{flex:1}}>
                <input aria-label="Στόχος" className="panel-input" inputMode="decimal" step="0.01" type="number" min={0} value={target} onChange={e=> setTarget(e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="π.χ. 150.5" aria-invalid={errors.some(er=> er.includes('στόχος'))} style={{padding:'8px'}} />
                <div className="muted text-xs mt-1">Συνολικές μονάδες (δεκαδικό επιτρέπεται).</div>
                {errors.some(er=> er.includes('στόχος')) && <div role="alert" className="text-sm text-red-300 mt-1">Ο στόχος πρέπει να είναι αριθμός μεγαλύτερος του 0.</div>}
              </div>
            </div>

            <div className="form-row" style={{marginBottom:10}}>
              <label className="text-sm font-medium">Μήνας / Έτος</label>
              <div style={{flex:1, display:'flex', gap:8}}>
                <select className="panel-input" value={month} onChange={e=> setMonth(parseInt(e.target.value))} aria-label="Επιλογή μήνα" style={{padding:'8px'}}>
                  {[...Array(12)].map((_,i)=> <option key={i} value={i+1}>{i+1}</option>)}
                </select>
                <select className="panel-input" value={year} onChange={e=> setYear(parseInt(e.target.value))} aria-label="Επιλογή έτους" style={{padding:'8px'}}>
                  {years.map(y=> <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row" style={{marginBottom:10}}>
              <label className="text-sm font-medium">Σημειώσεις (προαιρετικά)</label>
              <textarea className="panel-input" rows={2} value={notes} onChange={e=> setNotes(e.target.value)} placeholder="Πρόσθεσε οδηγίες ή υπενθύμιση..." style={{minHeight:64, padding:'8px'}} />
            </div>

            <div className="form-row" style={{marginBottom:6}}>
              <label className="text-sm font-medium">Χρώμα κάρτας</label>
              <div style={{flex:1, display:'flex', alignItems:'center', gap:8}}>
                <input type="color" className="w-10 h-8 p-0 border-0" value={color} onChange={e=> setColor(e.target.value)} aria-label="Επιλογή χρώματος" />
                <div className="muted text-sm">Εμφάνιση στην κάρτα στόχου</div>
              </div>
            </div>

            {errors.length > 0 && (
              <div role="alert" className="mt-2 text-sm text-red-300">
                {errors.map((er,i)=>(<div key={i}>{er}</div>))}
              </div>
            )}

            <div className="flex items-center gap-3 mt-4">
              <button className="btn" onClick={onSave} disabled={saving}>{saving ? 'Αποθήκευση...' : 'Αποθήκευση στόχου'}</button>
              <button className="btn-ghost" onClick={()=> navigate(-1)} aria-label="Ακύρωση">Ακύρωση</button>
            </div>
          </div>
        </div>

        {/* Preview column (1/3 width) */}
        <aside className="md:col-span-1">
          <div className="card">
            {/* CSS-first placeholder: centered pill with icon + label */}
              <div style={{marginBottom:8, borderRadius:8, overflow:'hidden'}} aria-hidden>
                <div style={{height:80,display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(90deg,#eef2ff,#fff7f7)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'6px 12px',borderRadius:999,background:'linear-gradient(90deg, rgba(124,58,237,0.10), rgba(255,107,138,0.05))'}}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <rect x="3" y="10" width="3" height="8" rx="1" fill="#7c3aed" />
                    <rect x="9" y="6" width="3" height="12" rx="1" fill="#7c3aed" fillOpacity="0.8" />
                    <rect x="15" y="14" width="3" height="4" rx="1" fill="#ff6b8a" />
                  </svg>
                  <div style={{display:'flex',flexDirection:'column'}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#1f2937'}}>Προεπισκόπηση</div>
                    <div style={{fontSize:12,color:'rgba(31,41,55,0.6)'}}>Θα εμφανίζεται έτσι στην αρχική σελίδα</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:48,height:48,borderRadius:12,background:color}}></div>
              <div>
                <div style={{fontWeight:700,color:'#fff'}}>{category || 'Προεπισκόπηση στόχου'}</div>
                <div className="muted text-sm">{category || 'Κατηγορία'}</div>
              </div>
            </div>

            <div style={{marginTop:14}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div className="muted text-sm">Πρόοδος μήνα</div>
                <div className="text-sm" style={{fontWeight:700}}>{safeTarget > 0 ? `${percentClamped}%` : '—'}</div>
              </div>
              <div className="stat-bar" style={{marginTop:8}}>
                <div className="fill" style={{width: `${percentClamped}%`, background: 'linear-gradient(90deg,#7c3aed,#ff6b8a)'}} />
              </div>
              <div className="muted text-sm mt-2">{achieved} / {target || '—'}</div>

              {entries && entries.length > 0 && (
                <div style={{marginTop:12}}>
                  <div className="muted text-sm">Πρόσφατες καταχωρήσεις</div>
                  <ul style={{marginTop:8, paddingLeft:16}}>
                    {entries.slice(0,3).map(en => (
                      <li key={en.id} className="text-sm" style={{marginBottom:6}}>{new Date(en.date).toLocaleDateString()} — {en.points} μον.</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="muted text-xs mt-4">Η προεπισκόπηση δείχνει πώς θα εμφανίζεται ο στόχος στην αρχική σελίδα.</div>
          </div>
        </aside>
      </section>
      {/* transient toast */}
      {toastMsg && (
        <div style={{position:'fixed',right:20,bottom:20,background:'linear-gradient(90deg,#7c3aed,#5b21b6)',color:'#fff',padding:'12px 16px',borderRadius:10,boxShadow:'0 8px 30px rgba(0,0,0,0.4)'}} role="status">
          {toastMsg}
        </div>
      )}
      </div>
    </div>
  )
}

