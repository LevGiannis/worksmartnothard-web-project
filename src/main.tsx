import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { registerNotifications } from './utils/notifications'
import { isDirPickerSupported, getActiveDirHandle, readFileFromDir } from './utils/backupDir'
import { importBackup } from './services/storage'
import { LATEST_FILENAME } from './hooks/useScheduledBackup'

// Initialize theme from localStorage or system preference before render
try{
  const saved = localStorage.getItem('theme')
  if(saved === 'dark') document.documentElement.classList.add('dark')
  else if(saved === 'light') document.documentElement.classList.remove('dark')
  else if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark')
}catch(e){}

// Best-effort silent auto-load from the connected backup folder (Citrix file:// persistence).
// Only succeeds when a folder handle exists AND its permission is already 'granted' (no user
// gesture needed). Data lands in storage BEFORE first render → zero-click, no flicker/reload.
// If this returns false, the in-app DataLoadPrompt offers a one-click load.
async function autoLoadFromFolder(): Promise<void> {
  try {
    if (!isDirPickerSupported()) return
    const handle = await getActiveDirHandle() // granted-only, silent
    if (!handle) return
    const text = await readFileFromDir(handle, LATEST_FILENAME)
    if (!text) return
    await importBackup(JSON.parse(text))
    ;(window as any).__wsAutoLoaded = true
  } catch (e) {
    console.warn('[ws] folder auto-load skipped', e)
  }
}

async function bootstrap() {
  await autoLoadFromFolder()

  const tree = (() => {
    const isElectron = typeof window !== 'undefined' && !!window.wsDeviceStorage
    const isFile = typeof window !== 'undefined' && window.location?.protocol === 'file:'
    if (isElectron || isFile) {
      return (
        <HashRouter>
          <App />
        </HashRouter>
      )
    }

    const baseUrl = import.meta.env.BASE_URL
    const basename = baseUrl && baseUrl.startsWith('.') ? '/' : baseUrl
    return (
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    )
  })()

  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>{tree}</React.StrictMode>
  )

  // Try to register a service worker / notifications helper (best-effort)
  registerNotifications().catch(()=>{
    // ignore registration errors in prototype
  })
}

bootstrap()
