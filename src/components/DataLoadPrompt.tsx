import React, { useEffect, useRef, useState } from 'react'
import { isDirPickerSupported, getActiveDirHandle, pickBackupDir } from '../utils/backupDir'
import { importBackup } from '../services/storage'

// Shown only when the app could NOT silently auto-load data on boot — i.e. no folder is
// connected yet, or the browser revoked the folder permission after a restart (Chrome resets
// File System Access permissions per session). One click re-grants/picks the folder and reloads,
// at which point main.tsx auto-loads 'worksmart-latest.json' silently. A file-picker fallback
// covers environments where the File System Access API is unavailable.
export default function DataLoadPrompt() {
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Boot already loaded data silently → nothing to prompt.
      if ((window as any).__wsAutoLoaded) return
      // A connected folder with granted permission means the app is already set up
      // (the folder may simply have no backup yet) → don't nag.
      try {
        if (isDirPickerSupported()) {
          const granted = await getActiveDirHandle()
          if (granted) return
        }
      } catch { /* ignore */ }
      if (!cancelled) setVisible(true)
    })()
    return () => { cancelled = true }
  }, [])

  const loadFromFolder = async () => {
    setBusy(true)
    try {
      if (!isDirPickerSupported()) { fileRef.current?.click(); setBusy(false); return }
      let handle = await getActiveDirHandle(true) // re-grant with the user gesture if needed
      if (!handle) handle = await pickBackupDir()  // first-time folder selection
      if (!handle) { setBusy(false); return }      // user cancelled
      // Permission is granted for this session → reload so main.tsx auto-loads silently.
      window.location.reload()
    } catch (e) {
      console.error(e); setBusy(false)
    }
  }

  const onFile = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files && ev.target.files[0]
    ev.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      await importBackup(JSON.parse(await file.text()))
      window.location.reload()
    } catch (e) {
      console.error(e); setBusy(false)
      alert('Μη έγκυρο αρχείο backup.')
    }
  }

  if (!visible) return null

  return (
    <>
      <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={onFile} />
      <div style={{
        position: 'fixed',
        bottom: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 300,
        maxWidth: 440,
        width: 'calc(100% - 32px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 14,
        background: 'linear-gradient(180deg, rgba(124,58,237,0.22), rgba(124,58,237,0.12))',
        border: '1px solid rgba(124,58,237,0.45)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
        color: '#ede9fe',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Φόρτωση δεδομένων</div>
          <div style={{ fontSize: '0.76rem', color: 'rgba(237,233,254,0.7)', marginTop: 2 }}>
            Σύνδεσε τον φάκελο backup για αυτόματη φόρτωση & αποθήκευση.
          </div>
        </div>
        <button
          onClick={loadFromFolder}
          disabled={busy}
          style={{
            flexShrink: 0,
            padding: '8px 14px',
            borderRadius: 10,
            border: 'none',
            background: '#7c3aed',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? '…' : 'Φόρτωση'}
        </button>
        <button
          onClick={() => setVisible(false)}
          aria-label="Κλείσιμο"
          style={{
            flexShrink: 0,
            width: 26,
            height: 26,
            borderRadius: 8,
            border: 'none',
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(237,233,254,0.8)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
    </>
  )
}
