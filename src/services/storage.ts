// Simple localStorage-backed storage to mirror AppDatabase/AppPreferences
import { v4 as uuidv4 } from 'uuid'

const ENTRIES_KEY = 'ws_entries'
const GOALS_KEY = 'ws_goals'
const TASKS_KEY = 'ws_tasks'
const PENDINGS_KEY = 'ws_pendings'

// profile + suggestions (stored directly by Profile/AddGoal pages)
const PROFILE_KEYS = [
  'ws_user_first',
  'ws_user_last',
  'ws_user_email',
  'ws_user_phone',
  'ws_user_store',
  'ws_user_role',
  'ws_user_store_email',
  'ws_user_employer_email',
  'ws_user_passwords',
  'ws_suggestions_store',
  'ws_suggestions_role',
  'ws_suggestions_email',
  'ws_suggestions_store_email',
  'ws_suggestions_employer_email',
  'ws_suggestions_app',
  'ws_suggestions_goal_category',
]

const CORE_KEYS = [ENTRIES_KEY, GOALS_KEY, TASKS_KEY, PENDINGS_KEY] as const
const BACKUP_KEYS = [...CORE_KEYS, ...PROFILE_KEYS] as const

type StorageBackend = {
  getItem: (key: string) => string | null | Promise<string | null>
  setItem: (key: string, value: string) => void | Promise<void>
  removeItem?: (key: string) => void | Promise<void>
  clear?: () => void | Promise<void>
}

const memoryStore = new Map<string, string>()

function getMemoryBackend(): StorageBackend {
  return {
    getItem: (k) => (memoryStore.has(k) ? (memoryStore.get(k) as string) : null),
    setItem: (k, v) => {
      memoryStore.set(k, v)
    },
    removeItem: (k) => {
      memoryStore.delete(k)
    },
    clear: () => {
      memoryStore.clear()
    },
  }
}

function getStorageBackend(): StorageBackend {
  if (typeof window !== 'undefined' && window.wsDeviceStorage) {
    return {
      getItem: (k) => window.wsDeviceStorage!.getItem(k),
      setItem: (k, v) => window.wsDeviceStorage!.setItem(k, v).then(() => undefined),
      removeItem: (k) => window.wsDeviceStorage!.removeItem(k).then(() => undefined),
      clear: () => window.wsDeviceStorage!.clear().then(() => undefined),
    }
  }

  // Some locked-down environments (often with file://) can throw on localStorage access.
  try {
    if (typeof localStorage === 'undefined') return getMemoryBackend()
    const probeKey = '__ws_probe__'
    localStorage.setItem(probeKey, '1')
    localStorage.removeItem(probeKey)

    return {
      getItem: (k) => {
        try {
          return localStorage.getItem(k)
        } catch {
          return null
        }
      },
      setItem: (k, v) => {
        try {
          localStorage.setItem(k, v)
        } catch {
          // ignore
        }
      },
      removeItem: (k) => {
        try {
          localStorage.removeItem(k)
        } catch {
          // ignore
        }
      },
      clear: () => {
        try {
          localStorage.clear()
        } catch {
          // ignore
        }
      },
    }
  } catch {
    return getMemoryBackend()
  }
}

export interface DailyEntry { id: string, points:number, date:string, category?:string, homeType?:string, orderNumber?:string, customerName?:string, afm?:string, mobilePhone?:string, landlinePhone?:string }
export interface Goal { id: string, category?:string, title?:string, target:number, year?:number, month?:number, notes?:string, color?:string }
export interface Task { id: string, title:string, done:boolean }
export interface CategoryProgress { category: string, target:number, achieved:number, month:number, year:number }
export interface PendingItem {
  id: string
  customerName?: string
  mobile?: string
  landline?: string
  afm?: string
  description?: string
  dueDate?: string // ISO date string for προθεσμία
  notes?: string
  pendingType?: string
  createdAt?: string
}

async function read<T>(key:string): Promise<T[]> {
  const storage = getStorageBackend()
  const raw = await storage.getItem(key)
  if(!raw) return []
  try { return JSON.parse(raw) as T[] } catch { return [] }
}

async function write<T>(key:string, arr:T[]){
  const storage = getStorageBackend()
  await storage.setItem(key, JSON.stringify(arr))
}

export type WorksmartBackup = {
  format: 'worksmart-backup'
  version: 1
  createdAt: string
  keys: string[]
  data: Record<string, string | null>
}

export async function exportBackup(): Promise<WorksmartBackup> {
  const storage = getStorageBackend()
  const data: Record<string, string | null> = {}
  for (const k of BACKUP_KEYS) {
    try {
      data[k] = await storage.getItem(k)
    } catch {
      data[k] = null
    }
  }
  return {
    format: 'worksmart-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    keys: [...BACKUP_KEYS],
    data,
  }
}

export async function importBackup(backup: unknown): Promise<{ importedKeys: number }>{
  const b = backup as Partial<WorksmartBackup>
  if (!b || b.format !== 'worksmart-backup' || b.version !== 1 || !b.data) {
    throw new Error('Invalid backup file')
  }

  const storage = getStorageBackend()
  const keys = Array.isArray(b.keys) ? b.keys : Object.keys(b.data)
  let importedKeys = 0
  for (const k of keys) {
    if (typeof k !== 'string') continue
    const v = (b.data as any)[k]
    try {
      if (v === null || typeof v === 'undefined') {
        await storage.removeItem?.(k)
      } else if (typeof v === 'string') {
        await storage.setItem(k, v)
      } else {
        // ignore non-string values
        continue
      }
      importedKeys++
    } catch {
      // ignore individual key failures
    }
  }

  return { importedKeys }
}

export async function clearAllData(){
  const storage = getStorageBackend()
  try {
    // remove only app-owned keys; avoid nuking unrelated site data.
    for (const k of BACKUP_KEYS) {
      try { await storage.removeItem?.(k) } catch {}
    }
  } catch {
    // best-effort
    try { await storage.clear?.() } catch {}
  }
}

export async function loadAllEntries(): Promise<DailyEntry[]>{
  return read<DailyEntry>(ENTRIES_KEY)
}
export async function saveEntry(payload:Partial<DailyEntry>){
  const entries = await read<DailyEntry>(ENTRIES_KEY)
  const entry:DailyEntry = {
    id: uuidv4(),
    points: payload.points||0,
    date: payload.date||new Date().toISOString(),
    category: payload.category,
    homeType: (payload as any).homeType,
    orderNumber: (payload as any).orderNumber || '',
    customerName: (payload as any).customerName || '',
    afm: (payload as any).afm || '',
    mobilePhone: (payload as any).mobilePhone || '',
    landlinePhone: (payload as any).landlinePhone || ''
  }
  entries.push(entry)
  await write(ENTRIES_KEY, entries)
  // notify the app that entries changed so UI can refresh (same-tab)
  try{
    if (typeof window !== 'undefined' && typeof (window as any).dispatchEvent === 'function'){
      const ev = new CustomEvent('ws:entries-updated', { detail: { action: 'add', entry } })
      window.dispatchEvent(ev)
    }
  }catch(e){ /* ignore */ }
  // debug: log the saved entry so devs can inspect localStorage writes
  try{ console.debug && console.debug('[storage] saveEntry persisted', entry) }catch(e){}
  return entry
}

export async function loadAllGoals(): Promise<Goal[]>{
  return read<Goal>(GOALS_KEY)
}
export async function saveGoal(payload:Partial<Goal>){
  const goals = await read<Goal>(GOALS_KEY)
  const now = new Date()
  const g:Goal = {
    id: uuidv4(),
    category: payload.category || payload.title || 'Uncategorized',
    title: payload.title || payload.category || 'Untitled',
    target: payload.target||0,
    year: payload.year || now.getFullYear(),
    month: payload.month || (now.getMonth()+1),
    notes: payload.notes || '',
    color: payload.color || '#7c3aed'
  }
  goals.push(g)
  await write(GOALS_KEY, goals)
}

export async function loadAllTasks(): Promise<Task[]>{
  return read<Task>(TASKS_KEY)
}
export async function saveTask(payload:Partial<Task>){
  const tasks = await read<Task>(TASKS_KEY)
  const t:Task = { id: uuidv4(), title: payload.title||'Task', done: !!payload.done }
  tasks.push(t)
  await write(TASKS_KEY, tasks)
}
export async function toggleTaskDone(id:string){
  const tasks = await read<Task>(TASKS_KEY)
  const idx = tasks.findIndex(t=>t.id===id)
  if(idx!==-1){ tasks[idx].done = !tasks[idx].done; await write(TASKS_KEY, tasks) }
}

// Pending items (εκκρεμότητες)
export async function loadPendingItems(): Promise<PendingItem[]>{
  // read raw array and migrate any old-shape items to the new shape
  const raw = await read<any>(PENDINGS_KEY)
  let migrated = false
  const out: PendingItem[] = raw.map((it:any) => {
    // already in new shape?
    if(it && (it.customerName || it.afm || it.description)){
      return {
        id: it.id || uuidv4(),
        customerName: it.customerName || '',
        mobile: it.mobile || '',
        afm: it.afm || '',
        description: it.description || '',
        createdAt: it.createdAt || new Date().toISOString()
      }
    }

    // old shape -> migrate
    // old fields: firstName, lastName, mobile, landline, subject
    migrated = true
    const customerName = ((it.firstName || '') + ' ' + (it.lastName || '')).trim()
    return {
      id: it.id || uuidv4(),
      customerName: customerName || '',
      mobile: it.mobile || '',
      landline: it.landline || '',
      afm: it.afm || '',
      description: it.subject || '',
      dueDate: it.dueDate || '',
      notes: it.notes || '',
      pendingType: it.pendingType || '',
      createdAt: it.createdAt || new Date().toISOString()
    }
  })

  // if migration happened, persist new shape back to storage
  if(migrated){
    try{ await write<PendingItem>(PENDINGS_KEY, out) }catch(e){ console.warn('pending items migration write failed', e) }
  }

  return out
}

export async function savePendingItem(payload:Partial<PendingItem>){
  const arr = await read<PendingItem>(PENDINGS_KEY)
  const p:PendingItem = {
    id: uuidv4(),
    customerName: payload.customerName || '',
    mobile: payload.mobile || '',
    landline: payload.landline || '',
    afm: payload.afm || '',
    description: payload.description || '',
    dueDate: payload.dueDate || '',
    notes: payload.notes || '',
    pendingType: payload.pendingType || '',
    createdAt: payload.createdAt || new Date().toISOString()
  }
  arr.push(p)
  await write(PENDINGS_KEY, arr)
  return p
}

export async function updatePendingItem(id:string, payload:Partial<PendingItem>){
  const arr = await read<PendingItem>(PENDINGS_KEY)
  const idx = arr.findIndex(a=>a.id===id)
  if(idx === -1) return null
  arr[idx] = { ...arr[idx], ...payload }
  await write(PENDINGS_KEY, arr)
  return arr[idx]
}

export async function deletePendingItem(id:string){
  const arr = await read<PendingItem>(PENDINGS_KEY)
  const idx = arr.findIndex(a=>a.id===id)
  if(idx===-1) return false
  arr.splice(idx,1)
  await write(PENDINGS_KEY, arr)
  return true
}

export function getProgressSummary(){
  // Sync helper for callers; relies on localStorage only.
  // In Electron, prefer using async loaders instead.
  let raw: string | null = null
  if (typeof window !== 'undefined' && !window.wsDeviceStorage) {
    try {
      raw = localStorage.getItem(ENTRIES_KEY)
    } catch {
      raw = null
    }
  }
  const entries = raw ? (JSON.parse(raw) as DailyEntry[]) : []
  const total = entries.reduce((s,e)=> s + (e.points||0), 0)
  const achieved = entries.filter(e=> (e.points||0) > 0).length
  return { total, achieved }
}

export async function loadEntriesForMonth(year:number, month:number): Promise<DailyEntry[]>{
  const m = month < 10 ? `0${month}` : `${month}`
  const prefix = `${year}-${m}`
  const all = await read<DailyEntry>(ENTRIES_KEY)
  return all.filter(e => typeof e.date === 'string' && e.date.startsWith(prefix))
}

export async function loadGoalsForMonth(year:number, month:number): Promise<Goal[]>{
  const all = await read<Goal>(GOALS_KEY)
  return all.filter(g => g.year === year && g.month === month)
}

// Build category progress similar to ProgressViewModel.loadProgressForMonth
export async function getProgressForMonth(year:number, month:number): Promise<CategoryProgress[]>{
  const yearMonth = `${year}-${month < 10 ? '0'+month : month}`
  const goals = await loadGoalsForMonth(year, month)
  const entries = await loadEntriesForMonth(year, month)

  const totals: Record<string, number> = {}
  for(const entry of entries){
    if(!entry) continue
    const cat = entry['category'] || 'Uncategorized'
    totals[cat] = (totals[cat] || 0) + (entry.points || 0)
  }

  const result: CategoryProgress[] = goals.map(g => {
    const key = g.category || g.title || 'Uncategorized'
    return {
      category: g.title || key,
      target: g.target || 0,
      achieved: totals[key] || 0,
      month: g.month || month,
      year: g.year || year
    }
  })

  return result
}
