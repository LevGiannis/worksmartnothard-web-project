import React, { useEffect, useState, useRef } from 'react'
import { clearAllData, exportBackup, importBackup } from '../services/storage'
import PageHeader from '../components/PageHeader'
import { safeJsonParse, safeLocalStorageGet, safeLocalStorageSet } from '../utils/safeLocalStorage'

export default function ProfilePage(){
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [storeCode, setStoreCode] = useState('')
  const [role, setRole] = useState('')
  const [employerEmail, setEmployerEmail] = useState('')
  const [storeEmail, setStoreEmail] = useState('')
  const [storeSuggestions, setStoreSuggestions] = useState<string[]>([])
  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([])
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([])
  const [employerEmailSuggestions, setEmployerEmailSuggestions] = useState<string[]>([])
  const [storeEmailSuggestions, setStoreEmailSuggestions] = useState<string[]>([])
  const [appSuggestions, setAppSuggestions] = useState<string[]>([])
  const [credentials, setCredentials] = useState<Array<{id:string, app:string, user?:string, pass:string}>>([])
  const [showingCreds, setShowingCreds] = useState<Record<string,boolean>>({})
  const [newApp, setNewApp] = useState('')
  const [newUser, setNewUser] = useState('')
  const [newPass, setNewPass] = useState('')
  const [toast, setToast] = useState('')
  const [pendingWipe, setPendingWipe] = useState(false)
  const [storagePersisted, setStoragePersisted] = useState<boolean | null>(null)
  const [storagePersistSupported, setStoragePersistSupported] = useState(false)
  const pendingTimer = useRef<number|undefined>(undefined)
  const backupRef = useRef<{entries?:string, goals?:string, tasks?:string}>({})
  const importFileRef = useRef<HTMLInputElement | null>(null)

  useEffect(()=>{
    const f = safeLocalStorageGet('ws_user_first') || ''
    const l = safeLocalStorageGet('ws_user_last') || ''
    const e = safeLocalStorageGet('ws_user_email') || ''
    const p = safeLocalStorageGet('ws_user_phone') || ''
    const s = safeLocalStorageGet('ws_user_store') || ''
    const se = safeLocalStorageGet('ws_user_store_email') || ''
    const empE = safeLocalStorageGet('ws_user_employer_email') || ''
    const r = safeLocalStorageGet('ws_user_role') || ''
    const parsedCreds = safeJsonParse<any[]>(safeLocalStorageGet('ws_user_passwords'), [])
    setFirstName(f)
    setLastName(l)
    setEmail(e)
    setPhone(p)
    setStoreCode(s)
  setStoreEmail(se)
  setEmployerEmail(empE)
    setRole(r)
    setCredentials(parsedCreds)

    // load suggestion lists (fallback to empty arrays)
    try{
  const sSt = safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_store'), [])
  const rSt = safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_role'), [])
  const eSt = safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_email'), [])
  const empESt = safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_employer_email'), [])
  const seSt = safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_store_email'), [])
  const aSt = safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_app'), [])
  setStoreSuggestions(Array.isArray(sSt) ? sSt : [])
  setRoleSuggestions(Array.isArray(rSt) ? rSt : [])
  setEmailSuggestions(Array.isArray(eSt) ? eSt : [])
  setEmployerEmailSuggestions(Array.isArray(empESt) ? empESt : [])
  setStoreEmailSuggestions(Array.isArray(seSt) ? seSt : [])
  setAppSuggestions(Array.isArray(aSt) ? aSt : [])
    }catch(e){
      console.warn('failed reading suggestion lists', e)
    }
  }, [])

  useEffect(() => {
    const nav: any = typeof navigator !== 'undefined' ? navigator : undefined
    const storage: any = nav?.storage
    const supported = !!storage && typeof storage.persisted === 'function' && typeof storage.persist === 'function'
    setStoragePersistSupported(supported)
    if (!supported) {
      setStoragePersisted(null)
      return
    }
    storage.persisted().then((v: boolean) => setStoragePersisted(!!v)).catch(() => setStoragePersisted(null))
  }, [])

  const saveProfile = ()=>{
    safeLocalStorageSet('ws_user_first', firstName)
    safeLocalStorageSet('ws_user_last', lastName)
    safeLocalStorageSet('ws_user_email', email)
    safeLocalStorageSet('ws_user_phone', phone)
    safeLocalStorageSet('ws_user_store', storeCode)
    safeLocalStorageSet('ws_user_role', role)
  safeLocalStorageSet('ws_user_store_email', storeEmail)
  safeLocalStorageSet('ws_user_employer_email', employerEmail)
    // persist suggestion lists (keep unique, recent-first)
    const persistSuggestion = (key:string, value:string)=>{
      if(!value) return
      try{
        const raw = safeJsonParse<any[]>(safeLocalStorageGet(key), [])
        const arr = Array.isArray(raw) ? raw : []
        // remove duplicates (case-insensitive) and add to front
        const lc = value.toLowerCase()
        const filtered = arr.filter((x:string)=> x.toLowerCase() !== lc)
        const next = [value, ...filtered].slice(0,12)
        safeLocalStorageSet(key, JSON.stringify(next))
      }catch(e){ console.warn('persist suggestion', e) }
    }
  persistSuggestion('ws_suggestions_store', storeCode)
  persistSuggestion('ws_suggestions_role', role)
  persistSuggestion('ws_suggestions_email', email)
  persistSuggestion('ws_suggestions_store_email', storeEmail)
  persistSuggestion('ws_suggestions_employer_email', employerEmail)

    // update in-memory lists for immediate UI feedback
  try{ setStoreSuggestions(safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_store'), [])) }catch(e){}
  try{ setRoleSuggestions(safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_role'), [])) }catch(e){}
  try{ setEmailSuggestions(safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_email'), [])) }catch(e){}
  try{ setStoreEmailSuggestions(safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_store_email'), [])) }catch(e){}
  try{ setEmployerEmailSuggestions(safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_employer_email'), [])) }catch(e){}

    setToast('Προφίλ αποθηκεύτηκε')
    setTimeout(()=> setToast(''), 1400)
  }

  function persistCredentials(list:{id:string, app:string, user?:string, pass:string}[]){
    try{ safeLocalStorageSet('ws_user_passwords', JSON.stringify(list)) }catch(e){ console.error(e) }
  }

  const addCredential = (app:string, user:string, pass:string)=>{
    const id = `${Date.now()}-${Math.floor(Math.random()*10000)}`
    const entry = { id, app, user: user||undefined, pass }
    const next = [entry, ...credentials]
    setCredentials(next)
    persistCredentials(next)
    // persist app suggestion
    try{
      const key = 'ws_suggestions_app'
      const raw = safeJsonParse<any[]>(safeLocalStorageGet(key), [])
      const arr = Array.isArray(raw) ? raw : []
      const lc = app.toLowerCase()
      const filtered = arr.filter((x:string)=> x.toLowerCase() !== lc)
      const nextApps = [app, ...filtered].slice(0,20)
      safeLocalStorageSet(key, JSON.stringify(nextApps))
      setAppSuggestions(nextApps)
    }catch(e){ console.warn('save app suggestion', e) }
    setToast('Κωδικός αποθηκεύτηκε')
    setTimeout(()=> setToast(''), 1400)
  }

  const deleteCredential = (id:string)=>{
    const next = credentials.filter(c=> c.id !== id)
    setCredentials(next)
    persistCredentials(next)
    setToast('Κωδικός διαγράφηκε')
    setTimeout(()=> setToast(''), 1200)
  }

  const toggleShow = (id:string)=>{
    setShowingCreds(prev=> ({...prev, [id]: !prev[id]}))
  }

  const wipeMemory = async ()=>{
    const ok = window.confirm('Θες να διαγραφεί όλη η τοπική μνήμη (στόχοι, καταχωρήσεις, εργασίες); Θα σου δοθεί λίγα δευτερόλεπτα για ακύρωση.')
    if(!ok) return

    try{
      // Backup current raw values so undo can restore
      backupRef.current.entries = safeLocalStorageGet('ws_entries') || ''
      backupRef.current.goals = safeLocalStorageGet('ws_goals') || ''
      backupRef.current.tasks = safeLocalStorageGet('ws_tasks') || ''

      setPendingWipe(true)
      setToast('Διαγραφή σε εξέλιξη — Αναίρεση μέσα σε 6s')

      // Start timer: finalize wipe after 6s if not undone
      pendingTimer.current = window.setTimeout(async ()=>{
        try{
          await clearAllData()
          setToast('Η μνήμη καθαρίστηκε')
        }catch(e){
          console.error(e)
          setToast('Σφάλμα κατά τον καθαρισμό')
        } finally {
          setPendingWipe(false)
          // clear backup
          backupRef.current = {}
          window.setTimeout(()=> setToast(''), 1800)
        }
      }, 6000) as unknown as number

    }catch(e){
      console.error(e)
      setToast('Σφάλμα κατά την προετοιμασία')
      setTimeout(()=> setToast(''), 1600)
    }
  }

  const downloadBackup = async () => {
    try {
      const backup = await exportBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      a.href = url
      a.download = `worksmart-backup-${stamp}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setToast('Έγινε export σε αρχείο')
      setTimeout(()=> setToast(''), 1400)
    } catch (e) {
      console.error(e)
      setToast('Αποτυχία export')
      setTimeout(()=> setToast(''), 1600)
    }
  }

  const triggerImport = () => {
    try { importFileRef.current?.click() } catch {}
  }

  const onImportFile = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files && ev.target.files[0]
    ev.target.value = ''
    if (!file) return

    const ok = window.confirm('Θες να γίνει εισαγωγή (import) από το αρχείο; Θα αντικαταστήσει τα τρέχοντα τοπικά δεδομένα.')
    if (!ok) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const res = await importBackup(parsed)
      setToast(`Έγινε import (${res.importedKeys} κλειδιά). Κάνω ανανέωση…`)
      setTimeout(() => window.location.reload(), 600)
    } catch (e) {
      console.error(e)
      setToast('Αποτυχία import (μη έγκυρο αρχείο)')
      setTimeout(()=> setToast(''), 2000)
    }
  }

  const requestPersistentStorage = async () => {
    const nav: any = typeof navigator !== 'undefined' ? navigator : undefined
    const storage: any = nav?.storage
    if (!storage || typeof storage.persist !== 'function') return
    try {
      const granted = await storage.persist()
      setStoragePersisted(!!granted)
      setToast(granted ? 'Μόνιμη αποθήκευση: ενεργή' : 'Μόνιμη αποθήκευση: δεν δόθηκε')
      setTimeout(()=> setToast(''), 1800)
    } catch (e) {
      console.error(e)
      setToast('Αποτυχία αιτήματος μόνιμης αποθήκευσης')
      setTimeout(()=> setToast(''), 1800)
    }
  }

  const undoWipe = ()=>{
    // cancel timer and restore backup
    if(pendingTimer.current) { clearTimeout(pendingTimer.current); pendingTimer.current = undefined }
    try{
      if(backupRef.current.entries !== undefined) safeLocalStorageSet('ws_entries', backupRef.current.entries || '[]')
      if(backupRef.current.goals !== undefined) safeLocalStorageSet('ws_goals', backupRef.current.goals || '[]')
      if(backupRef.current.tasks !== undefined) safeLocalStorageSet('ws_tasks', backupRef.current.tasks || '[]')
      setToast('Διαγραφή ακυρώθηκε')
    }catch(e){
      console.error('undo failed', e)
      setToast('Αποτυχία επαναφοράς')
    } finally {
      setPendingWipe(false)
      backupRef.current = {}
      setTimeout(()=> setToast(''), 1400)
    }
  }

  const initials = `${firstName?.trim().charAt(0) || ''}${lastName?.trim().charAt(0) || ''}`.toUpperCase()

  return (
    <div style={{padding:20, paddingTop: '220px'}}>
      <PageHeader
        title="Προφίλ"
        subtitle="Διαχείριση αποθηκευμένων δεδομένων και ρυθμίσεων"
        breadcrumb="Προφίλ"
      />

  <main className="panel-card" style={{padding:38, maxWidth:1400, margin:'0 auto', width:'100%'}}>

      <input
        ref={importFileRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={onImportFile}
      />

      <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6" aria-label="Profile settings">
        <form onSubmit={e=>{e.preventDefault(); saveProfile()}}>
          <div>
            <div className="form-row">
              <label htmlFor="firstName" className="text-sm font-medium">Όνομα</label>
              <input id="firstName" name="firstName" className={`panel-input mt-2 ${firstName? 'has-value':''}`} value={firstName} onChange={e=> setFirstName(e.target.value)} placeholder="Όνομα" />
            </div>

            <div className="form-row">
              <label htmlFor="lastName" className="text-sm font-medium">Επώνυμο</label>
              <input id="lastName" name="lastName" className={`panel-input mt-2 ${lastName? 'has-value':''}`} value={lastName} onChange={e=> setLastName(e.target.value)} placeholder="Επώνυμο" />
            </div>

            <div className="form-row">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input id="email" name="email" className={`panel-input mt-2 ${email? 'has-value':''}`} value={email} onChange={e=> setEmail(e.target.value)} placeholder="email@example.com" list="email-suggestions" />
              <datalist id="email-suggestions">
                {emailSuggestions.map((s, i)=> <option key={i} value={s}>{s}</option>)}
              </datalist>
            </div>

            <div className="form-row">
              <label htmlFor="employerEmail" className="text-sm font-medium">Email εργοδότη</label>
              <input id="employerEmail" name="employerEmail" className={`panel-input mt-2 ${employerEmail? 'has-value':''}`} value={employerEmail} onChange={e=> setEmployerEmail(e.target.value)} placeholder="email@εργοδότης.com" list="employer-email-suggestions" />
              <datalist id="employer-email-suggestions">
                {employerEmailSuggestions.map((s, i)=> <option key={i} value={s}>{s}</option>)}
              </datalist>
            </div>

            <div className="form-row">
              <label htmlFor="phone" className="text-sm font-medium">Κινητό</label>
              <input id="phone" name="phone" className={`panel-input mt-2 ${phone? 'has-value':''}`} value={phone} onChange={e=> setPhone(e.target.value)} placeholder="Κινητό" />
            </div>

            <div className="form-row">
              <label htmlFor="store" className="text-sm font-medium">Κωδικός Καταστήματος</label>
              <input id="store" name="store" className={`panel-input mt-2 ${storeCode? 'has-value':''}`} value={storeCode} onChange={e=> setStoreCode(e.target.value)} placeholder="Κωδικός καταστήματος" list="store-suggestions" />
              <datalist id="store-suggestions">
                {storeSuggestions.map((s, i)=> <option key={i} value={s}>{s}</option>)}
              </datalist>
            </div>

            <div className="form-row">
              <label htmlFor="storeEmail" className="text-sm font-medium">Email καταστήματος</label>
              <input id="storeEmail" name="storeEmail" className={`panel-input mt-2 ${storeEmail? 'has-value':''}`} value={storeEmail} onChange={e=> setStoreEmail(e.target.value)} placeholder="store@example.com" list="store-email-suggestions" />
              <datalist id="store-email-suggestions">
                {storeEmailSuggestions.map((s, i)=> <option key={i} value={s}>{s}</option>)}
              </datalist>
            </div>

            <div className="form-row">
              <label htmlFor="role" className="text-sm font-medium">Ρόλος</label>
              <input id="role" name="role" className={`panel-input mt-2 ${role? 'has-value':''}`} value={role} onChange={e=> setRole(e.target.value)} placeholder="π.χ. Διαχειριστής / Υπάλληλος" list="role-suggestions" />
              <datalist id="role-suggestions">
                {roleSuggestions.map((s, i)=> <option key={i} value={s}>{s}</option>)}
              </datalist>
            </div>

            <div className="flex items-center gap-3 mt-4 profile-actions">
              <button type="submit" className="btn" aria-label="Αποθήκευση προφίλ">Αποθήκευση</button>
              <button type="button" className="btn-ghost" onClick={wipeMemory} aria-label="Διαγραφή τοπικής μνήμης">Διαγραφή μνήμης</button>
            </div>
          </div>
        </form>

        <aside>
          <div className="card profile-aside">
            <h3 className="font-semibold">Τοπικά δεδομένα</h3>
            <p className="muted text-sm mt-2">Πατώντας «Διαγραφή μνήμης» θα διαγραφούν τοπικά οι στόχοι, οι καταχωρήσεις και οι εργασίες.</p>

            <div className="mt-4" style={{display:'flex', gap:10, flexWrap:'wrap'}}>
              <button type="button" className="btn" onClick={downloadBackup}>Export (Backup)</button>
              <button type="button" className="btn-ghost" onClick={triggerImport}>Import (Restore)</button>
              {storagePersistSupported && (
                <button type="button" className="btn-ghost" onClick={requestPersistentStorage}>
                  Ζήτα μόνιμη αποθήκευση
                </button>
              )}
            </div>

            <p className="muted text-sm mt-3">
              Αν στο περιβάλλον σου τα δεδομένα χάνονται όταν κλείνει ο browser, κάνε <strong>Export</strong> πριν κλείσεις και <strong>Import</strong> όταν ανοίξεις.
            </p>
            {storagePersistSupported && (
              <p className="muted text-sm mt-2">
                Κατάσταση μόνιμης αποθήκευσης: <strong>{storagePersisted === null ? '—' : (storagePersisted ? 'Ενεργή' : 'Όχι')}</strong>
              </p>
            )}
            <ul className="muted text-sm mt-4" aria-hidden>
              <li><strong>Στόχοι:</strong> αποθηκεύονται τοπικά</li>
              <li><strong>Καταχωρήσεις:</strong> αποθηκεύονται τοπικά</li>
              <li><strong>Εργασίες:</strong> τοπική αποθήκευση</li>
            </ul>
          </div>
          
          <div className="card mt-4">
            <h3 className="font-semibold">Κωδικοί εφαρμογών</h3>
            <p className="muted text-sm mt-2">Μπορείς να αποθηκεύσεις κωδικούς εφαρμογών τοπικά. Προσοχή: τοπική αποθήκευση δεν είναι κρυπτογραφημένη.</p>

            <div className="mt-3">
              <label className="text-sm font-medium">Εφαρμογή</label>
              <input className={`panel-input mt-2 ${newApp? 'has-value':''}`} value={newApp} onChange={e=> setNewApp(e.target.value)} placeholder="Όνομα εφαρμογής" list="app-suggestions" />
              <datalist id="app-suggestions">
                {appSuggestions.map((s, i)=> <option key={i} value={s}>{s}</option>)}
              </datalist>
              <label className="text-sm font-medium mt-3">Όνομα χρήστη</label>
              <input className={`panel-input mt-2 ${newUser? 'has-value':''}`} value={newUser} onChange={e=> setNewUser(e.target.value)} placeholder="username (προαιρετικό)" />
              <label className="text-sm font-medium mt-3">Κωδικός</label>
              <input className={`panel-input mt-2 ${newPass? 'has-value':''}`} value={newPass} onChange={e=> setNewPass(e.target.value)} placeholder="password" />
              <div className="flex items-center gap-3 mt-3">
                <button className="btn" onClick={(ev)=>{ ev.preventDefault(); if(newApp && newPass) { addCredential(newApp, newUser, newPass); setNewApp(''); setNewUser(''); setNewPass('') } else { setToast('Συμπλήρωσε όνομα εφαρμογής και κωδικό'); setTimeout(()=> setToast(''),1400) } }}>Προσθήκη κωδικού</button>
              </div>
            </div>

            <div className="credential-list mt-4">
              {credentials.length === 0 && <div className="muted text-sm">Δεν υπάρχουν αποθηκευμένοι κωδικοί.</div>}
              {credentials.map(c => (
                <div key={c.id} className="credential-item mt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{c.app}</div>
                      <div className="muted text-sm">{c.user || ''}</div>
                    </div>
                    <div className="credential-actions flex items-center gap-2" style={{flexWrap:'wrap', justifyContent:'flex-end'}}>
                      <div className="credential-pass muted text-sm" style={{minWidth:140, textAlign:'right', flexGrow:1}}>{showingCreds[c.id] ? c.pass : '••••••••'}</div>
                      <button className="btn-ghost" style={{flexShrink:0}} onClick={()=> toggleShow(c.id)}>{showingCreds[c.id] ? 'Απόκρυψη' : 'Εμφάνιση'}</button>
                      <button className="btn-ghost" style={{flexShrink:0}} onClick={()=>{ navigator.clipboard?.writeText(c.pass); setToast('Κωδικός αντιγράφηκε'); setTimeout(()=> setToast(''),1200) }}>Αντιγραφή</button>
                      <button className="btn-ghost" style={{flexShrink:0}} onClick={()=> deleteCredential(c.id)}>Διαγραφή</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      {toast && (
        <div className="toast fixed top-6 right-6 bg-success text-white px-4 py-2 rounded shadow" role="status" aria-live="polite">
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{flex:1}}>{toast}</div>
            {pendingWipe && <button onClick={undoWipe} className="btn-ghost" style={{padding:'6px 10px'}}>Ακύρωση</button>}
          </div>
        </div>
      )}
    </main>
    </div>
  )
}
