import { useEffect } from 'react'
import { exportBackup } from '../services/storage'
import { getActiveDirHandle, writeFileToDir } from '../utils/backupDir'

// Mon=1 Wed=3 Sat=6 → 15:20
// Tue=2 Thu=4 Fri=5 → 20:55
const SCHEDULE: Record<number, { h: number; m: number }> = {
  1: { h: 15, m: 20 },
  2: { h: 20, m: 55 },
  3: { h: 15, m: 20 },
  4: { h: 20, m: 55 },
  5: { h: 20, m: 55 },
  6: { h: 15, m: 20 },
}

const LAST_BACKUP_KEY = 'ws_last_scheduled_backup'

// Stable filename the app auto-loads on boot when a folder is connected (see main.tsx).
export const LATEST_FILENAME = 'worksmart-latest.json'

function scheduleKeyFor(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getDay()}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Unique, sortable filename so the user can always pick the newest backup on load.
function timestampedName(d = new Date()): string {
  return `worksmart-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.json`
}

function downloadJson(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Export current data and persist it. Writes silently to a connected folder if one exists
// (opportunistic — not available on file:// in Citrix), otherwise downloads a timestamped file.
// Reused by the manual "Save now" button and the on-change auto-save.
export async function saveBackupNow(): Promise<void> {
  const backup = await exportBackup()
  const json = JSON.stringify(backup, null, 2)
  const dirHandle = await getActiveDirHandle()
  if (dirHandle) {
    await writeFileToDir(dirHandle, LATEST_FILENAME, json)   // stable file for boot auto-load
    await writeFileToDir(dirHandle, timestampedName(), json) // dated history snapshot
  } else {
    downloadJson(json, timestampedName())
  }
}

async function triggerScheduledBackup() {
  await saveBackupNow()
  try { localStorage.setItem(LAST_BACKUP_KEY, scheduleKeyFor(new Date())) } catch { /* storage may be locked */ }
}

// Dirty-check signature based on DATA only (excludes the changing createdAt timestamp), so an
// unchanged dataset never triggers a redundant download.
let lastSavedSignature = ''

async function autoSaveOnChange(): Promise<void> {
  const backup = await exportBackup()
  const signature = JSON.stringify(backup.data)
  if (signature === lastSavedSignature) return // nothing changed since last save

  const json = JSON.stringify(backup, null, 2)
  const dirHandle = await getActiveDirHandle()
  if (dirHandle) {
    await writeFileToDir(dirHandle, LATEST_FILENAME, json)
  } else {
    downloadJson(json, timestampedName())
  }
  lastSavedSignature = signature
}

export function useScheduledBackup() {
  useEffect(() => {
    const check = () => {
      const now = new Date()
      const slot = SCHEDULE[now.getDay()]
      if (!slot) return
      if (now.getHours() !== slot.h || now.getMinutes() !== slot.m) return
      let last: string | null = null
      try { last = localStorage.getItem(LAST_BACKUP_KEY) } catch { last = null }
      if (last === scheduleKeyFor(now)) return // already ran this slot
      triggerScheduledBackup().catch(console.error)
    }

    check() // run immediately on mount in case app opened exactly at scheduled time
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [])

  // Auto-save on every data change. Debounced so a burst of edits collapses into a single save
  // ~20s after the user stops; the dirty-check avoids redundant downloads. On file:// (no folder
  // handle) this downloads a timestamped backup; with a connected folder it writes silently.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onChange = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { autoSaveOnChange().catch(console.error) }, 20_000)
    }
    window.addEventListener('ws:entries-updated', onChange)
    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('ws:entries-updated', onChange)
    }
  }, [])
}
