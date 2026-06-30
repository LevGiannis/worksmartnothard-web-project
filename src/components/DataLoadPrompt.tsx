import React, { useEffect, useRef, useState } from 'react'
import { hasAnyData, importBackup } from '../services/storage'
import { saveBackupNow } from '../hooks/useScheduledBackup'

// In the Citrix portable (file://) environment the File System Access folder picker is blocked,
// so the only reliable file I/O is <input type="file"> (load) and <a download> (save). Browser
// storage is wiped between sessions but works within one, so this prompt shows once per session:
//   - no data yet  → "Load" banner: pick the latest backup file from the persistent drive (1 click)
//   - data present → compact "Save" pill: download a fresh backup on demand before closing
export default function DataLoadPrompt() {
  const [mode, setMode] = useState<'hidden' | 'load' | 'save'>('hidden')
  const [busy, setBusy] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    hasAnyData()
      .then(has => { if (!cancelled) setMode(has ? 'save' : 'load') })
      .catch(() => { if (!cancelled) setMode('load') })
    return () => { cancelled = true }
  }, [])

  const onFile = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files && ev.target.files[0]
    ev.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      await importBackup(JSON.parse(await file.text()))
      window.location.reload() // data now lives in storage for the rest of the session
    } catch (e) {
      console.error(e); setBusy(false)
      alert('Μη έγκυρο αρχείο backup.')
    }
  }

  const onSave = async () => {
    setBusy(true)
    try {
      await saveBackupNow()
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2500)
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  const hiddenInput = (
    <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={onFile} />
  )

  if (mode === 'hidden') return hiddenInput

  if (mode === 'save') {
    return (
      <>
        {hiddenInput}
        <button
          onClick={onSave}
          disabled={busy}
          title="Αποθήκευση δεδομένων σε αρχείο"
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            borderRadius: 999,
            border: `1px solid ${justSaved ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.12)'}`,
            background: justSaved ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(8px)',
            color: justSaved ? '#6ee7b7' : 'rgba(255,255,255,0.7)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1,
            transition: 'background 300ms ease, border-color 300ms ease, color 300ms ease',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 3h11l3 3v15H5V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M8 3v5h6V3M8 21v-6h8v6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          {justSaved ? 'Αποθηκεύτηκε ✓' : busy ? '…' : 'Αποθήκευση'}
        </button>
      </>
    )
  }

  // mode === 'load'
  return (
    <>
      {hiddenInput}
      <div style={{
        position: 'fixed',
        bottom: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 300,
        maxWidth: 460,
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
          <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Φόρτωση δεδομένων</div>
          <div style={{ fontSize: '0.76rem', color: 'rgba(237,233,254,0.7)', marginTop: 2 }}>
            Διάλεξε το πιο πρόσφατο backup αρχείο από τον φάκελό σου.
          </div>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
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
          onClick={() => setMode('save')}
          aria-label="Κλείσιμο"
          title="Συνέχεια χωρίς φόρτωση"
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
