import React, { useState, useCallback, useEffect } from 'react'
import * as XLSX from 'xlsx'
import PageHeader from '../components/PageHeader'

const MANAGER_PASSWORD = 'manager123'
const USER_MAP_KEY = 'ws_manager_user_map'

type Category = 'mobile' | 'prepay' | 'migra' | 'home'

const CATEGORY_LABELS: Record<Category, string> = {
  mobile: 'Mobile',
  prepay: 'Prepay',
  migra: 'Migration FTTH',
  home: 'Vodafone Home',
}

const CATEGORY_COLORS: Record<Category, string> = {
  mobile: '#ef4444',
  prepay: '#3b82f6',
  migra: '#10b981',
  home: '#f59e0b',
}

interface ParsedEntry {
  category: Category
  user: string
  date: Date | null
  status: string
  customer: string
  requestId: string
  subCategory?: string
}

function detectCategory(headers: string[]): Category | null {
  if (headers.includes('MSISDN')) return 'prepay'
  if (headers.includes('Ημ/νία Αίτησης')) return 'mobile'
  if (headers.includes('Κωδ. Χρήστη')) return 'migra'
  if (headers.includes('Τηλέφωνο Υπηρεσίας')) return 'home'
  return null
}

function toDate(val: unknown): Date | null {
  if (!val) return null
  if (val instanceof Date) return val
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    if (d) return new Date(d.y, d.m - 1, d.d, d.H, d.M, d.S)
  }
  return null
}

function parseFile(file: File): Promise<ParsedEntry[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true })

        if (!rows.length) { resolve([]); return }

        const headers = (rows[0] as unknown[]).map(h => (h != null ? String(h) : ''))
        const cat = detectCategory(headers)
        if (!cat) { resolve([]); return }

        const entries: ParsedEntry[] = []

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as unknown[]
          if (!row || row.every(c => c == null)) continue

          let user = '', date: Date | null = null, status = '', customer = '', requestId = '', subCategory = ''

          if (cat === 'mobile') {
            user = String(row[5] ?? '')
            date = toDate(row[6])
            status = String(row[1] ?? '')
            customer = String(row[3] ?? '')
            requestId = String(row[2] ?? '')
            subCategory = String(row[4] ?? '')
          } else if (cat === 'prepay') {
            user = String(row[13] ?? '')
            date = toDate(row[5])
            status = String(row[11] ?? '')
            customer = String(row[2] ?? '')
            requestId = String(row[0] ?? '')
          } else if (cat === 'migra') {
            user = String(row[20] ?? '')
            date = toDate(row[13])
            status = String(row[1] ?? '')
            customer = `${row[3] ?? ''} ${row[4] ?? ''}`.trim()
            requestId = String(row[0] ?? '')
          } else if (cat === 'home') {
            user = String(row[19] ?? '')
            date = toDate(row[12])
            status = String(row[1] ?? '')
            customer = `${row[10] ?? ''} ${row[11] ?? ''}`.trim()
            requestId = String(row[0] ?? '')
            const speed = row[31] ? String(row[31]).trim() : ''
            subCategory = [String(row[20] ?? '').trim(), speed].filter(Boolean).join(' · ')
          }

          user = user.trim()
          const s = status.trim()
          if (s.toUpperCase().includes('ΑΚΥΡΩΜΕΝ')) continue
          if (user || date) {
            entries.push({ category: cat, user, date, status: s, customer: customer.trim(), requestId: requestId.trim(), subCategory: subCategory.trim() || undefined })
          }
        }

        resolve(entries)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function statusColor(status: string): string {
  const s = status.toUpperCase()
  if (s.includes('ΟΛΟΚΛΗΡΩΘΗΚΕ')) return '#10b981'
  if (s.includes('ΥΠΟ ΥΛΟΠΟΙΗΣΗ')) return '#3b82f6'
  if (s.includes('ΗΜΙΤΕΛΗΣ')) return '#f59e0b'
  if (s.includes('ΑΚΥΡΩΜΕΝ')) return '#ef4444'
  if (s.includes('ΕΠΑΝΕΛΕΓΧΟΣ')) return '#a855f7'
  return 'rgba(255,255,255,0.35)'
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ManagerPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)
  const [entries, setEntries] = useState<ParsedEntry[]>([])
  const [tab, setTab] = useState<'daily' | 'monthly' | 'users'>('daily')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [userMap, setUserMap] = useState<Record<string, string>>({})
  const [mapDraft, setMapDraft] = useState<Record<string, string>>({})
  const [mapSaved, setMapSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(USER_MAP_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, string>
      setUserMap(parsed)
      setMapDraft(parsed)
    }
  }, [])

  const saveUserMap = () => {
    localStorage.setItem(USER_MAP_KEY, JSON.stringify(mapDraft))
    setUserMap(mapDraft)
    setMapSaved(true)
    setTimeout(() => setMapSaved(false), 2000)
  }

  const effectiveName = (raw: string) => userMap[raw] || raw

  const allRawUsers = [...new Set(entries.map(e => e.user))].filter(Boolean).sort()

  const handleLogin = () => {
    if (pwInput === MANAGER_PASSWORD) {
      setAuthenticated(true)
      setPwError(false)
    } else {
      setPwError(true)
    }
  }

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setUploading(true)
    const fileArr = Array.from(files).filter(f => f.name.endsWith('.xlsx'))
    try {
      const results = await Promise.all(fileArr.map(parseFile))
      const all = results.flat()
      setEntries(prev => {
        const uploadedCats = new Set(all.map(e => e.category))
        const kept = prev.filter(e => !uploadedCats.has(e.category))
        return [...kept, ...all]
      })
    } catch (err) {
      console.error('Parse error:', err)
    }
    setUploading(false)
  }, [])

  // ── Password gate ──
  if (!authenticated) {
    return (
      <div className="page-content">
        <PageHeader title="Manager" subtitle="Είσοδος διαχειριστή" backTo="/" />
        <div className="page-inner" style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
          <div className="panel-card" style={{ padding: 36, width: '100%', maxWidth: 360 }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#0891b2,#0e7490)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="white" strokeWidth="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>Πρόσβαση Manager</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                type="password"
                placeholder="Κωδικός πρόσβασης"
                value={pwInput}
                onChange={e => { setPwInput(e.target.value); setPwError(false) }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ padding: '12px 16px', borderRadius: 10, border: `1px solid ${pwError ? '#ef4444' : 'rgba(255,255,255,0.1)'}`, background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '0.95rem', outline: 'none' }}
                autoFocus
              />
              {pwError && <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>Λάθος κωδικός</div>}
              <button
                onClick={handleLogin}
                style={{ padding: '12px', borderRadius: 10, background: 'linear-gradient(90deg,#0891b2,#0e7490)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: 'pointer' }}
              >
                Είσοδος
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Compute views ──
  const dailyMap = new Map<string, Map<string, ParsedEntry[]>>()
  for (const e of entries) {
    if (!e.date) continue
    const dk = dateKey(e.date)
    const name = effectiveName(e.user)
    if (!dailyMap.has(dk)) dailyMap.set(dk, new Map())
    const byUser = dailyMap.get(dk)!
    if (!byUser.has(name)) byUser.set(name, [])
    byUser.get(name)!.push(e)
  }
  const sortedDates = [...dailyMap.keys()].sort((a, b) => b.localeCompare(a))

  const allUsers = [...new Set(entries.map(e => effectiveName(e.user)))].filter(Boolean).sort()
  const cats: Category[] = ['mobile', 'prepay', 'migra', 'home']

  return (
    <div className="page-content">
      <PageHeader title="Manager" subtitle="Αναλυτικές αναφορές ανά χρήστη" backTo="/" />
      <div className="page-inner">

        {/* Upload zone */}
        <div
          className="panel-card"
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); void processFiles(e.dataTransfer.files) }}
          style={{ padding: 24, marginBottom: 20, border: `2px dashed ${dragOver ? '#0891b2' : 'rgba(255,255,255,0.1)'}`, background: dragOver ? 'rgba(8,145,178,0.08)' : undefined, transition: 'all 200ms', textAlign: 'center' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#0891b2,#0e7490)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <polyline points="17 8 12 3 7 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="3" x2="12" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.88)', fontSize: '0.95rem' }}>Ανέβασμα αρχείων Excel</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>Mobile · Prepay · Migration FTTH · Vodafone Home</div>
            </div>
          </div>
          <label style={{ cursor: 'pointer' }}>
            <input type="file" accept=".xlsx" multiple style={{ display: 'none' }} onChange={e => e.target.files && void processFiles(e.target.files)} />
            <span style={{ display: 'inline-block', padding: '9px 22px', borderRadius: 8, background: 'rgba(8,145,178,0.2)', border: '1px solid rgba(8,145,178,0.4)', color: '#22d3ee', fontSize: '0.85rem', fontWeight: 600 }}>
              {uploading ? 'Επεξεργασία...' : 'Επιλογή αρχείων'}
            </span>
          </label>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', marginTop: 10 }}>ή σύρε &amp; άφησε εδώ</div>
        </div>

        {entries.length === 0 ? (
          <div className="panel-card" style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.9rem' }}>
            Δεν υπάρχουν δεδομένα — ανέβασε αρχεία Excel για να ξεκινήσεις
          </div>
        ) : (
          <>
            {/* Category pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {cats.map(c => {
                const count = entries.filter(e => e.category === c).length
                if (!count) return null
                return (
                  <div key={c} style={{ padding: '6px 14px', borderRadius: 20, background: `${CATEGORY_COLORS[c]}20`, border: `1px solid ${CATEGORY_COLORS[c]}50`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[c] }} />
                    <span style={{ color: CATEGORY_COLORS[c], fontWeight: 600, fontSize: '0.82rem' }}>{CATEGORY_LABELS[c]}</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>{count}</span>
                  </div>
                )
              })}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
              {(['daily', 'monthly', 'users'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', background: tab === t ? 'rgba(8,145,178,0.3)' : 'transparent', color: tab === t ? '#22d3ee' : 'rgba(255,255,255,0.4)', transition: 'all 150ms' }}
                >
                  {t === 'daily' ? 'Ημερήσια' : t === 'monthly' ? 'Μηνιαία' : 'Χρήστες'}
                </button>
              ))}
            </div>

            {/* ── Daily view ── */}
            {tab === 'daily' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {sortedDates.map(dk => {
                  const byUser = dailyMap.get(dk)!
                  const dateObj = new Date(dk + 'T00:00:00')
                  const totalDay = [...byUser.values()].flat().length
                  return (
                    <div key={dk} className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="4" width="18" height="18" rx="2" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
                            <line x1="16" y1="2" x2="16" y2="6" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
                            <line x1="8" y1="2" x2="8" y2="6" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
                            <line x1="3" y1="10" x2="21" y2="10" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
                          </svg>
                          <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.88)', fontSize: '0.9rem' }}>{formatDate(dateObj)}</span>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{totalDay} εγγραφές</span>
                      </div>

                      {[...byUser.entries()].map(([user, userEntries]) => (
                        <div key={user} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.015)', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                              {user.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem' }}>{user}</span>
                            <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>{userEntries.length} εγγ.</span>
                          </div>
                          <div style={{ padding: '8px 20px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {userEntries.map((e, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.025)' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[e.category], flexShrink: 0 }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: CATEGORY_COLORS[e.category], minWidth: 110, flexShrink: 0 }}>{CATEGORY_LABELS[e.category]}{e.subCategory ? <span style={{ fontWeight: 400, color: `${CATEGORY_COLORS[e.category]}aa`, marginLeft: 5 }}>· {e.subCategory}</span> : null}</span>
                                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.customer}</span>
                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, background: `${statusColor(e.status)}20`, color: statusColor(e.status), fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{e.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Monthly view ── */}
            {tab === 'monthly' && (
              <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <th style={{ padding: '14px 20px', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontWeight: 600, whiteSpace: 'nowrap' }}>Χρήστης</th>
                        {cats.map(c => (
                          <th key={c} style={{ padding: '14px 16px', textAlign: 'center', color: CATEGORY_COLORS[c], fontWeight: 700, whiteSpace: 'nowrap' }}>{CATEGORY_LABELS[c]}</th>
                        ))}
                        <th style={{ padding: '14px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Σύνολο</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map(user => {
                        const total = entries.filter(e => effectiveName(e.user) === user).length
                        return (
                          <tr key={user} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '12px 20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                                  {user.charAt(0).toUpperCase()}
                                </div>
                                <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>{user}</span>
                              </div>
                            </td>
                            {cats.map(c => {
                              const catEntries = entries.filter(e => effectiveName(e.user) === user && e.category === c)
                              const done = catEntries.filter(e =>
                                e.status.toUpperCase().includes('ΟΛΟΚΛΗΡΩΘΗΚΕ') ||
                                e.status.toUpperCase().includes('ΥΠΟ ΥΛΟΠΟΙΗΣΗ')
                              ).length
                              return (
                                <td key={c} style={{ padding: '12px 16px', textAlign: 'center' }}>
                                  {catEntries.length > 0 ? (
                                    <div>
                                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: CATEGORY_COLORS[c] }}>{catEntries.length}</div>
                                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{done} ✓</div>
                                    </div>
                                  ) : (
                                    <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>
                                  )}
                                </td>
                              )
                            })}
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, fontSize: '1.05rem', color: 'rgba(255,255,255,0.88)' }}>
                              {total}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* ── Users mapping tab ── */}
            {tab === 'users' && (
              <div className="panel-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.88)', fontSize: '0.95rem', marginBottom: 4 }}>Αντιστοίχιση χρηστών</div>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>Ορίσου ποιο αναγνωριστικό αντιστοιχεί σε ποιον χρήστη. Αποθηκεύεται αυτόματα.</div>
                  </div>
                  <button
                    onClick={saveUserMap}
                    style={{ padding: '9px 20px', borderRadius: 9, background: mapSaved ? 'rgba(16,185,129,0.2)' : 'rgba(8,145,178,0.2)', border: `1px solid ${mapSaved ? '#10b981' : 'rgba(8,145,178,0.4)'}`, color: mapSaved ? '#10b981' : '#22d3ee', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 200ms', whiteSpace: 'nowrap' }}
                  >
                    {mapSaved ? '✓ Αποθηκεύτηκε' : 'Αποθήκευση'}
                  </button>
                </div>

                {allRawUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.88rem', padding: '20px 0' }}>
                    Ανέβασε αρχεία πρώτα για να εμφανιστούν οι χρήστες
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 12, padding: '0 4px', marginBottom: 4 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Αναγνωριστικό στο αρχείο</div>
                      <div />
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Εμφανιζόμενο όνομα</div>
                    </div>
                    {allRawUsers.map(raw => (
                      <div key={raw} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 12, alignItems: 'center' }}>
                        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {raw}
                        </div>
                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '1rem' }}>→</div>
                        <input
                          type="text"
                          placeholder={raw}
                          value={mapDraft[raw] ?? ''}
                          onChange={e => setMapDraft(prev => ({ ...prev, [raw]: e.target.value }))}
                          style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
