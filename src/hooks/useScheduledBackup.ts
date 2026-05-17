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

function scheduleKeyFor(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getDay()}`
}

async function triggerBackup() {
  const backup = await exportBackup()
  const json = JSON.stringify(backup, null, 2)
  const date = new Date().toISOString().slice(0, 10)
  const filename = `worksmart-backup-${date}.json`

  const dirHandle = await getActiveDirHandle()
  if (dirHandle) {
    await writeFileToDir(dirHandle, filename, json)
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
}
