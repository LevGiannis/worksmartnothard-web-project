import React, { useState, useCallback, useEffect } from 'react'
import * as XLSX from 'xlsx'
import PageHeader from '../components/PageHeader'

const MANAGER_PASSWORD = 'manager123'
const USER_MAP_KEY = 'ws_manager_user_map'
const TARGETS_KEY = 'ws_manager_targets'
const DISMISSED_PAIRS_KEY = 'ws_manager_dismissed_pairs'

function normalizeForMatch(s: string): string {
  return s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '')
}

// Split into meaningful tokens (min 4 chars), stripping separators like . _ @ spaces
function tokenize(s: string): string[] {
  return s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^A-Z0-9]+/).filter(t => t.length >= 4)
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[m][n]
}

type MatchSuggestion = { a: string; b: string; key: string; score: 'exact' | 'close' }

function computeAutoSuggestions(rawUsers: string[]): MatchSuggestion[] {
  const result: MatchSuggestion[] = []
  const seen = new Set<string>()
  for (let i = 0; i < rawUsers.length; i++) {
    for (let j = i + 1; j < rawUsers.length; j++) {
      const a = rawUsers[i], b = rawUsers[j]
      const na = normalizeForMatch(a), nb = normalizeForMatch(b)
      if (!na || !nb) continue
      const key = [a, b].sort().join('|||')
      if (seen.has(key)) continue

      let score: 'exact' | 'close' | null = null

      if (na === nb) {
        score = 'exact'
      } else if (levenshtein(na, nb) <= 2) {
        score = 'close'
      } else {
        // Token overlap: at least one significant token (≥5 chars) in common
        const ta = tokenize(a), tb = tokenize(b)
        if (ta.length && tb.length) {
          const common = ta.filter(t => tb.includes(t))
          if (common.some(t => t.length >= 5)) score = 'close'
        }
        // Substring: one normalized name fully contained in the other (min 5 chars)
        if (!score) {
          const [short, long] = na.length <= nb.length ? [na, nb] : [nb, na]
          if (short.length >= 5 && long.includes(short)) score = 'close'
        }
      }

      if (score) { seen.add(key); result.push({ a, b, key, score }) }
    }
  }
  return result
}

// Union-Find: group matched users, pick the most readable canonical name per group
function buildAutoMap(rawUsers: string[], dismissed: string[]): Record<string, string> {
  const suggestions = computeAutoSuggestions(rawUsers).filter(s => !dismissed.includes(s.key))
  const parent = new Map<string, string>(rawUsers.map(u => [u, u]))
  const find = (x: string): string => {
    if (parent.get(x) === x) return x
    const root = find(parent.get(x)!)
    parent.set(x, root)
    return root
  }
  suggestions.forEach(({ a, b }) => {
    const pa = find(a), pb = find(b)
    if (pa !== pb) parent.set(pa, pb)
  })
  const groups = new Map<string, string[]>()
  rawUsers.forEach(u => {
    const root = find(u)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root)!.push(u)
  })
  // Canonical: prefer names with spaces (full name), then longest
  const canonical = (names: string[]) => {
    const withSpaces = names.filter(n => n.trim().includes(' '))
    return (withSpaces.length ? withSpaces : names).reduce((a, b) => a.length >= b.length ? a : b)
  }
  const autoMap: Record<string, string> = {}
  groups.forEach(members => {
    if (members.length < 2) return
    const canon = canonical(members)
    members.forEach(m => { autoMap[m] = canon })
  })
  return autoMap
}

type Category = 'mobile' | 'prepay' | 'migra' | 'home'

const CATEGORY_LABELS: Record<Category, string> = {
  mobile: 'Mobile',
  prepay: 'Prepay',
  migra: 'Migration FTTH',
  home: 'Vodafone Home',
}

const CATEGORY_COLORS: Record<Category, string> = {
  mobile: '#06b6d4',
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
  implDate?: Date | null
  connections?: number
  shopCode?: string
}

function detectCategory(headers: string[]): Category | null {
  if (headers.includes('Ημ/νία Αίτησης') && headers.includes('Τύπος Αίτησης')) return 'mobile'
  if (headers.includes('MSISDN')) return 'prepay'
  if (headers.includes('Κωδ. Χρήστη')) return 'migra'
  if (headers.includes('Τηλέφωνο Υπηρεσίας')) return 'home'
  return null
}

function toDate(val: unknown): Date | null {
  if (!val) return null
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val
  }
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    if (d) return new Date(d.y, d.m - 1, d.d, d.H, d.M, d.S)
  }
  if (typeof val === 'string') {
    const s = val.trim()
    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (with optional time)
    const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/)
    if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
    // YYYY-MM-DD
    const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
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

        const col = (name: string) => headers.indexOf(name)
        const get = (row: unknown[], name: string) => { const i = col(name); return i >= 0 ? row[i] : null }

        const entries: ParsedEntry[] = []

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as unknown[]
          if (!row || row.every(c => c == null)) continue

          let user = '', date: Date | null = null, status = '', customer = '', requestId = '', subCategory = '', implDate: Date | null = null, connections = 1, shopCode = ''

          if (cat === 'mobile') {
            user = String(get(row, 'Όνομα Χρήστη') ?? '')
            date = toDate(get(row, 'Ημ/νία Αίτησης'))
            status = String(get(row, 'Κατάσταση Αίτησης') ?? '')
            customer = String(get(row, 'Ονοματεπώνυμο') ?? '')
            requestId = String(get(row, 'Αριθμός Αίτησης') ?? '')
            subCategory = String(get(row, 'Τύπος Αίτησης') ?? '')
            implDate = toDate(get(row, 'Ημ/νία Σύνδεσης'))
            const connVal = get(row, 'Αριθμός Συνδέσεων')
            connections = typeof connVal === 'number' ? Math.max(1, connVal) : 1
            shopCode = String(get(row, 'Συνεργάτης') ?? '').trim()
          } else if (cat === 'prepay') {
            user = String(get(row, 'Όνομα Χρήστη') ?? '')
            date = toDate(get(row, 'Ημερομηνία Δημιουργίας'))
            status = String(get(row, 'Κατάσταση') ?? '')
            customer = String(get(row, 'Ονοματεπώνυμο') ?? '')
            requestId = String(get(row, 'Αριθμός Αίτησης') ?? '')
            implDate = toDate(get(row, 'Ημερομηνία Ολοκλήρωσης'))
          } else if (cat === 'migra') {
            user = String(get(row, 'Κωδ. Χρήστη') ?? '')
            date = toDate(get(row, 'Ημ/νια Δημιουργίας Αίτησης (Από - Έως)'))
            status = String(get(row, 'Κατάσταση Αίτησης') ?? '')
            customer = `${get(row, 'Όνομα') ?? ''} ${get(row, 'Επώνυμο / Επωνυμία') ?? ''}`.trim()
            requestId = String(get(row, 'Αριθμός Αίτησης') ?? '')
            implDate = toDate(get(row, 'Ημερομηνία Ολοκλήρωσης (Από - Έως)'))
            const speedBefore = String(get(row, 'Ταχύτητα πριν το Retention') ?? '')
            const speedAfter = String(get(row, 'Επιλεγμένη Ταχύτητα') ?? '')
            if (!speedAfter.toUpperCase().includes('FTTH') || speedBefore.toUpperCase().includes('FTTH')) continue
            subCategory = speedAfter.trim()
          } else if (cat === 'home') {
            user = String(get(row, 'Username') ?? '')
            date = toDate(get(row, 'Ημ/νια Δημιουργίας Αίτησης (Από - Έως)'))
            status = String(get(row, 'Κατάσταση Αίτησης') ?? '')
            customer = `${get(row, 'Όνομα') ?? ''} ${get(row, 'Επώνυμο / Επωνυμία') ?? ''}`.trim()
            requestId = String(get(row, 'Αριθμός Αίτησης') ?? '')
            const prog = String(get(row, 'Προγραμμά Χρήσης') ?? '').trim()
            const speed = String(get(row, 'Ταχύτητα') ?? '').trim()
            subCategory = [prog, speed].filter(Boolean).join(' · ')
            implDate = toDate(get(row, 'Ημ/νια Ολοκλήρωσης (Κ5)'))
            shopCode = String(get(row, 'Dealer Code') ?? '').trim()
          }

          user = user.trim()
          const s = status.trim()
          const allStatuses = [s, String(get(row, 'Κατάσταση') ?? '')].join(' ').toUpperCase()
          if (allStatuses.includes('ΑΚΥΡΩ')) continue
          if (subCategory.toUpperCase().includes('TRANSFER')) continue
          if (cat === 'mobile' && String(get(row, 'Περιγραφή Προγράμματος Χρήσης') ?? '').toUpperCase().trim() === 'GPDAT') continue
          if (user || date) {
            entries.push({ category: cat, user, date, status: s, customer: customer.trim(), requestId: requestId.trim(), subCategory: subCategory.trim() || undefined, implDate, connections: connections > 1 ? connections : undefined, shopCode: shopCode || undefined })
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

const MOBILE_COUNTED_SUBCATS = ['EX PREPAY', 'PRE2EC', 'PORT IN POSTPAY', 'PORT IN EC', 'NEW CONNECTION', 'NEW EC', 'PREPAY 2 EC']

function isMobileCountable(e: ParsedEntry): boolean {
  if (e.category !== 'mobile') return true
  const sub = (e.subCategory ?? '').toUpperCase().trim()
  return MOBILE_COUNTED_SUBCATS.some(s => sub.includes(s))
}

function isDone(e: ParsedEntry): boolean {
  const s = e.status.toUpperCase()
  if (s.includes('ΟΛΟΚΛΗΡΩΘΗΚΕ')) return true
  if ((e.category === 'home' || e.category === 'migra') && s.includes('ΥΛΟΠΟΙΗΜΕΝΗ')) return true
  return false
}

function countEntries(arr: ParsedEntry[]): number {
  return arr.reduce((sum, e) => sum + (e.connections ?? 1), 0)
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

type MonthTargets = { reg: Partial<Record<Category, number>>; done: Partial<Record<Category, number>> }

export default function ManagerPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)
  const [entries, setEntries] = useState<ParsedEntry[]>([])
  const [tab, setTab] = useState<'daily' | 'monthly' | 'users'>('daily')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedShop, setSelectedShop] = useState('')
  const [excludedUsers, setExcludedUsers] = useState<Set<string>>(new Set())
  const [expandedPending, setExpandedPending] = useState<Set<string>>(new Set())
  const toggleExpandPending = (label: string) => setExpandedPending(prev => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n })
  const toggleExclude = (u: string) => setExcludedUsers(prev => { const n = new Set(prev); n.has(u) ? n.delete(u) : n.add(u); return n })
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [userMap, setUserMap] = useState<Record<string, string>>({})
  const [mapDraft, setMapDraft] = useState<Record<string, string>>({})
  const [mapSaved, setMapSaved] = useState(false)
  const [monthlyTargets, setMonthlyTargets] = useState<Record<string, MonthTargets>>({})
  const [exportMode, setExportMode] = useState<'reg' | 'done'>('done')
  const [dismissedPairs, setDismissedPairs] = useState<string[]>([])
  const [suggestionInputs, setSuggestionInputs] = useState<Record<string, string>>({})
  useEffect(() => {
    const stored = localStorage.getItem(USER_MAP_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, string>
      setUserMap(parsed)
      setMapDraft(parsed)
    }
    const storedTargets = localStorage.getItem(TARGETS_KEY)
    if (storedTargets) {
      setMonthlyTargets(JSON.parse(storedTargets) as Record<string, MonthTargets>)
    }
    const storedDismissed = localStorage.getItem(DISMISSED_PAIRS_KEY)
    if (storedDismissed) setDismissedPairs(JSON.parse(storedDismissed) as string[])
  }, [])

  const getRegTarget = (cat: Category): number => monthlyTargets[selectedMonth]?.reg?.[cat] ?? 0
  const getDoneTarget = (cat: Category): number => monthlyTargets[selectedMonth]?.done?.[cat] ?? 0
  const setRegTarget = (cat: Category, val: number) => {
    const updated = { ...monthlyTargets, [selectedMonth]: { ...monthlyTargets[selectedMonth], reg: { ...monthlyTargets[selectedMonth]?.reg, [cat]: val } } }
    setMonthlyTargets(updated)
    localStorage.setItem(TARGETS_KEY, JSON.stringify(updated))
  }
  const setDoneTarget = (cat: Category, val: number) => {
    const updated = { ...monthlyTargets, [selectedMonth]: { ...monthlyTargets[selectedMonth], done: { ...monthlyTargets[selectedMonth]?.done, [cat]: val } } }
    setMonthlyTargets(updated)
    localStorage.setItem(TARGETS_KEY, JSON.stringify(updated))
  }

  const saveUserMap = () => {
    localStorage.setItem(USER_MAP_KEY, JSON.stringify(mapDraft))
    setUserMap(mapDraft)
    setMapSaved(true)
    setTimeout(() => setMapSaved(false), 2000)
  }

  const allRawUsers = [...new Set(entries.map(e => e.user))].filter(Boolean).sort()
  const autoSuggestions = computeAutoSuggestions(allRawUsers).filter(s => !dismissedPairs.includes(s.key))
  const autoMap = buildAutoMap(allRawUsers, dismissedPairs)
  // Manual userMap overrides autoMap; autoMap applies automatically without user intervention
  const effectiveName = (raw: string) => userMap[raw] || autoMap[raw] || raw

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

  const processExtraMobile = useCallback(async (files: FileList | File[]) => {
    setUploading(true)
    const fileArr = Array.from(files).filter(f => f.name.endsWith('.xlsx'))
    try {
      const results = await Promise.all(fileArr.map(parseFile))
      const newMobile = results.flat().filter(e => e.category === 'mobile')
      if (newMobile.length) {
        setEntries(prev => {
          const existingIds = new Set(prev.filter(e => e.category === 'mobile').map(e => e.requestId).filter(Boolean))
          const toAdd = newMobile.filter(e => !e.requestId || !existingIds.has(e.requestId))
          return [...prev, ...toAdd]
        })
      }
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
  const allUsers = [...new Set(entries.map(e => effectiveName(e.user)))].filter(Boolean).sort()
  const allShops = [...new Set(entries.filter(e => e.shopCode).map(e => e.shopCode!))].filter(Boolean).sort()
  const cats: Category[] = ['mobile', 'prepay', 'migra', 'home']

  const viewEntries = (selectedUser ? entries.filter(e => effectiveName(e.user) === selectedUser) : entries)
    .filter(e => {
      if (excludedUsers.has(effectiveName(e.user))) return false
      if (selectedShop && e.shopCode !== selectedShop) return false
      const s = e.status.toUpperCase()
      return !s.includes('ΑΚΥΡΩ') && !s.includes('ΕΚΚΡΕΜ') && !s.includes('ΑΠΟΡΡ') && s !== 'ΝΕΑ'
    })

  const dailyMap = new Map<string, Map<string, ParsedEntry[]>>()
  for (const e of viewEntries) {
    if (!e.date) continue
    const dk = dateKey(e.date)
    const name = effectiveName(e.user)
    if (!dailyMap.has(dk)) dailyMap.set(dk, new Map())
    const byUser = dailyMap.get(dk)!
    if (!byUser.has(name)) byUser.set(name, [])
    byUser.get(name)!.push(e)
  }
  const sortedDates = [...dailyMap.keys()].sort((a, b) => b.localeCompare(a))

  const [mYear, mMonth] = selectedMonth.split('-').map(Number)
  const monthLabel = new Date(mYear, mMonth - 1, 1).toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })
  const shiftMonth = (delta: number) => {
    const d = new Date(mYear, mMonth - 1 + delta, 1)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const monthEntries = viewEntries.filter(e => {
    const d = e.implDate || e.date
    return d ? d.getFullYear() === mYear && d.getMonth() + 1 === mMonth : false
  })
  const regMonthEntries = viewEntries.filter(e => {
    if (!e.date || !(e.date.getFullYear() === mYear && e.date.getMonth() + 1 === mMonth)) return false
    return isMobileCountable(e)
  })
  const doneMonthEntries = viewEntries.filter(e => {
    const d = (e.category === 'home' || e.category === 'migra') ? e.implDate : (e.implDate || e.date)
    if (!d || !(d.getFullYear() === mYear && d.getMonth() + 1 === mMonth)) return false
    return isMobileCountable(e) && isDone(e)
  })

  const mobilePending = viewEntries.filter(e => e.category === 'mobile' && e.status.toUpperCase().includes('ΠΡΟΕΓΚΡΙΣΗ'))
  const portInPrepayDone = viewEntries
    .filter(e => {
      if (e.category !== 'mobile') return false
      if (!(e.subCategory ?? '').toUpperCase().includes('PORT IN PREPAY')) return false
      const d = e.implDate || e.date
      if (!d || !(d.getFullYear() === mYear && d.getMonth() + 1 === mMonth)) return false
      return isDone(e)
    })
    .map(e => ({ ...e, category: 'prepay' as Category }))
  const effectiveDoneMonthEntries = [...doneMonthEntries, ...portInPrepayDone]

  const prevYear = mMonth === 1 ? mYear - 1 : mYear
  const prevM = mMonth === 1 ? 12 : mMonth - 1
  const prevDoneEntries = viewEntries.filter(e => {
    const d = (e.category === 'home' || e.category === 'migra') ? e.implDate : (e.implDate || e.date)
    if (!d) return false
    return d.getFullYear() === prevYear && d.getMonth() + 1 === prevM && isMobileCountable(e) && isDone(e)
  })
  const prevPortInPrepayDone = viewEntries
    .filter(e => {
      if (e.category !== 'mobile') return false
      if (!(e.subCategory ?? '').toUpperCase().includes('PORT IN PREPAY')) return false
      const d = e.implDate || e.date
      if (!d || !(d.getFullYear() === prevYear && d.getMonth() + 1 === prevM)) return false
      return isDone(e)
    })
    .map(e => ({ ...e, category: 'prepay' as Category }))
  const effectivePrevDoneEntries = [...prevDoneEntries, ...prevPortInPrepayDone]

  const homePending = viewEntries
    .filter(e => e.category === 'home' && e.status.toUpperCase().includes('ΥΠΟ ΥΛΟΠΟΙΗΣΗ'))
    .sort((a, b) => {
      const u = effectiveName(a.user).localeCompare(effectiveName(b.user))
      if (u !== 0) return u
      return (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0)
    })
  const migraPending = viewEntries.filter(e => e.category === 'migra' && e.status.toUpperCase().includes('ΥΠΟ ΥΛΟΠΟΙΗΣΗ'))
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const docIssues = (selectedUser ? entries.filter(e => effectiveName(e.user) === selectedUser) : entries)
    .filter(e => !excludedUsers.has(effectiveName(e.user)))
    .filter(e => !selectedShop || e.shopCode === selectedShop)
    .filter(e => {
      const s = e.status.toUpperCase()
      if (e.category === 'home') return s.includes('ΛΑΘΟΣ') || s.includes('ΕΛΛΙΠΗ ΔΙΚΑΙΟΛΟΓΗΤΙΚΑ') || s.includes('ΕΚΚΡΕΜΗ ΔΙΚΑΙΟΛΟΓΗΤΙΚΑ') || s.includes('ΚΑΤΑΧΩΡΗΜΕΝΗ') || s === 'ΝΕΑ'
      if (e.category === 'mobile') {
        if (s === 'ΝΕΑ' || s === 'ΚΑΤΑΧΩΡΗΜΕΝΗ') return true
        if (s === 'ΣΕ ΕΚΚΡΕΜΟΤΗΤΑ') return e.date != null && e.date >= thirtyDaysAgo
        if (s.includes('ΑΠΟΡΡΙΦΘ')) return e.date != null && e.date >= thirtyDaysAgo
        return false
      }
      if (e.category === 'migra') return s.includes('ΚΑΤΑΧΩΡΗΜΕΝΗ')
      return false
    })
  const pendingByUser = (arr: ParsedEntry[]): [string, number][] => {
    const m = new Map<string, number>()
    for (const e of arr) { const u = effectiveName(e.user); m.set(u, (m.get(u) ?? 0) + 1) }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }

  const handleExportMonthly = () => {
    const catOrder: Record<Category, number> = { mobile: 0, prepay: 1, migra: 2, home: 3 }
    const source = exportMode === 'done'
      ? effectiveDoneMonthEntries
      : viewEntries.filter(e => e.date && e.date.getFullYear() === mYear && e.date.getMonth() + 1 === mMonth)
    const rows = [...source]
      .sort((a, b) => {
        if (catOrder[a.category] !== catOrder[b.category]) return catOrder[a.category] - catOrder[b.category]
        return effectiveName(a.user).localeCompare(effectiveName(b.user))
      })
      .map(e => ({
        'Κατηγορία': CATEGORY_LABELS[e.category],
        'Υποκατηγορία': e.subCategory ?? '',
        'Χρήστης': effectiveName(e.user),
        'Ονοματεπώνυμο': e.customer,
        'Αριθμός Παραγγελίας': e.requestId,
        'Κατάσταση': e.status,
        'Ημ/νία Αίτησης': e.date ? formatDate(e.date) : '',
        'Ημ/νία Ολοκλήρωσης': e.implDate ? formatDate(e.implDate) : '',
        'Συνδέσεις': e.connections ?? 1,
      }))
    if (!rows.length) return
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Παραγγελίες')
    const userSuffix = selectedUser ? `-${selectedUser}` : ''
    const modeSuffix = exportMode === 'done' ? '-συνδεδεμενα' : '-καταχωρημενα'
    XLSX.writeFile(wb, `manager-${selectedMonth}${userSuffix}${modeSuffix}.xlsx`)
  }

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

        {/* Extra mobile upload */}
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)' }}>Επιπλέον Mobile</div>
            <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>Προσθήκη στο υπάρχον mobile — νέες εγγραφές μόνο (χωρίς αντικατάσταση)</div>
          </div>
          <label style={{ cursor: 'pointer' }}>
            <input type="file" accept=".xlsx" multiple style={{ display: 'none' }} onChange={e => e.target.files && void processExtraMobile(e.target.files)} />
            <span style={{ display: 'inline-block', padding: '7px 16px', borderRadius: 8, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', fontSize: '0.82rem', fontWeight: 600 }}>
              {uploading ? 'Επεξεργασία...' : '+ Mobile'}
            </span>
          </label>
        </div>

        {entries.length === 0 ? (
          <div className="panel-card" style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.9rem' }}>
            Δεν υπάρχουν δεδομένα — ανέβασε αρχεία Excel για να ξεκινήσεις
          </div>
        ) : (
          <>
            {/* Category pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
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

            {/* User selector */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 20, alignItems: 'center', opacity: 0.7 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.8, marginRight: 4 }}>Χρήστης</span>
              <button
                onClick={() => setSelectedUser('')}
                style={{ padding: '3px 10px', borderRadius: 20, border: `1px solid ${!selectedUser ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}`, background: !selectedUser ? 'rgba(255,255,255,0.05)' : 'transparent', color: !selectedUser ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)', fontSize: '0.73rem', fontWeight: 500, cursor: 'pointer' }}
              >Όλοι</button>
              {allUsers.map(u => {
                const isSelected = selectedUser === u
                const isExcluded = excludedUsers.has(u)
                return (
                  <div key={u} style={{ display: 'flex', alignItems: 'center', borderRadius: 20, border: `1px solid ${isExcluded ? 'rgba(239,68,68,0.2)' : isSelected ? 'rgba(8,145,178,0.5)' : 'rgba(255,255,255,0.05)'}`, background: isExcluded ? 'rgba(239,68,68,0.04)' : isSelected ? 'rgba(8,145,178,0.12)' : 'transparent', overflow: 'hidden' }}>
                    <button
                      onClick={() => { if (!isExcluded) setSelectedUser(u === selectedUser ? '' : u) }}
                      style={{ padding: '3px 8px 3px 10px', background: 'transparent', border: 'none', color: isExcluded ? 'rgba(239,68,68,0.4)' : isSelected ? '#7dd3fc' : 'rgba(255,255,255,0.38)', fontSize: '0.73rem', fontWeight: 500, cursor: isExcluded ? 'default' : 'pointer', textDecoration: isExcluded ? 'line-through' : 'none' }}
                    >{u}</button>
                    <button
                      onClick={() => { toggleExclude(u); if (isExcluded === false && selectedUser === u) setSelectedUser('') }}
                      style={{ padding: '3px 7px 3px 2px', background: 'transparent', border: 'none', color: isExcluded ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.15)', fontSize: '0.68rem', cursor: 'pointer', lineHeight: 1 }}
                      title={isExcluded ? 'Επαναφορά' : 'Αφαίρεση'}
                    >{isExcluded ? '+' : '×'}</button>
                  </div>
                )
              })}
            </div>

            {/* Shop selector */}
            {allShops.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 20, alignItems: 'center', opacity: 0.7 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.8, marginRight: 4 }}>Κατάστημα</span>
                <button
                  onClick={() => setSelectedShop('')}
                  style={{ padding: '3px 10px', borderRadius: 20, border: `1px solid ${!selectedShop ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}`, background: !selectedShop ? 'rgba(255,255,255,0.05)' : 'transparent', color: !selectedShop ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)', fontSize: '0.73rem', fontWeight: 500, cursor: 'pointer' }}
                >Όλα</button>
                {allShops.map(shop => {
                  const isSelected = selectedShop === shop
                  return (
                    <button
                      key={shop}
                      onClick={() => setSelectedShop(shop === selectedShop ? '' : shop)}
                      style={{ padding: '3px 10px', borderRadius: 20, border: `1px solid ${isSelected ? 'rgba(234,179,8,0.5)' : 'rgba(255,255,255,0.05)'}`, background: isSelected ? 'rgba(234,179,8,0.12)' : 'transparent', color: isSelected ? '#fde047' : 'rgba(255,255,255,0.38)', fontSize: '0.73rem', fontWeight: 500, cursor: 'pointer' }}
                    >{shop}</button>
                  )
                })}
              </div>
            )}

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

                {/* Date navigation bar */}
                <div className="panel-card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0 }}>Ημερομηνία</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                    <button
                      onClick={() => {
                        const idx = sortedDates.indexOf(selectedDate)
                        setSelectedDate(idx < sortedDates.length - 1 ? sortedDates[idx + 1] : sortedDates[sortedDates.length - 1])
                      }}
                      disabled={!selectedDate || sortedDates.indexOf(selectedDate) === sortedDates.length - 1}
                      style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, flexShrink: 0, opacity: (!selectedDate || sortedDates.indexOf(selectedDate) === sortedDates.length - 1) ? 0.3 : 1 }}
                    >‹</button>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      style={{ flex: 1, maxWidth: 200, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(8,145,178,0.4)', background: 'rgba(8,145,178,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none', colorScheme: 'dark', cursor: 'pointer' }}
                    />
                    <button
                      onClick={() => {
                        const idx = sortedDates.indexOf(selectedDate)
                        setSelectedDate(idx > 0 ? sortedDates[idx - 1] : sortedDates[0])
                      }}
                      disabled={!selectedDate || sortedDates.indexOf(selectedDate) === 0}
                      style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, flexShrink: 0, opacity: (!selectedDate || sortedDates.indexOf(selectedDate) === 0) ? 0.3 : 1 }}
                    >›</button>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setSelectedDate(sortedDates[0] ?? '')}
                      style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >Τελευταία</button>
                    {selectedDate && (
                      <button
                        onClick={() => setSelectedDate('')}
                        style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >Όλες</button>
                    )}
                  </div>
                </div>

                {(selectedDate ? sortedDates.filter(dk => dk === selectedDate) : sortedDates).map(dk => {
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
                                {e.connections && e.connections > 1 && <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#06b6d4', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.35)', borderRadius: 6, padding: '1px 6px', flexShrink: 0 }}>x{e.connections}</span>}
                                {e.requestId && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'monospace' }}>{e.requestId}</span>}
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
              <div className="panel-card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0 }}>Μήνας</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <button onClick={() => shiftMonth(-1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '1.1rem' }}>‹</button>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', minWidth: 180, textAlign: 'center', textTransform: 'capitalize' }}>{monthLabel}</span>
                  <button onClick={() => shiftMonth(1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '1.1rem' }}>›</button>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                  {countEntries(effectiveDoneMonthEntries)} ολοκλ.
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, flexShrink: 0 }}>
                  <button onClick={() => setExportMode('done')} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, background: exportMode === 'done' ? 'rgba(16,185,129,0.25)' : 'transparent', color: exportMode === 'done' ? '#10b981' : 'rgba(255,255,255,0.3)', transition: 'all 150ms' }}>Συνδ.</button>
                  <button onClick={() => setExportMode('reg')} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, background: exportMode === 'reg' ? 'rgba(8,145,178,0.25)' : 'transparent', color: exportMode === 'reg' ? '#22d3ee' : 'rgba(255,255,255,0.3)', transition: 'all 150ms' }}>Καταχ.</button>
                </div>
                <button
                  onClick={handleExportMonthly}
                  style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${exportMode === 'done' ? 'rgba(16,185,129,0.4)' : 'rgba(8,145,178,0.4)'}`, background: exportMode === 'done' ? 'rgba(16,185,129,0.1)' : 'rgba(8,145,178,0.1)', color: exportMode === 'done' ? '#10b981' : '#22d3ee', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Excel
                </button>
              </div>
            )}

            {tab === 'monthly' && !selectedUser && (
              <>
              {/* Category scoreboard strip */}
              <div className="panel-card" style={{ padding: 20, marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.2 }}>Ολοκληρωμένα — {monthLabel}</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.18)' }}>Δ vs προηγούμενο μήνα</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {cats.map(c => {
                    const done = countEntries(effectiveDoneMonthEntries.filter(e => e.category === c))
                    const reg = countEntries(regMonthEntries.filter(e => e.category === c))
                    const target = getDoneTarget(c)
                    const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0
                    const prevDone = countEntries(effectivePrevDoneEntries.filter(e => e.category === c))
                    const delta = done - prevDone
                    const color = CATEGORY_COLORS[c]
                    return (
                      <div key={c} style={{ padding: '16px', borderRadius: 14, background: `${color}0d`, border: `1px solid ${color}22` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{CATEGORY_LABELS[c]}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '2.4rem', fontWeight: 900, color, lineHeight: 1 }}>{done}</span>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>/{reg}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
                            {delta !== 0 ? (
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: delta > 0 ? '#10b981' : '#ef4444', background: delta > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${delta > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 5, padding: '2px 6px' }}>
                                {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}
                              </span>
                            ) : prevDone > 0 ? (
                              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', padding: '2px 5px' }}>=</span>
                            ) : null}
                            <input type="number" min={0} value={target || ''} placeholder="—" onChange={e => setDoneTarget(c, Math.max(0, parseInt(e.target.value) || 0))} title="Στόχος" style={{ width: 40, padding: '2px 5px', borderRadius: 6, border: `1px solid ${color}30`, background: `${color}10`, color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 600, outline: 'none', textAlign: 'center' }} />
                          </div>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', marginBottom: 4 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#10b981' : color, borderRadius: 999, transition: 'width 400ms ease' }} />
                        </div>
                        {target > 0 && <div style={{ fontSize: '0.62rem', color: pct >= 100 ? '#10b981' : 'rgba(255,255,255,0.2)', textAlign: 'right' }}>{pct}%</div>}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Pending / Under implementation panel */}
              {(mobilePending.length > 0 || homePending.length > 0 || migraPending.length > 0) && (
                <div className="panel-card" style={{ padding: 20, marginBottom: 4 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 16 }}>Σε εκκρεμότητα</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {mobilePending.length > 0 && (() => {
                      const label = 'Mobile — Προέγκριση'
                      const color = CATEGORY_COLORS.mobile
                      const isExpanded = expandedPending.has(label)
                      const byUser = pendingByUser(mobilePending)
                      return (
                        <div>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}
                            onClick={() => toggleExpandPending(label)}
                          >
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color }}>{label}</span>
                            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)', marginLeft: 2 }}>{mobilePending.length} σύνολο</span>
                            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>{isExpanded ? '▲' : '▼'}</span>
                          </div>
                          {isExpanded ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 16 }}>
                              {mobilePending.map((e, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderRadius: 8, background: `${color}0d`, border: `1px solid ${color}25` }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.customer || '—'}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{effectiveName(e.user)}{e.subCategory ? <> · <span style={{ color }}>{e.subCategory}</span></> : null}{e.date ? <> · <span style={{ color: 'rgba(255,255,255,0.25)' }}>{formatDate(e.date)}</span></> : null}</span>
                                  </div>
                                  {e.requestId && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace', flexShrink: 0 }}>{e.requestId}</span>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 16 }}>
                              {byUser.map(([user, count]) => (
                                <div key={user} style={{ padding: '6px 14px', borderRadius: 8, background: `${color}12`, border: `1px solid ${color}35`, display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>{user}</span>
                                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color }}>{count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                    {([
                      { label: 'Vodafone Home — Υπό Υλοποίηση', entries: homePending, color: CATEGORY_COLORS.home, expandable: true },
                      { label: 'Migration FTTH — Υπό Υλοποίηση', entries: migraPending, color: CATEGORY_COLORS.migra, expandable: false },
                    ] as const).map(({ label, entries: pe, color, expandable }) => {
                      if (!pe.length) return null
                      const byUser = pendingByUser(pe)
                      const isExpanded = expandedPending.has(label)
                      return (
                        <div key={label}>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: expandable ? 'pointer' : 'default' }}
                            onClick={() => expandable && toggleExpandPending(label)}
                          >
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color }}>{label}</span>
                            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)', marginLeft: 2 }}>{pe.length} σύνολο</span>
                            {expandable && <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>{isExpanded ? '▲' : '▼'}</span>}
                          </div>
                          {isExpanded ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 16 }}>
                              {[...pe].sort((a, b) => {
                                const u = effectiveName(a.user).localeCompare(effectiveName(b.user), 'el')
                                if (u !== 0) return u
                                const da = a.date?.getTime() ?? Infinity
                                const db = b.date?.getTime() ?? Infinity
                                return da - db
                              }).map((e, idx) => {
                                const displayDate = e.date || e.implDate
                                return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderRadius: 8, background: `${color}0d`, border: `1px solid ${color}25` }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.customer || '—'}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{effectiveName(e.user)}{displayDate ? <> · <span style={{ color: 'rgba(255,255,255,0.25)' }}>{formatDate(displayDate)}</span></> : null}</span>
                                  </div>
                                  {e.requestId && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace', flexShrink: 0 }}>{e.requestId}</span>}
                                </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 16 }}>
                              {byUser.map(([user, count]) => (
                                <div key={user} style={{ padding: '6px 14px', borderRadius: 8, background: `${color}12`, border: `1px solid ${color}35`, display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>{user}</span>
                                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color }}>{count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Doc issues panel */}
              {docIssues.length > 0 && (
                <div className="panel-card" style={{ padding: 20, marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 1.2 }}>Εκκρεμείς / Δικαιολογητικά</span>
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)', marginLeft: 2 }}>{docIssues.length} σύνολο</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {docIssues.map((e, idx) => {
                      const ageDays = e.date ? Math.floor((Date.now() - e.date.getTime()) / 86400000) : null
                      const ageColor = ageDays == null ? 'rgba(255,255,255,0.2)' : ageDays < 7 ? '#10b981' : ageDays < 20 ? '#f59e0b' : '#ef4444'
                      return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9, background: `${CATEGORY_COLORS[e.category]}0d`, border: `1px solid ${CATEGORY_COLORS[e.category]}25` }}>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.customer || '—'}</span>
                          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{effectiveName(e.user)} · <span style={{ color: CATEGORY_COLORS[e.category] }}>{CATEGORY_LABELS[e.category]}</span>{e.date ? <> · <span style={{ color: 'rgba(255,255,255,0.25)' }}>{formatDate(e.date)}</span></> : null}</span>
                        </div>
                        {ageDays != null && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: ageColor, background: `${ageColor}18`, border: `1px solid ${ageColor}40`, borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {ageDays}d
                          </span>
                        )}
                        {e.requestId && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace', flexShrink: 0 }}>{e.requestId}</span>}
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{e.status}</span>
                      </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* User leaderboard */}
              {(() => {
                const leaderboard = allUsers
                  .map(user => {
                    const done = countEntries(effectiveDoneMonthEntries.filter(e => effectiveName(e.user) === user))
                    const hasEntries = regMonthEntries.some(e => effectiveName(e.user) === user) || effectiveDoneMonthEntries.some(e => effectiveName(e.user) === user)
                    return { user, done, hasEntries }
                  })
                  .filter(r => r.hasEntries)
                  .sort((a, b) => b.done - a.done)
                const maxDone = leaderboard[0]?.done || 1
                if (!leaderboard.length) return null
                return (
                  <div className="panel-card" style={{ padding: 20 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14 }}>Κατάταξη — {monthLabel}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {leaderboard.map(({ user, done }, idx) => {
                        const fillPct = maxDone > 0 ? (done / maxDone) * 100 : 0
                        const prevUserDone = countEntries(effectivePrevDoneEntries.filter(e => effectiveName(e.user) === user))
                        const delta = done - prevUserDone
                        const catChips = cats.map(c => {
                          const n = countEntries(effectiveDoneMonthEntries.filter(e => effectiveName(e.user) === user && e.category === c))
                          return n > 0 ? { c, n } : null
                        }).filter(Boolean) as { c: Category; n: number }[]
                        const rankColor = idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#cd7f32' : 'rgba(255,255,255,0.2)'
                        return (
                          <div key={user} onClick={() => setSelectedUser(user)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: rankColor, minWidth: 22, textAlign: 'center', flexShrink: 0 }}>#{idx + 1}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{user}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                  {catChips.map(({ c, n }) => (
                                    <span key={c} style={{ fontSize: '0.67rem', fontWeight: 700, color: CATEGORY_COLORS[c], opacity: 0.85 }}>{CATEGORY_LABELS[c].substring(0, 3)} {n}</span>
                                  ))}
                                  <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fff', minWidth: 24, textAlign: 'right' }}>{done}</span>
                                  {delta !== 0 && (
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: delta > 0 ? '#10b981' : '#ef4444' }}>
                                      {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${fillPct}%`, background: idx === 0 ? 'linear-gradient(90deg,#7c3aed,#0891b2)' : 'rgba(255,255,255,0.2)', borderRadius: 999, transition: 'width 400ms ease' }} />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Per-user entry breakdown (inside !selectedUser guard — never shown) */}
              </>
            )}

            {/* ── Monthly view — single user detail ── */}
            {tab === 'monthly' && selectedUser && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* User header */}
                <div className="panel-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                      {selectedUser.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{selectedUser}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{monthLabel}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: '2rem', fontWeight: 900, color: '#a78bfa', lineHeight: 1 }}>{countEntries(effectiveDoneMonthEntries)}</span>
                    {(() => {
                      const delta = countEntries(effectiveDoneMonthEntries) - countEntries(effectivePrevDoneEntries)
                      if (delta === 0) return null
                      return (
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: delta > 0 ? '#10b981' : '#ef4444' }}>
                          {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}
                        </span>
                      )
                    })()}
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>ολοκλ.</span>
                  </div>
                </div>

                {/* Category summary rows */}
                <div className="panel-card" style={{ padding: '8px 16px' }}>
                  {cats.map(c => {
                    const catDone = countEntries(effectiveDoneMonthEntries.filter(e => e.category === c))
                    const catReg = countEntries(regMonthEntries.filter(e => e.category === c))
                    if (!catDone && !catReg) return null
                    const target = getDoneTarget(c)
                    const pct = target > 0 ? Math.min(100, Math.round((catDone / target) * 100)) : 0
                    const prevCatDone = countEntries(effectivePrevDoneEntries.filter(e => e.category === c))
                    const delta = catDone - prevCatDone
                    const color = CATEGORY_COLORS[c]
                    return (
                      <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.73rem', fontWeight: 700, color, minWidth: 85, flexShrink: 0 }}>{CATEGORY_LABELS[c]}</span>
                        <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', maxWidth: 90 }}>
                          {pct > 0 && <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#10b981' : color, borderRadius: 999 }} />}
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 900, color }}>{catDone}</span>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>/{catReg}</span>
                        {delta !== 0 ? (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: delta > 0 ? '#10b981' : '#ef4444', minWidth: 28 }}>
                            {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}
                          </span>
                        ) : <span style={{ minWidth: 28 }} />}
                      </div>
                    )
                  })}
                </div>

                {/* Entry list per category */}
                {cats.map(c => {
                  const catDoneEntries = effectiveDoneMonthEntries.filter(e => e.category === c)
                  const catRegEntries = regMonthEntries.filter(e => e.category === c)
                  if (!catDoneEntries.length && !catRegEntries.length) return null
                  const totalDone = countEntries(catDoneEntries)
                  const totalReg = countEntries(catRegEntries)
                  const doneIds = new Set(catDoneEntries.map(e => e.requestId).filter(Boolean))
                  const regOnlyEntries = catRegEntries.filter(e => !e.requestId || !doneIds.has(e.requestId))
                  return (
                    <div key={c} className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
                      <div style={{ padding: '6px 12px', background: `${CATEGORY_COLORS[c]}15`, borderBottom: `1px solid ${CATEGORY_COLORS[c]}30`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: CATEGORY_COLORS[c] }} />
                          <span style={{ fontWeight: 700, color: CATEGORY_COLORS[c], fontSize: '0.75rem' }}>{CATEGORY_LABELS[c]}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: CATEGORY_COLORS[c] }}>{totalDone} ολοκλ.</span>
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>{totalReg} σύνολο</span>
                        </div>
                      </div>
                      <div style={{ padding: '2px 0' }}>
                        {catDoneEntries.map((e, idx) => (
                          <div key={`done-${idx}`} style={{ display: 'flex', alignItems: 'center', padding: '4px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)', gap: 8 }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: CATEGORY_COLORS[c], flexShrink: 0 }} />
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.78)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.customer || '—'}</span>
                            {e.connections && e.connections > 1 && <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#06b6d4', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.35)', borderRadius: 5, padding: '1px 5px', flexShrink: 0 }}>x{e.connections}</span>}
                            {e.subCategory && <span style={{ fontSize: '0.65rem', color: `${CATEGORY_COLORS[c]}99`, flexShrink: 0 }}>{e.subCategory}</span>}
                            {e.date && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.22)', flexShrink: 0 }}>{formatDate(e.date)}</span>}
                            {e.requestId && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.22)', fontFamily: 'monospace', flexShrink: 0 }}>{e.requestId}</span>}
                          </div>
                        ))}
                        {regOnlyEntries.map((e, idx) => (
                          <div key={`reg-${idx}`} style={{ display: 'flex', alignItems: 'center', padding: '4px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)', gap: 8, opacity: 0.55 }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.customer || '—'}</span>
                            {e.subCategory && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{e.subCategory}</span>}
                            {e.date && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.15)', flexShrink: 0 }}>{formatDate(e.date)}</span>}
                            {e.requestId && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace', flexShrink: 0 }}>{e.requestId}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
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
                  <>
                    {autoSuggestions.length > 0 && (
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                          Αυτόματες Ταυτίσεις — ήδη εφαρμοσμένες
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {autoSuggestions.map(s => {
                            const canon = autoMap[s.a] || autoMap[s.b] || s.a
                            return (
                              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 9, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 5 }}>{s.a}</span>
                                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem' }}>+</span>
                                  <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 5 }}>{s.b}</span>
                                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem' }}>→</span>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981' }}>{canon}</span>
                                  {s.score === 'exact'
                                    ? <span style={{ fontSize: '0.65rem', color: '#10b981', opacity: 0.7 }}>ακριβής</span>
                                    : <span style={{ fontSize: '0.65rem', color: '#6ee7b7', opacity: 0.7 }}>παρόμοιο</span>}
                                </div>
                                <button
                                  onClick={() => {
                                    const newDismissed = [...dismissedPairs, s.key]
                                    setDismissedPairs(newDismissed)
                                    localStorage.setItem(DISMISSED_PAIRS_KEY, JSON.stringify(newDismissed))
                                  }}
                                  style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171', fontWeight: 600, fontSize: '0.7rem', cursor: 'pointer', flexShrink: 0 }}
                                >Αναίρεση</button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
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
                  </>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
