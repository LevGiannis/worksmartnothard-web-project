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

// Stable filename the app auto-loads on boot (see main.tsx). Always overwritten with the newest data.
export const LATEST_FILENAME = 'worksmart-latest.json'

function scheduleKeyFor(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getDay()}`
}

// Silently writes the latest snapshot to the connected folder. No-op if no granted dir handle.
async function writeLatestToDir(): Promise<boolean> {
  const dirHandle = await getActiveDirHandle()
  if (!dirHandle) return false
  const backup = await exportBackup()
  await writeFileToDir(dirHandle, LATEST_FILENAME, JSON.stringify(backup, null, 2))
  return true
}

async function triggerBackup() {
  const backup = await exportBackup()
  const json = JSON.stringify(backup, null, 2)
  const date = new Date().toISOString().slice(0, 10)
  const filename = `worksmart-backup-${date}.json`

  const dirHandle = await getActiveDirHandle()
  if (dirHandle) {
    await writeFileToDir(dirHandle, filename, json)        // dated history snapshot
    await writeFileToDir(dirHandle, LATEST_FILENAME, json) // stable file for boot auto-load
  } else {
    // fallback: browser download
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  localStorage.setItem(LAST_BACKUP_KEY, scheduleKeyFor(new Date()))
}

export function useScheduledBackup() {
  useEffect(() => {
    const check = () => {
      const now = new Date()
      const slot = SCHEDULE[now.getDay()]
      if (!slot) return
      if (now.getHours() !== slot.h || now.getMinutes() !== slot.m) return
      const last = localStorage.getItem(LAST_BACKUP_KEY)
      if (last === scheduleKeyFor(now)) return // already ran this slot
      triggerBackup().catch(console.error)
    }

    check() // run immediately on mount in case app opened exactly at scheduled time
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [])

  // Auto-save to the connected folder on every data change (debounced), so the
  // 'worksmart-latest.json' file stays current between scheduled backups.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onChange = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { writeLatestToDir().catch(console.error) }, 2500)
    }
    window.addEventListener('ws:entries-updated', onChange)
    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('ws:entries-updated', onChange)
    }
  }, [])
}
