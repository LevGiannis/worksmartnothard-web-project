// Simple localStorage-backed storage to mirror AppDatabase/AppPreferences
import { v4 as uuidv4 } from 'uuid'

const ENTRIES_KEY = 'ws_entries'
const GOALS_KEY = 'ws_goals'
const TASKS_KEY = 'ws_tasks'
const PENDINGS_KEY = 'ws_pendings'

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

function read<T>(key:string): T[] {
  const raw = localStorage.getItem(key)
  if(!raw) return []
  try { return JSON.parse(raw) as T[] } catch { return [] }
}
function write<T>(key:string, arr:T[]){
  localStorage.setItem(key, JSON.stringify(arr))
}

export async function loadAllEntries(): Promise<DailyEntry[]>{
  return read<DailyEntry>(ENTRIES_KEY)
}
export async function saveEntry(payload:Partial<DailyEntry>){
  const entries = read<DailyEntry>(ENTRIES_KEY)
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
  write(ENTRIES_KEY, entries)
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
  const goals = read<Goal>(GOALS_KEY)
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
  write(GOALS_KEY, goals)
}

export async function loadAllTasks(): Promise<Task[]>{
  return read<Task>(TASKS_KEY)
}
export async function saveTask(payload:Partial<Task>){
  const tasks = read<Task>(TASKS_KEY)
  const t:Task = { id: uuidv4(), title: payload.title||'Task', done: !!payload.done }
  tasks.push(t)
  write(TASKS_KEY, tasks)
}
export async function toggleTaskDone(id:string){
  const tasks = read<Task>(TASKS_KEY)
  const idx = tasks.findIndex(t=>t.id===id)
  if(idx!==-1){ tasks[idx].done = !tasks[idx].done; write(TASKS_KEY, tasks) }
}

// Pending items (εκκρεμότητες)
export async function loadPendingItems(): Promise<PendingItem[]>{
  // read raw array and migrate any old-shape items to the new shape
  const raw = read<any>(PENDINGS_KEY)
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
    try{ write<PendingItem>(PENDINGS_KEY, out) }catch(e){ console.warn('pending items migration write failed', e) }
  }

  return out
}

export async function savePendingItem(payload:Partial<PendingItem>){
  const arr = read<PendingItem>(PENDINGS_KEY)
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
  write(PENDINGS_KEY, arr)
  return p
}

export async function updatePendingItem(id:string, payload:Partial<PendingItem>){
  const arr = read<PendingItem>(PENDINGS_KEY)
  const idx = arr.findIndex(a=>a.id===id)
  if(idx === -1) return null
  arr[idx] = { ...arr[idx], ...payload }
  write(PENDINGS_KEY, arr)
  return arr[idx]
}

export async function deletePendingItem(id:string){
  const arr = read<PendingItem>(PENDINGS_KEY)
  const idx = arr.findIndex(a=>a.id===id)
  if(idx===-1) return false
  arr.splice(idx,1)
  write(PENDINGS_KEY, arr)
  return true
}

export function getProgressSummary(){
  const entries = read<DailyEntry>(ENTRIES_KEY)
  const total = entries.reduce((s,e)=> s + (e.points||0), 0)
  const achieved = entries.filter(e=> (e.points||0) > 0).length
  return { total, achieved }
}

export async function loadEntriesForMonth(year:number, month:number): Promise<DailyEntry[]>{
  const m = month < 10 ? `0${month}` : `${month}`
  const prefix = `${year}-${m}`
  const all = read<DailyEntry>(ENTRIES_KEY)
  return all.filter(e => typeof e.date === 'string' && e.date.startsWith(prefix))
}

export async function loadGoalsForMonth(year:number, month:number): Promise<Goal[]>{
  const all = read<Goal>(GOALS_KEY)
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

// Utility: clear stored data (entries, goals, tasks)
export async function clearAllData(){
  try{
    write(ENTRIES_KEY, [])
    write(GOALS_KEY, [])
    write(TASKS_KEY, [])
  }catch(e){
    console.error('clearAllData failed', e)
    throw e
  }
}
