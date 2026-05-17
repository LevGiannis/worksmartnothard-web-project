import React, { useEffect, useMemo, useRef, useState } from 'react'
import { loadPendingItems, savePendingItem, updatePendingItem, deletePendingItem, PendingItem, loadAllGoals, Goal } from '../services/storage'
import PageHeader from '../components/PageHeader'
import { STATIC_PENDING_TYPES } from '../constants'

export default function PendingsPage(){
  const [items, setItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)

  // form state (new model)
  const [idEditing, setIdEditing] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [mobile, setMobile] = useState('')
  const [landline, setLandline] = useState('')
  const [afm, setAfm] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [pendingType, setPendingType] = useState('')
  const [pendingTypeOptions, setPendingTypeOptions] = useState<string[]>([])
  // modal edit state
  const [showEditModal, setShowEditModal] = useState(false)
  const [modalItem, setModalItem] = useState<PendingItem | null>(null)
  const [modalCustomerName, setModalCustomerName] = useState('')
  const [modalMobile, setModalMobile] = useState('')
  const [modalLandline, setModalLandline] = useState('')
  const [modalAfm, setModalAfm] = useState('')
  const [modalDescription, setModalDescription] = useState('')
  const [modalDueDate, setModalDueDate] = useState('')
  const [modalNotes, setModalNotes] = useState('')
  const [modalPendingType, setModalPendingType] = useState('')
  const modalFirstInputRef = useRef<HTMLInputElement | null>(null)

  function closeModal(){ setShowEditModal(false); setModalItem(null) }

  useEffect(()=>{
    if(!showEditModal) return
    // autofocus first input when modal opens
    setTimeout(()=> modalFirstInputRef.current?.focus(), 80)
    const onKey = (ev:KeyboardEvent) => { if(ev.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  }, [showEditModal])

  useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      const all = await loadPendingItems()
      if(!mounted) return
      setItems(all || [])
      setLoading(false)
    })()
    return ()=>{ mounted = false }
  }, [])

  useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      try{
        const goals = await loadAllGoals()
        const categories = Array.from(new Set(goals.map((g:Goal)=> String(g.category||g.title||'')).filter(Boolean)))
        const merged = Array.from(new Set([...STATIC_PENDING_TYPES, ...categories]))
        if(!mounted) return
        setPendingTypeOptions(merged)
      }catch(e){
        if(!mounted) return
        setPendingTypeOptions(STATIC_PENDING_TYPES)
      }
    })()
    return ()=>{ mounted = false }
  }, [])

  function resetForm(){
    setIdEditing(null)
    setCustomerName('')
    setMobile('')
    setLandline('')
    setAfm('')
    setDescription('')
    setDueDate('')
    setNotes('')
    setPendingType('')
  }

  async function onCreateOrUpdate(e?:React.FormEvent){
    if(e) e.preventDefault()
    // basic validation
    if(!customerName.trim()){ alert('Παρακαλώ συμπληρώστε όνομα πελάτη'); return }
    if(!description.trim()){ alert('Παρακαλώ συμπληρώστε περιγραφή'); return }
    const payload = { customerName, mobile, landline, afm, description, dueDate, notes, pendingType }
    if(idEditing){
      const updated = await updatePendingItem(idEditing, payload)
      setItems(prev => prev.map(p => p.id === idEditing ? (updated || p) : p))
    } else {
      const p = await savePendingItem(payload)
      setItems(prev => [p, ...prev])
    }
    resetForm()
  }

  async function onEdit(item:PendingItem){
    // open modal populated with item values (new model)
    setModalItem(item)
    setModalCustomerName(item.customerName || '')
    setModalMobile(item.mobile || '')
    setModalLandline(item.landline || '')
    setModalAfm(item.afm || '')
    setModalDescription(item.description || '')
    setModalDueDate(item.dueDate || '')
    setModalNotes(item.notes || '')
    setModalPendingType(item.pendingType || '')
    setShowEditModal(true)
  }

  async function onDelete(id:string){
    if(!confirm('Διαγραφή εκκρεμότητας; Αυτή η ενέργεια δεν αναστρέφεται.')) return
    const ok = await deletePendingItem(id)
    if(ok) setItems(prev => prev.filter(p => p.id !== id))
  }

  const count = items.length

  return (
  <div style={{padding:20, paddingTop: '220px'}}>
      <PageHeader
        title="Εκκρεμότητες"
        subtitle="Δημιούργησε και διαχειρίσου εκκρεμότητες πελατών"
        breadcrumb="Εκκρεμότητες"
      />

  <div style={{display:'flex',gap:20,alignItems:'stretch',width:'100%', maxWidth:1400, margin:'0 auto'}}>
        <section className="panel-card" style={{flex:1,display:'flex',flexDirection:'column',minWidth:0, minHeight:360, maxHeight:360}}>
          <form onSubmit={onCreateOrUpdate} style={{display:'flex',flexDirection:'column',gap:10,flex:1}}>
            <div>
              <input className="panel-input" placeholder="Όνομα πελάτη" value={customerName} onChange={e=> setCustomerName(e.target.value)} />
            </div>
            <div style={{display:'flex',gap:8}}>
              <input className="panel-input" placeholder="Κινητό" value={mobile} onChange={e=> setMobile(e.target.value)} />
              <input className="panel-input" placeholder="Σταθερό" value={landline} onChange={e=> setLandline(e.target.value)} />
              <input className="panel-input" placeholder="ΑΦΜ" value={afm} onChange={e=> setAfm(e.target.value)} />
            </div>
            <div style={{display:'flex',gap:8}}>
              <input className="panel-input" placeholder="Προθεσμία" type="date" value={dueDate} onChange={e=> setDueDate(e.target.value)} />
              <select className="panel-input" value={pendingType} onChange={e=> setPendingType(e.target.value)}>
                <option value="">Επιλέξτε τύπο εκκρεμότητας</option>
                {pendingTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <input className="panel-input" placeholder="Περιγραφή / Τι αφορά" value={description} onChange={e=> setDescription(e.target.value)} />
            </div>
            <div style={{flexBasis:0}}>
              <textarea className="panel-input" placeholder="Σημειώσεις" value={notes} onChange={e=> setNotes(e.target.value)} style={{height:60,width:'100%',resize:'none',overflow:'auto'}} />
            </div>

            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:'auto'}}>
              {idEditing && <button type="button" className="btn-ghost" onClick={resetForm} aria-label="Άκυρο">Άκυρο</button>}
              <button className="neon-btn" type="submit" aria-label={idEditing ? 'Αποθήκευση' : 'Δημιουργία'}>{idEditing ? 'Αποθήκευση' : 'Δημιουργία'}</button>
            </div>
          </form>
        </section>

  <section className="panel-card" style={{flex:1,display:'flex',flexDirection:'column',minWidth:0, minHeight:360}}>
          <h2 className="font-semibold mb-2">Λίστα</h2>
          {loading ? <div>Φόρτωση...</div> : (
            items.length === 0 ? <div className="muted">Δεν υπάρχουν εκκρεμότητες.</div> : (
              <div style={{display:'grid',gap:8,overflow:'visible',paddingRight:4}}>
                {items.map(it => (
                  <div key={it.id} className="panel-card pending-item" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                        <div style={{fontWeight:700,fontSize:16,color:'#fff'}}>{it.customerName || '—'}</div>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          {it.pendingType ? <span className="badge">{it.pendingType}</span> : null}
                          {it.dueDate ? <div className="muted" style={{fontSize:12}}>Προθ.: {it.dueDate}</div> : null}
                        </div>
                      </div>

                      <div style={{marginTop:8,color:'var(--muted-text)'}}>{it.description}</div>

                      <div className="pending-meta" style={{marginTop:10,display:'flex',gap:12,fontSize:13,color:'var(--muted-text)'}}>
                        {it.mobile ? <span>📱 {it.mobile}</span> : null}
                        {it.landline ? <span>☎️ {it.landline}</span> : null}
                        {it.afm ? <span>ΑΦΜ: {it.afm}</span> : null}
                      </div>

                      {it.notes ? <div className="pending-notes" style={{marginTop:10,background:'rgba(255,255,255,0.02)',padding:10,borderRadius:8,color:'var(--muted-text)'}}>{it.notes}</div> : null}
                    </div>

                    <div style={{display:'flex',flexDirection:'column',gap:8}} className="pending-actions">
                      <button className="btn-ghost icon-btn" onClick={()=> onEdit(it)} aria-label={`Επεξεργασία ${it.customerName || ''}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span className="ml-2">Επεξεργασία</span>
                      </button>
                      <button className="btn-ghost icon-btn" onClick={()=> onDelete(it.id)} aria-label={`Διαγραφή ${it.customerName || ''}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11v6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span className="ml-2">Διαγραφή</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </section>
      </div>
      {/* Edit modal overlay */}
      {showEditModal && modalItem && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card panel-card" style={{maxWidth:640,margin:'40px auto',position:'relative'}}>
            <h3 className="font-semibold">Επεξεργασία εκκρεμότητας</h3>
            <form onSubmit={async (e)=>{
              e.preventDefault()
                if(!modalCustomerName.trim()){ alert('Παρακαλώ συμπληρώστε όνομα πελάτη'); return }
                if(!modalDescription.trim()){ alert('Προσθέστε περιγραφή/τίτλο'); return }
                const updated = await updatePendingItem(modalItem.id, { customerName: modalCustomerName, mobile: modalMobile, landline: modalLandline, afm: modalAfm, description: modalDescription, dueDate: modalDueDate, notes: modalNotes, pendingType: modalPendingType })
                if(updated) setItems(prev => prev.map(p => p.id === modalItem.id ? updated : p))
              setShowEditModal(false)
              setModalItem(null)
            }} style={{display:'grid',gap:10,marginTop:10}}>
                  <div style={{display:'flex',gap:8}}>
                    <input ref={modalFirstInputRef} className="panel-input" placeholder="Όνομα πελάτη" value={modalCustomerName} onChange={e=> setModalCustomerName(e.target.value)} />
                  </div>
                <div style={{display:'flex',gap:8}}>
                  <input className="panel-input" placeholder="Κινητό" value={modalMobile} onChange={e=> setModalMobile(e.target.value)} />
                  <input className="panel-input" placeholder="Σταθερό" value={modalLandline} onChange={e=> setModalLandline(e.target.value)} />
                  <input className="panel-input" placeholder="ΑΦΜ" value={modalAfm} onChange={e=> setModalAfm(e.target.value)} />
                </div>
                <div style={{display:'flex',gap:8}}>
                  <input className="panel-input" placeholder="Προθεσμία" type="date" value={modalDueDate} onChange={e=> setModalDueDate(e.target.value)} />
                  <select className="panel-input" value={modalPendingType} onChange={e=> setModalPendingType(e.target.value)}>
                    <option value="">Επιλέξτε τύπο εκκρεμότητας</option>
                    {pendingTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <input className="panel-input" placeholder="Περιγραφή / Τι αφορά" value={modalDescription} onChange={e=> setModalDescription(e.target.value)} />
                </div>
                <div>
                  <textarea className="panel-input" placeholder="Σημειώσεις" value={modalNotes} onChange={e=> setModalNotes(e.target.value)} />
                </div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button type="button" className="btn-ghost" onClick={closeModal}>Άκυρο</button>
                <button className="btn" type="submit">Αποθήκευση</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

