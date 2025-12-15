import React, {useEffect, useState} from 'react'
import { saveEntry, loadAllGoals, loadAllEntries, Goal, DailyEntry } from '../services/storage'
import { useNavigate } from 'react-router-dom'
import { showNotification } from '../utils/notifications'
import PageHeader from '../components/PageHeader'

export default function AddEntryPage(){
  const navigate = useNavigate()
  const [points, setPoints] = useState<number | ''>('')
  const [category, setCategory] = useState('')
  const [homeType, setHomeType] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [afm, setAfm] = useState('')
  const [mobilePhone, setMobilePhone] = useState('')
  const [landlinePhone, setLandlinePhone] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [recent, setRecent] = useState<DailyEntry[]>([])
  const [appointmentCounts, setAppointmentCounts] = useState<Record<number, number>>({})

  // Static categories borrowed from Android AddGoalActivity
  const STATIC_CATEGORIES = [
    'PortIN mobile','Exprepay','Vodafone Home W/F','Migration FTTH','Post2post','Ec2post','First','New Connection','Ραντεβού','Συσκευές','TV','Migration VDSL'
  ]
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
  const APPOINTMENT_AMOUNTS = [6.85, 15.31, 10.47, 40.32]

  useEffect(()=>{
    loadAllGoals().then((goals: Goal[]) => {
      const past = Array.from(new Set(goals.map((g: Goal) => String(g.category || g.title || '')).filter(Boolean))) as string[]
      setSuggestions(Array.from(new Set([...STATIC_CATEGORIES, ...past])) as string[])
      if(!category && STATIC_CATEGORIES.length) setCategory(STATIC_CATEGORIES[0])
    }).catch(()=>{
      setSuggestions(STATIC_CATEGORIES)
      if(!category) setCategory(STATIC_CATEGORIES[0])
    })
    // load recent entries for quick reference
    loadAllEntries().then((entries: DailyEntry[]) => {
      const sorted = (entries || []).sort((a,b)=> b.date.localeCompare(a.date))
      setRecent(sorted.slice(0,6))
    }).catch(()=>{})
  }, [])

  useEffect(()=>{
    if(category === 'Vodafone Home W/F'){
      if(!HOME_TYPE_OPTIONS.includes(homeType)){
        setHomeType(HOME_TYPE_OPTIONS[0])
      }
    }else{
      if(homeType) setHomeType('')
    }
  }, [category, homeType])

  useEffect(()=>{
    if(category === 'Ραντεβού'){
      if(!orderNumber.trim()) setOrderNumber('Team Ready')
    }else if(orderNumber === 'Team Ready'){
      setOrderNumber('')
    }
  }, [category, orderNumber])

  useEffect(()=>{
    if(category !== 'Ραντεβού' && Object.keys(appointmentCounts).length){
      setAppointmentCounts({})
    }
  }, [category, appointmentCounts])

  useEffect(()=>{
    if(category === 'Ραντεβού'){
      const total = APPOINTMENT_AMOUNTS.reduce((sum, amt)=> sum + (appointmentCounts[amt] || 0) * amt, 0)
      setPoints(total ? Number(total.toFixed(2)) : 0)
    }
  }, [appointmentCounts, category])

  const adjustAppointmentCount = (amount:number, delta:number) => {
    setAppointmentCounts(prev => {
      const current = prev[amount] || 0
      const next = Math.max(0, current + delta)
      if(next === current) return prev
      const updated = {...prev}
      if(next === 0){
        delete updated[amount]
      }else{
        updated[amount] = next
      }
      return updated
    })
  }

  const setAppointmentCount = (amount:number, count:number) => {
    setAppointmentCounts(prev => {
      const next = Math.max(0, count)
      const updated = {...prev}
      if(next === 0){
        delete updated[amount]
      }else{
        updated[amount] = next
      }
      return updated
    })
  }

  const validate = () =>{
    const errs:string[] = []
    const appointmentTotal = APPOINTMENT_AMOUNTS.reduce((sum, amt) => sum + (appointmentCounts[amt] || 0) * amt, 0)
    const val = category === 'Ραντεβού'
      ? appointmentTotal
      : (typeof points === 'number' ? points : parseFloat(String(points || '0')))
    if(!category || !category.trim()) errs.push('Επίλεξε ή γράψε κατηγορία')
    if(!orderNumber || !orderNumber.trim()) errs.push('Πρόσθεσε αριθμό παραγγελίας')
    if(!customerName || !customerName.trim()) errs.push('Πρόσθεσε ονοματεπώνυμο πελάτη')
    if(category === 'Ραντεβού'){
      if(appointmentTotal <= 0) errs.push('Πρόσθεσε τουλάχιστον ένα ποσό για ραντεβού')
    }else if(!val || val <= 0){
      errs.push('Πρόσθεσε έγκυρα σημεία (>0)')
    }
    setErrors(errs)
    return errs.length === 0
  }

  const submit = async ()=>{
    if(!validate()) return
    setSaving(true)
    try{
      const parsed = category === 'Ραντεβού'
        ? APPOINTMENT_AMOUNTS.reduce((sum, amt) => sum + (appointmentCounts[amt] || 0) * amt, 0)
        : (typeof points === 'number' ? points : parseFloat(String(points)))
  await saveEntry({ points: parsed, date: new Date().toISOString(), category, homeType, orderNumber, customerName, afm, mobilePhone, landlinePhone })
      setToast('Η καταχώρηση αποθηκεύτηκε')
      showNotification('Καταχώρηση', { body: `${category} — ${parsed} μον. — ${orderNumber}` })
      setTimeout(()=> navigate('/'), 600)
    }catch(e){
      console.error(e)
      setErrors(['Σφάλμα αποθήκευσης'])
    }finally{ setSaving(false) }
  }

  return (
    <div style={{minHeight: 'calc(100vh - 120px)', padding:'28px 16px', paddingTop:'240px'}}>
      <PageHeader
        title="Καταχώρηση Παραγωγής"
        subtitle="Πρόσθεσε γρήγορα μια εγγραφή — εμφανίζεται στο μηνιαίο dashboard."
        breadcrumb="Καταχωρήσεις"
      />
      <div className="space-y-4" style={{width:'100%', maxWidth:1400, margin:'0 auto'}}>

      <section className="panel-card grid grid-cols-1 md:grid-cols-3 gap-6" style={{width:'100%'}}>
        <form className="md:col-span-2" onSubmit={(e)=>{e.preventDefault(); submit()}}>
          <div className="form-row">
            <label className="text-sm font-medium">Κατηγορία</label>
            <div style={{flex:1}}>
              <div style={{display:'flex',gap:12}}>
                <select className="panel-input" value={category} onChange={e=> setCategory(e.target.value)} aria-label="Επιλογή κατηγορίας">
                  {suggestions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input className="panel-input" placeholder="ή νέα κατηγορία" value={category} onChange={e=> setCategory(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-row">
            <label className="text-sm font-medium">Αρ. παραγγελίας</label>
            <div style={{flex:1}}>
              <input className="panel-input" placeholder="π.χ. 2025-000123" value={orderNumber} onChange={e=> setOrderNumber(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label className="text-sm font-medium">Ονοματεπώνυμο πελάτη</label>
            <div style={{flex:1}}>
              <input className="panel-input" placeholder="π.χ. Γεώργιος Παπαδόπουλος" value={customerName} onChange={e=> setCustomerName(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label className="text-sm font-medium">Κινητό (προαιρετικό)</label>
            <div style={{flex:1}}>
              <input className="panel-input" placeholder="π.χ. 69xxxxxxxx" value={mobilePhone} onChange={e=> setMobilePhone(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label className="text-sm font-medium">Σταθερό (προαιρετικό)</label>
            <div style={{flex:1}}>
              <input className="panel-input" placeholder="π.χ. 210xxxxxxx" value={landlinePhone} onChange={e=> setLandlinePhone(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label className="text-sm font-medium">ΑΦΜ (προαιρετικό)</label>
            <div style={{flex:1}}>
              <input className="panel-input" placeholder="π.χ. 123456789" value={afm} onChange={e=> setAfm(e.target.value)} />
            </div>
          </div>

          {category === 'Vodafone Home W/F' && (
            <div className="form-row">
              <label className="text-sm font-medium">Υποτύπος</label>
              <div style={{flex:1}}>
                <select className="panel-input" value={homeType} onChange={e=> setHomeType(e.target.value)} aria-label="Επιλογή υποτύπου Vodafone Home">
                  {HOME_TYPE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
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
                value={points}
                onChange={e=> setPoints(e.target.value === '' ? '' : parseFloat(e.target.value))}
                aria-label="Μονάδες"
                readOnly={category === 'Ραντεβού'}
                style={category === 'Ραντεβού' ? {background:'rgba(148,163,184,0.08)'} : undefined}
              />
              <div className="muted text-xs mt-1">
                {category === 'Ραντεβού' ? 'Το ποσό υπολογίζεται αυτόματα από τις επιλογές ραντεβού.' : 'Χρησιμοποίησε δεκαδικά αν χρειάζεται (π.χ. 12.5).'}
              </div>
            </div>
          </div>

          {category === 'Ραντεβού' && (
            <div className="form-row" style={{alignItems:'flex-start'}}>
              <label className="text-sm font-medium" style={{marginTop:8}}>Ποσά ραντεβού</label>
              <div style={{flex:1}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12}}>
                  {APPOINTMENT_AMOUNTS.map(amount => {
                    const count = appointmentCounts[amount] || 0
                    return (
                      <div key={amount} className="panel-card" style={{padding:'12px 14px',display:'flex',flexDirection:'column',gap:10}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{fontWeight:600}}>{amount.toFixed(2)} €</span>
                          <span className="muted text-xs">Σύνολο: {(count * amount).toFixed(2)} €</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={()=> adjustAppointmentCount(amount, -1)}
                            disabled={count === 0}
                            style={{minWidth:36,justifyContent:'center',padding:'6px 0'}}
                            aria-label={`Μείωσε το ποσό ${amount.toFixed(2)} ευρώ`}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={count}
                            onChange={e=> {
                              const parsedValue = Number(e.target.value)
                              setAppointmentCount(amount, Number.isFinite(parsedValue) ? Math.floor(parsedValue) : 0)
                            }}
                            className="panel-input"
                            style={{width:72,textAlign:'center'}}
                            aria-label={`Φορές επιλογής ποσού ${amount.toFixed(2)} ευρώ`}
                          />
                          <button
                            type="button"
                            className="btn"
                            onClick={()=> adjustAppointmentCount(amount, 1)}
                            style={{minWidth:36,justifyContent:'center',padding:'6px 0'}}
                            aria-label={`Αύξησε το ποσό ${amount.toFixed(2)} ευρώ`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="muted text-xs" style={{marginTop:8}}>Όρισε πόσες φορές εφαρμόζεται κάθε ποσό· το άθροισμα προστίθεται αυτόματα.</div>
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div role="alert" className="text-sm text-red-300" style={{marginTop:8}}>
              {errors.map((er,i)=>(<div key={i}>{er}</div>))}
            </div>
          )}

          <div style={{display:'flex',gap:12,marginTop:12,alignItems:'center'}}>
            <button className="btn" type="submit" disabled={saving} aria-disabled={saving} style={{minWidth:160}}>{saving ? 'Αποθήκευση...' : 'Αποθήκευση'}</button>
            <button className="btn-ghost" type="button" onClick={()=> navigate(-1)}>Ακύρωση</button>
          </div>
        </form>

        <aside className="md:col-span-1">
          <div className="card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div>
                <div className="font-semibold">Πρόσφατες καταχωρήσεις</div>
                <div className="muted text-xs">Γρήγορη επισκόπηση των τελευταίων εγγραφών</div>
              </div>
              <div style={{width:36,height:36,borderRadius:8,background:'linear-gradient(90deg,#7c3aed,#ff6b8a)'}} aria-hidden />
            </div>
            <div className="mt-3 space-y-2">
              {recent.length === 0 && <div className="muted text-sm">Δεν υπάρχουν πρόσφατες καταχωρήσεις.</div>}
              {recent.map(r => (
                <div key={r.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.category} {r.homeType ? `• ${r.homeType}` : ''}</div>
                    <div className="muted text-xs">{new Date(r.date).toLocaleString()}</div>
                    <div className="text-xs muted">{r.orderNumber ? `Αρ. παραγγελίας: ${r.orderNumber}` : ''}{r.customerName ? ` — ${r.customerName}` : ''}</div>
                  </div>
                  <div className="font-semibold">{r.points}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      {toast && <div className="toast fixed top-6 right-6 bg-green-700 text-white px-4 py-2 rounded shadow">{toast}</div>}
      </div>
    </div>
  )
}
