import React, { useEffect, useState, useRef } from 'react'
import { clearAllData, exportBackup, importBackup } from '../services/storage'
import PageHeader from '../components/PageHeader'
import { safeJsonParse, safeLocalStorageGet, safeLocalStorageSet } from '../utils/safeLocalStorage'
import { pickBackupDir, getActiveDirHandle, clearStoredDirHandle, isDirPickerSupported, writeFileToDir } from '../utils/backupDir'

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="panel-card" style={{ padding: 26, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{title}</div>
      </div>
      {children}
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

export default function ProfilePage() {
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
  const [credentials, setCredentials] = useState<Array<{ id: string; app: string; user?: string; pass: string }>>([])
  const [showingCreds, setShowingCreds] = useState<Record<string, boolean>>({})
  const [newApp, setNewApp] = useState('')
  const [newUser, setNewUser] = useState('')
  const [newPass, setNewPass] = useState('')
  const [toast, setToast] = useState('')
  const [pendingWipe, setPendingWipe] = useState(false)
  const [storagePersisted, setStoragePersisted] = useState<boolean | null>(null)
  const [storagePersistSupported, setStoragePersistSupported] = useState(false)
  const pendingTimer = useRef<number | undefined>(undefined)
  const backupRef = useRef<{ entries?: string; goals?: string; tasks?: string }>({})
  const importFileRef = useRef<HTMLInputElement | null>(null)
  const [backupDirName, setBackupDirName] = useState<string | null>(null)

  useEffect(() => {
    getActiveDirHandle().then(h => setBackupDirName(h ? h.name : null)).catch(() => {})
  }, [])

  useEffect(() => {
    const f = safeLocalStorageGet('ws_user_first') || ''
    const l = safeLocalStorageGet('ws_user_last') || ''
    const e = safeLocalStorageGet('ws_user_email') || ''
    const p = safeLocalStorageGet('ws_user_phone') || ''
    const s = safeLocalStorageGet('ws_user_store') || ''
    const se = safeLocalStorageGet('ws_user_store_email') || ''
    const empE = safeLocalStorageGet('ws_user_employer_email') || ''
    const r = safeLocalStorageGet('ws_user_role') || ''
    const parsedCreds = safeJsonParse<any[]>(safeLocalStorageGet('ws_user_passwords'), [])
    setFirstName(f); setLastName(l); setEmail(e); setPhone(p); setStoreCode(s)
    setStoreEmail(se); setEmployerEmail(empE); setRole(r); setCredentials(parsedCreds)
    try {
      setStoreSuggestions(safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_store'), []))
      setRoleSuggestions(safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_role'), []))
      setEmailSuggestions(safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_email'), []))
      setEmployerEmailSuggestions(safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_employer_email'), []))
      setStoreEmailSuggestions(safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_store_email'), []))
      setAppSuggestions(safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_app'), []))
    } catch (e) { console.warn('failed reading suggestion lists', e) }
  }, [])

  useEffect(() => {
    const nav: any = typeof navigator !== 'undefined' ? navigator : undefined
    const storage: any = nav?.storage
    const supported = !!storage && typeof storage.persisted === 'function' && typeof storage.persist === 'function'
    setStoragePersistSupported(supported)
    if (!supported) { setStoragePersisted(null); return }
    storage.persisted().then((v: boolean) => setStoragePersisted(!!v)).catch(() => setStoragePersisted(null))
  }, [])

  const showToast = (msg: string, delay = 1600) => {
    setToast(msg)
    setTimeout(() => setToast(''), delay)
  }

  const saveProfile = () => {
    safeLocalStorageSet('ws_user_first', firstName)
    safeLocalStorageSet('ws_user_last', lastName)
    safeLocalStorageSet('ws_user_email', email)
    safeLocalStorageSet('ws_user_phone', phone)
    safeLocalStorageSet('ws_user_store', storeCode)
    safeLocalStorageSet('ws_user_role', role)
    safeLocalStorageSet('ws_user_store_email', storeEmail)
    safeLocalStorageSet('ws_user_employer_email', employerEmail)
    const persistSuggestion = (key: string, value: string) => {
      if (!value) return
      try {
        const raw = safeJsonParse<any[]>(safeLocalStorageGet(key), [])
        const arr = Array.isArray(raw) ? raw : []
        const lc = value.toLowerCase()
        const next = [value, ...arr.filter((x: string) => x.toLowerCase() !== lc)].slice(0, 12)
        safeLocalStorageSet(key, JSON.stringify(next))
      } catch (e) { console.warn('persist suggestion', e) }
    }
    persistSuggestion('ws_suggestions_store', storeCode)
    persistSuggestion('ws_suggestions_role', role)
    persistSuggestion('ws_suggestions_email', email)
    persistSuggestion('ws_suggestions_store_email', storeEmail)
    persistSuggestion('ws_suggestions_employer_email', employerEmail)
    try { setStoreSuggestions(safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_store'), [])) } catch {}
    try { setRoleSuggestions(safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_role'), [])) } catch {}
    try { setEmailSuggestions(safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_email'), [])) } catch {}
    try { setStoreEmailSuggestions(safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_store_email'), [])) } catch {}
    try { setEmployerEmailSuggestions(safeJsonParse<any[]>(safeLocalStorageGet('ws_suggestions_employer_email'), [])) } catch {}
    showToast('Προφίλ αποθηκεύτηκε')
  }

  function persistCredentials(list: { id: string; app: string; user?: string; pass: string }[]) {
    try { safeLocalStorageSet('ws_user_passwords', JSON.stringify(list)) } catch (e) { console.error(e) }
  }

  const addCredential = (app: string, user: string, pass: string) => {
    const id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
    const entry = { id, app, user: user || undefined, pass }
    const next = [entry, ...credentials]
    setCredentials(next); persistCredentials(next)
    try {
      const key = 'ws_suggestions_app'
      const raw = safeJsonParse<any[]>(safeLocalStorageGet(key), [])
      const arr = Array.isArray(raw) ? raw : []
      const lc = app.toLowerCase()
      const nextApps = [app, ...arr.filter((x: string) => x.toLowerCase() !== lc)].slice(0, 20)
      safeLocalStorageSet(key, JSON.stringify(nextApps))
      setAppSuggestions(nextApps)
    } catch (e) { console.warn('save app suggestion', e) }
    showToast('Κωδικός αποθηκεύτηκε')
  }

  const deleteCredential = (id: string) => {
    const next = credentials.filter(c => c.id !== id)
    setCredentials(next); persistCredentials(next)
    showToast('Κωδικός διαγράφηκε', 1200)
  }

  const toggleShow = (id: string) => setShowingCreds(prev => ({ ...prev, [id]: !prev[id] }))

  const wipeMemory = async () => {
    const ok = window.confirm('Θες να διαγραφεί όλη η τοπική μνήμη (στόχοι, καταχωρήσεις, εργασίες); Θα σου δοθεί λίγα δευτερόλεπτα για ακύρωση.')
    if (!ok) return
    try {
      backupRef.current.entries = safeLocalStorageGet('ws_entries') || ''
      backupRef.current.goals = safeLocalStorageGet('ws_goals') || ''
      backupRef.current.tasks = safeLocalStorageGet('ws_tasks') || ''
      setPendingWipe(true)
      setToast('Διαγραφή σε εξέλιξη — Αναίρεση μέσα σε 6s')
      pendingTimer.current = window.setTimeout(async () => {
        try {
          await clearAllData()
          setToast('Η μνήμη καθαρίστηκε')
        } catch (e) {
          console.error(e); setToast('Σφάλμα κατά τον καθαρισμό')
        } finally {
          setPendingWipe(false); backupRef.current = {}
          window.setTimeout(() => setToast(''), 1800)
        }
      }, 6000) as unknown as number
    } catch (e) {
      console.error(e); showToast('Σφάλμα κατά την προετοιμασία')
    }
  }

  const downloadBackup = async () => {
    try {
      const backup = await exportBackup()
      const json = JSON.stringify(backup, null, 2)
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const filename = `worksmart-backup-${stamp}.json`
      if (isDirPickerSupported()) {
        let dirHandle = await getActiveDirHandle(true)
        if (!dirHandle) dirHandle = await pickBackupDir()
        if (dirHandle) {
          await writeFileToDir(dirHandle, filename, json)
          setBackupDirName(dirHandle.name)
          showToast('Έγινε export σε αρχείο')
          return
        }
      }
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
      showToast('Έγινε export σε αρχείο')
    } catch (e) { console.error(e); showToast('Αποτυχία export') }
  }

  const triggerImport = () => { try { importFileRef.current?.click() } catch {} }

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
      showToast(`Έγινε import (${res.importedKeys} κλειδιά). Κάνω ανανέωση…`, 2000)
      setTimeout(() => window.location.reload(), 600)
    } catch (e) { console.error(e); showToast('Αποτυχία import (μη έγκυρο αρχείο)') }
  }

  const requestPersistentStorage = async () => {
    const nav: any = typeof navigator !== 'undefined' ? navigator : undefined
    const storage: any = nav?.storage
    if (!storage || typeof storage.persist !== 'function') return
    try {
      const granted = await storage.persist()
      setStoragePersisted(!!granted)
      showToast(granted ? 'Μόνιμη αποθήκευση: ενεργή' : 'Μόνιμη αποθήκευση: δεν δόθηκε')
    } catch (e) { console.error(e); showToast('Αποτυχία αιτήματος μόνιμης αποθήκευσης') }
  }

  const undoWipe = () => {
    if (pendingTimer.current) { clearTimeout(pendingTimer.current); pendingTimer.current = undefined }
    try {
      if (backupRef.current.entries !== undefined) safeLocalStorageSet('ws_entries', backupRef.current.entries || '[]')
      if (backupRef.current.goals !== undefined) safeLocalStorageSet('ws_goals', backupRef.current.goals || '[]')
      if (backupRef.current.tasks !== undefined) safeLocalStorageSet('ws_tasks', backupRef.current.tasks || '[]')
      showToast('Διαγραφή ακυρώθηκε')
    } catch (e) {
      console.error('undo failed', e); showToast('Αποτυχία επαναφοράς')
    } finally { setPendingWipe(false); backupRef.current = {} }
  }

  const initials = `${firstName?.trim().charAt(0) || ''}${lastName?.trim().charAt(0) || ''}`.toUpperCase()

  return (
    <div className="page-content">
      <PageHeader title="Προφίλ" subtitle="Διαχείριση στοιχείων και ρυθμίσεων εφαρμογής" breadcrumb="Προφίλ" />

      <input ref={importFileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={onImportFile} />

      <div className="page-inner">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

          {/* ── Left column ── */}
          <div>
            {/* Avatar + name banner */}
            <div className="panel-card" style={{ padding: 24, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg,#7c3aed,#ff6b8a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.4rem', color: '#fff', flexShrink: 0, letterSpacing: 1 }}>
                {initials || '—'}
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                  {(firstName || lastName) ? `${firstName} ${lastName}`.trim() : 'Χρήστης'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>
                  {role || 'Χωρίς ρόλο'} {storeCode ? `· ${storeCode}` : ''}
                </div>
              </div>
            </div>

            {/* Profile form */}
            <SectionCard
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
              title="Στοιχεία χρήστη"
            >
              <form onSubmit={e => { e.preventDefault(); saveProfile() }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FieldRow label="Όνομα">
                    <input className="panel-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Όνομα" style={{ width: '100%' }} />
                  </FieldRow>
                  <FieldRow label="Επώνυμο">
                    <input className="panel-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Επώνυμο" style={{ width: '100%' }} />
                  </FieldRow>
                </div>

                <FieldRow label="Email">
                  <input className="panel-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" list="email-suggestions" style={{ width: '100%' }} />
                  <datalist id="email-suggestions">{emailSuggestions.map((s, i) => <option key={i} value={s} />)}</datalist>
                </FieldRow>

                <FieldRow label="Email εργοδότη">
                  <input className="panel-input" value={employerEmail} onChange={e => setEmployerEmail(e.target.value)} placeholder="email@εργοδότης.com" list="employer-email-suggestions" style={{ width: '100%' }} />
                  <datalist id="employer-email-suggestions">{employerEmailSuggestions.map((s, i) => <option key={i} value={s} />)}</datalist>
                </FieldRow>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FieldRow label="Κινητό">
                    <input className="panel-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="69xxxxxxxx" style={{ width: '100%' }} />
                  </FieldRow>
                  <FieldRow label="Ρόλος">
                    <input className="panel-input" value={role} onChange={e => setRole(e.target.value)} placeholder="π.χ. Υπάλληλος" list="role-suggestions" style={{ width: '100%' }} />
                    <datalist id="role-suggestions">{roleSuggestions.map((s, i) => <option key={i} value={s} />)}</datalist>
                  </FieldRow>
                  <FieldRow label="Κωδικός καταστήματος">
                    <input className="panel-input" value={storeCode} onChange={e => setStoreCode(e.target.value)} placeholder="Κωδικός" list="store-suggestions" style={{ width: '100%' }} />
                    <datalist id="store-suggestions">{storeSuggestions.map((s, i) => <option key={i} value={s} />)}</datalist>
                  </FieldRow>
                  <FieldRow label="Email καταστήματος">
                    <input className="panel-input" value={storeEmail} onChange={e => setStoreEmail(e.target.value)} placeholder="store@example.com" list="store-email-suggestions" style={{ width: '100%' }} />
                    <datalist id="store-email-suggestions">{storeEmailSuggestions.map((s, i) => <option key={i} value={s} />)}</datalist>
                  </FieldRow>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button type="submit" className="btn" style={{ fontWeight: 700, background: 'linear-gradient(90deg,#7c3aed,#5b21b6)', border: 'none', padding: '10px 20px' }}>Αποθήκευση</button>
                  <button type="button" className="btn-ghost" onClick={wipeMemory} style={{ padding: '10px 18px', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.3)' }}>Διαγραφή μνήμης</button>
                </div>
              </form>
            </SectionCard>
          </div>

          {/* ── Right column ── */}
          <div>
            {/* Data management */}
            <SectionCard
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v13M8 12l4 4 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 18h18" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
              title="Δεδομένα & Backup"
            >
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', marginBottom: 16, lineHeight: 1.6 }}>
                Εάν τα δεδομένα χάνονται όταν κλείνει ο browser, κάνε <strong style={{ color: 'rgba(255,255,255,0.65)' }}>Export</strong> πριν κλείσεις και <strong style={{ color: 'rgba(255,255,255,0.65)' }}>Import</strong> όταν ανοίξεις.
              </p>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                <button type="button" className="btn" onClick={downloadBackup} style={{ fontWeight: 700, background: 'linear-gradient(90deg,#7c3aed,#5b21b6)', border: 'none' }}>Export (Backup)</button>
                <button type="button" className="btn-ghost" onClick={triggerImport}>Import (Restore)</button>
                {storagePersistSupported && (
                  <button type="button" className="btn-ghost" onClick={requestPersistentStorage}>Μόνιμη αποθήκευση</button>
                )}
              </div>

              {storagePersistSupported && (
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.38)', marginBottom: 12 }}>
                  Μόνιμη αποθήκευση: <strong style={{ color: storagePersisted ? '#6ee7b7' : 'rgba(255,255,255,0.55)' }}>{storagePersisted === null ? '—' : storagePersisted ? 'Ενεργή' : 'Όχι'}</strong>
                </div>
              )}

              {isDirPickerSupported() && (
                <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Αυτόματο backup — φάκελος</div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
                    {backupDirName
                      ? <span>Αποθήκευση σε: <strong style={{ color: '#c4b5fd' }}>{backupDirName}</strong></span>
                      : 'Δεν έχει οριστεί φάκελος — το πρώτο export θα ανοίξει επιλογή φακέλου στα Downloads (δημιουργεί αυτόματα υποφάκελο exports).'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="btn-ghost" onClick={async () => {
                      const handle = await pickBackupDir()
                      setBackupDirName(handle ? handle.name : null)
                      if (handle) showToast(`Φάκελος ορίστηκε: ${handle.name}`)
                    }}>
                      {backupDirName ? 'Αλλαγή φακέλου' : 'Επίλεξε φάκελο'}
                    </button>
                    {backupDirName && (
                      <>
                        <button type="button" className="btn-ghost" onClick={async () => {
                          const handle = await getActiveDirHandle(true)
                          setBackupDirName(handle ? handle.name : backupDirName)
                          if (handle) showToast('Δικαίωμα πρόσβασης ανανεώθηκε')
                        }}>
                          Ανανέωση άδειας
                        </button>
                        <button type="button" className="btn-ghost" onClick={async () => {
                          await clearStoredDirHandle()
                          setBackupDirName(null)
                          showToast('Φάκελος αφαιρέθηκε')
                        }} style={{ color: '#fca5a5', borderColor: 'rgba(239,68,68,0.3)' }}>
                          Αφαίρεση
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Credentials */}
            <SectionCard
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="white" strokeWidth="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
              title="Κωδικοί εφαρμογών"
            >
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.38)', marginBottom: 16, lineHeight: 1.5 }}>
                Τοπική αποθήκευση κωδικών — δεν κρυπτογραφούνται.
              </p>

              {/* Add new credential */}
              <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Εφαρμογή</div>
                    <input className="panel-input" value={newApp} onChange={e => setNewApp(e.target.value)} placeholder="Όνομα εφαρμογής" list="app-suggestions" style={{ width: '100%' }} />
                    <datalist id="app-suggestions">{appSuggestions.map((s, i) => <option key={i} value={s} />)}</datalist>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Username</div>
                    <input className="panel-input" value={newUser} onChange={e => setNewUser(e.target.value)} placeholder="username (προαιρετικό)" style={{ width: '100%' }} />
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Κωδικός</div>
                  <input className="panel-input" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="password" style={{ width: '100%' }} />
                </div>
                <button className="btn" onClick={ev => {
                  ev.preventDefault()
                  if (newApp && newPass) {
                    addCredential(newApp, newUser, newPass)
                    setNewApp(''); setNewUser(''); setNewPass('')
                  } else {
                    showToast('Συμπλήρωσε εφαρμογή και κωδικό', 1400)
                  }
                }} style={{ fontWeight: 700, background: 'linear-gradient(90deg,#7c3aed,#5b21b6)', border: 'none' }}>
                  Προσθήκη κωδικού
                </button>
              </div>

              {/* Credentials list */}
              {credentials.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: 'rgba(255,255,255,0.25)', fontSize: '0.82rem' }}>Δεν υπάρχουν αποθηκευμένοι κωδικοί.</div>
              ) : (
                <div>
                  {credentials.map(c => (
                    <div key={c.id} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)' }}>{c.app}</div>
                          {c.user && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{c.user}</div>}
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', marginTop: 4, fontFamily: 'monospace', letterSpacing: 1 }}>
                            {showingCreds[c.id] ? c.pass : '••••••••'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button className="btn-ghost" onClick={() => toggleShow(c.id)} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                            {showingCreds[c.id] ? 'Απόκρυψη' : 'Εμφάνιση'}
                          </button>
                          <button className="btn-ghost" onClick={() => { navigator.clipboard?.writeText(c.pass); showToast('Κωδικός αντιγράφηκε', 1200) }} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Αντιγραφή</button>
                          <button className="btn-ghost" onClick={() => deleteCredential(c.id)} style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.3)' }}>Διαγραφή</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>

      {toast && (
        <div className="toast fixed top-6 right-6" style={{ background: 'linear-gradient(90deg,#7c3aed,#5b21b6)', color: '#fff', padding: '12px 18px', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.4)', zIndex: 300, fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 12 }} role="status" aria-live="polite">
          <span style={{ flex: 1 }}>{toast}</span>
          {pendingWipe && <button onClick={undoWipe} className="btn-ghost" style={{ padding: '4px 10px', fontSize: '0.82rem' }}>Ακύρωση</button>}
        </div>
      )}
    </div>
  )
}
