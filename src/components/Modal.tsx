import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type ModalProps = {
  isOpen: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  height?: 'normal' | 'short'
}

export default function Modal({ isOpen, title, onClose, children, size = 'lg', height = 'normal' }: ModalProps){
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const sizeClass = size === 'sm' ? 'max-w-md' : size === 'md' ? 'max-w-xl' : 'max-w-3xl'
  const heightClass = height === 'short' ? 'max-h-[60vh]' : ''

  // Close on ESC
  useEffect(() => {
    if(!isOpen) return
    const onKey = (ev: KeyboardEvent) => { if(ev.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // Prevent body scroll while open
  useEffect(() => {
    if(!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  // click on backdrop closes
  function onBackdropClick(e: React.MouseEvent){
    if(e.target === overlayRef.current) onClose()
  }

  // focus the panel when opened (accessibility nicety)
  useEffect(() => {
    if(isOpen){
      setTimeout(() => panelRef.current?.focus(), 50)
    }
  }, [isOpen])

  if(!isOpen) return null

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={onBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`${sizeClass} ${heightClass} w-full mx-4 p-6 outline-none flex flex-col`}
        style={{ background: 'linear-gradient(180deg, rgba(18,8,40,0.98), rgba(12,5,28,0.98))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, boxShadow: '0 24px 60px rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)', color: '#fff' }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4" style={{ paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="pr-4">
            {title ? <h3 className="text-lg font-semibold" style={{ color: '#fff', fontSize: '1rem', fontWeight: 700 }}>{title}</h3> : null}
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, padding: 6, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className={height === 'short' ? 'ws-scrollbar flex-1 overflow-y-auto pr-1' : undefined}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
