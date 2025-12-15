import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type ModalProps = {
  isOpen: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
}

export default function Modal({ isOpen, title, onClose, children }: ModalProps){
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

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
        className="bg-gradient-to-br from-purple-700/80 to-pink-600/60 backdrop-blur-md text-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 p-6 outline-none"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="pr-4">
            {title ? <h3 className="text-lg font-semibold">{title}</h3> : null}
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-white/10 focus:ring-2 focus:ring-white/30"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
