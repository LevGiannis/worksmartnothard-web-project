import React, {useEffect, useMemo, useState} from 'react'
import { DailyEntry, loadAllEntries, updateEntry } from '../services/storage'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { formatNumber } from '../utils/formatNumber'

export default function HistoryPage(){
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [editing, setEditing] = useState<DailyEntry | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const [category, setCategory] = useState('')
  const [points, setPoints] = useState<number | ''>('')
  const [dateOnly, setDateOnly] = useState('')
  const [homeType, setHomeType] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [afm, setAfm] = useState('')
  const [mobilePhone, setMobilePhone] = useState('')
  const [landlinePhone, setLandlinePhone] = useState('')

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
    setEntries(all)
  }

  useEffect(()=>{
    reload()

    const onChange = () => { reload().catch(()=>{}) }
    window.addEventListener('ws:entries-updated' as any, onChange)
    return () => window.removeEventListener('ws:entries-updated' as any, onChange)
  }, [])

  const reversed = useMemo(() => entries.slice().reverse(), [entries])

  const openEdit = (e: DailyEntry) => {
    setEditing(e)
    setErrors([])
    setCategory(String(e.category || '').toUpperCase())
    setPoints(typeof e.points === 'number' ? e.points : '')
    // yyyy-mm-dd for <input type="date">
    try{
      const d = e.date ? new Date(e.date) : new Date()
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth()+1).padStart(2,'0')
      const dd = String(d.getDate()).padStart(2,'0')
      setDateOnly(`${yyyy}-${mm}-${dd}`)
    }catch{
      setDateOnly('')
    }
    setHomeType(String(e.homeType || ''))
    setOrderNumber(String(e.orderNumber || ''))
    setCustomerName(String(e.customerName || ''))
    setAfm(String(e.afm || ''))
    setMobilePhone(String(e.mobilePhone || ''))
    setLandlinePhone(String(e.landlinePhone || ''))
  }

  const closeEdit = () => {
    if (saving) return
    setEditing(null)
    setErrors([])
  }

  const validate = () => {
    const errs: string[] = []
    const categoryUpper = String(category || '').toUpperCase().trim()
    const pts = typeof points === 'number' ? points : parseFloat(String(points || '0'))
    if (!categoryUpper) errs.push('Επίλεξε ή γράψε κατηγορία')
    if (!orderNumber.trim()) errs.push('Πρόσθεσε αριθμό παραγγελίας')
    if (!customerName.trim()) errs.push('Πρόσθεσε ονοματεπώνυμο πελάτη')
    if (!pts || pts <= 0) errs.push('Πρόσθεσε έγκυρα σημεία (>0)')
    setErrors(errs)
    return errs.length === 0
  }

  const submitEdit = async () => {
    if (!editing) return
    if (!validate()) return

    setSaving(true)
    try{
      const categoryUpper = String(category || '').toUpperCase().trim()
      const pts = typeof points === 'number' ? points : parseFloat(String(points || '0'))

      // keep date stable across TZ shifts by using midday local time
      const isoDate = dateOnly
        ? new Date(`${dateOnly}T12:00:00`).toISOString()
        : (editing.date || new Date().toISOString())

      const nextPatch: Partial<DailyEntry> = {
        category: categoryUpper,
        points: Number(pts),
        date: isoDate,
        homeType: categoryUpper === 'VODAFONE HOME W/F' ? homeType : '',
        orderNumber: orderNumber.trim(),
        customerName: customerName.trim(),
        afm: afm.trim(),
        mobilePhone: mobilePhone.trim(),
        landlinePhone: landlinePhone.trim()
      }

      await updateEntry(editing.id, nextPatch)
      await reload()
      setEditing(null)
    }catch(e){
      console.error(e)
      setErrors(['Σφάλμα ενημέρωσης καταχώρησης'])
    }finally{
      setSaving(false)
    }
  }

  return (
    <div style={{padding:'28px 16px', paddingTop:'220px'}}>
      <PageHeader
        title="History"
        subtitle="Χρονολογική λίστα καταχωρήσεων"
        breadcrumb="History"
      />

      <div style={{maxWidth:1400, margin:'0 auto', width:'100%'}}>
        <div className="panel-card" style={{marginBottom:20}}>
          <h2 className="heading-xl font-extrabold" style={{fontSize:'1.3rem', margin:0}}>Καταχωρήσεις</h2>
          <div className="muted" style={{marginTop:4}}>Δες τις πρόσφατες ενέργειες με σειρά αναστροφής.</div>
        </div>

        <div className="grid gap-2">
          {reversed.map(e=> (
            <div key={e.id} className="panel-card flex items-center justify-between" style={{padding:'16px 18px', gap: 14}}>
              <div className="flex items-center gap-3" style={{minWidth:0}}>
                <div className="w-10 h-10 rounded-md bg-primary-50 flex items-center justify-center text-sm font-medium text-primary-700">{(e.category||'E').charAt(0)}</div>
                <div style={{minWidth:0}}>
                  <div className="font-medium" style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{e.category || 'Entry'}</div>
                  <div className="text-sm text-gray-500">{new Date(e.date).toLocaleDateString()}</div>
                </div>
              </div>

              <div style={{display:'flex', alignItems:'center', gap: 12, flexShrink:0}}>
                <div className="text-sm" style={{minWidth:90, textAlign:'right'}}>{formatNumber(e.points || 0, 2)} {String(e.category).toUpperCase() === 'ΡΑΝΤΕΒΟΥ' ? '€' : 'pts'}</div>
                <button className="btn-ghost" onClick={()=> openEdit(e)}>Επεξεργασία</button>
              </div>
            </div>
          ))}
          {entries.length === 0 && <div className="panel-card muted">Δεν υπάρχουν καταχωρήσεις.</div>}
        </div>
      </div>

      <Modal
        isOpen={!!editing}
        title={editing ? `Επεξεργασία: ${editing.category || 'Entry'}` : 'Επεξεργασία'}
        onClose={closeEdit}
        size="md"
        height="short"
      >
        <div className="grid gap-3">
          {errors.length > 0 && (
            <div className="panel-card" style={{padding:'12px 14px'}}>
              <div style={{fontWeight:700, marginBottom:6}}>Διόρθωσε τα παρακάτω:</div>
              <ul style={{margin:0, paddingLeft:18}}>
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <div className="form-row">
            <label className="text-sm font-medium">Κατηγορία</label>
            <div style={{flex:1}}>
              <input className="panel-input" value={category} onChange={e=> setCategory(e.target.value ? e.target.value.toUpperCase() : '')} />
            </div>
          </div>

          <div className="form-row">
            <label className="text-sm font-medium">Ημερομηνία</label>
            <div style={{flex:1}}>
              <input className="panel-input" type="date" value={dateOnly} onChange={e=> setDateOnly(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label className="text-sm font-medium">Αρ. παραγγελίας</label>
            <div style={{flex:1}}>
              <input className="panel-input" value={orderNumber} onChange={e=> setOrderNumber(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label className="text-sm font-medium">Ονοματεπώνυμο πελάτη</label>
            <div style={{flex:1}}>
              <input className="panel-input" value={customerName} onChange={e=> setCustomerName(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label className="text-sm font-medium">Κινητό (προαιρετικό)</label>
            <div style={{flex:1}}>
              <input className="panel-input" value={mobilePhone} onChange={e=> setMobilePhone(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label className="text-sm font-medium">Σταθερό (προαιρετικό)</label>
            <div style={{flex:1}}>
              <input className="panel-input" value={landlinePhone} onChange={e=> setLandlinePhone(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label className="text-sm font-medium">ΑΦΜ (προαιρετικό)</label>
            <div style={{flex:1}}>
              <input className="panel-input" value={afm} onChange={e=> setAfm(e.target.value)} />
            </div>
          </div>

          {String(category || '').toUpperCase() === 'VODAFONE HOME W/F' && (
            <div className="form-row">
              <label className="text-sm font-medium">Υποτύπος</label>
              <div style={{flex:1}}>
                <select className="panel-input" value={homeType} onChange={e=> setHomeType(e.target.value)}>
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
                value={points}
                onChange={e=> setPoints(e.target.value === '' ? '' : parseFloat(e.target.value))}
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
  )
}
