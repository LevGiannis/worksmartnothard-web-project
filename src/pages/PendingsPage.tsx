import React, { useEffect, useMemo, useRef, useState } from 'react'
import { loadPendingItems, savePendingItem, updatePendingItem, deletePendingItem, PendingItem, loadAllGoals, Goal } from '../services/storage'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { STATIC_PENDING_TYPES } from '../constants'

// ─── type colour system ───────────────────────────────────────────────────────
const TYPE_PALETTE: Record<string, { accent: string; bg: string; text: string }> = {
  'Μεταβίβαση':          { accent: '#8b5cf6', bg: 'rgba(139,92,246,0.14)',  text: '#c4b5fd' },
  'Μετακόμιση':          { accent: '#3b82f6', bg: 'rgba(59,130,246,0.14)',  text: '#93c5fd' },
  'Δόσεις':              { accent: '#f59e0b', bg: 'rgba(245,158,11,0.14)',  text: '#fcd34d' },
  'Παραγγελία Συσκευής': { accent: '#10b981', bg: 'rgba(16,185,129,0.14)', text: '#6ee7b7' },
  'Επικοινωνία':         { accent: '#06b6d4', bg: 'rgba(6,182,212,0.14)',  text: '#67e8f9' },
  'Διακανονισμός':       { accent: '#f97316', bg: 'rgba(249,115,22,0.14)', text: '#fdba74' },
  'Επιστροφή':           { accent: '#ef4444', bg: 'rgba(239,68,68,0.14)',  text: '#fca5a5' },
  'Τεχνικό':             { accent: '#84cc16', bg: 'rgba(132,204,22,0.14)', text: '#bef264' },
  'Άλλο':                { accent: '#6b7280', bg: 'rgba(107,114,128,0.14)',text: '#d1d5db' },
}
const DEFAULT_PALETTE = { accent: '#7c3aed', bg: 'rgba(124,58,237,0.14)', text: '#c4b5fd' }
const typeColor = (t?: string) => TYPE_PALETTE[t || ''] ?? DEFAULT_PALETTE

// ─── due-date urgency ─────────────────────────────────────────────────────────
type DueStatus = 'overdue' | 'soon' | 'ok'
function dueStatus(dueDate?: string): DueStatus | null {
  if (!dueDate) return null
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0)
  const now = new Date();       now.setHours(0, 0, 0, 0)
  const days = (due.getTime() - now.getTime()) / 86_400_000
  if (days < 0)  return 'overdue'
  if (days <= 3) return 'soon'
  return 'ok'
}
const DUE_STYLE: Record<DueStatus, { bg: string; text: string; label: string }> = {
  overdue: { bg: 'rgba(239,68,68,0.18)',   text: '#fca5a5', label: 'Εκπρόθεσμο' },
  soon:    { bg: 'rgba(245,158,11,0.18)',  text: '#fcd34d', label: 'Σύντομα'     },
  ok:      { bg: 'rgba(16,185,129,0.12)', text: '#6ee7b7', label: ''             },
}

function formatDate(d?: string) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('el-GR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── small shared sub-components ─────────────────────────────────────────────
function Avatar({ name, accent }: { name?: string; accent: string }) {
  const ch = (name || '?').trim().charAt(0).toUpperCase()
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
      background: `linear-gradient(135deg, ${accent}55, ${accent}22)`,
      border: `1px solid ${accent}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: 17, color: '#fff',
    }}>{ch}</div>
  )
}

function TypeBadge({ type }: { type?: string }) {
  if (!type) return null
  const { bg, text } = typeColor(type)
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 999, fontSize: '0.78rem',
      fontWeight: 700, background: bg, color: text, whiteSpace: 'nowrap',
    }}>{type}</span>
  )
}

function DueBadge({ date }: { date?: string }) {
  if (!date) return null
  const st = dueStatus(date)
  if (!st) return null
  const { bg, text, label } = DUE_STYLE[st]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 999, fontSize: '0.78rem',
      fontWeight: 600, background: bg, color: text, whiteSpace: 'nowrap',
    }}>
      {st === 'overdue' && <span>⚠</span>}
      {label && <span>{label} · </span>}
      {formatDate(date)}
    </span>
  )
}

// ─── field wrapper used in form ───────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function PendingsPage() {
  const [items, setItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')

  // create form
  const [customerName, setCustomerName]   = useState('')
  const [mobile, setMobile]               = useState('')
  const [landline, setLandline]           = useState('')
  const [afm, setAfm]                     = useState('')
  const [description, setDescription]     = useState('')
  const [dueDate, setDueDate]             = useState('')
  const [notes, setNotes]                 = useState('')
  const [pendingType, setPendingType]     = useState('')
  const [pendingTypeOptions, setPendingTypeOptions] = useState<string[]>([])
  const [formErrors, setFormErrors]       = useState<string[]>([])

  // edit modal
  const [modalItem, setModalItem]                   = useState<PendingItem | null>(null)
  const [modalCustomerName, setModalCustomerName]   = useState('')
  const [modalMobile, setModalMobile]               = useState('')
  const [modalLandline, setModalLandline]           = useState('')
  const [modalAfm, setModalAfm]                     = useState('')
  const [modalDescription, setModalDescription]     = useState('')
  const [modalDueDate, setModalDueDate]             = useState('')
  const [modalNotes, setModalNotes]                 = useState('')
  const [modalPendingType, setModalPendingType]     = useState('')
  const [modalErrors, setModalErrors]               = useState<string[]>([])

  useEffect(() => {
    loadPendingItems().then(all => { setItems(all || []); setLoading(false) })
  }, [])

  useEffect(() => {
    loadAllGoals()
      .then((goals: Goal[]) => {
        const cats = Array.from(new Set(goals.map((g: Goal) => String(g.category || g.title || '')).filter(Boolean)))
        setPendingTypeOptions(Array.from(new Set([...STATIC_PENDING_TYPES, ...cats])))
      })
      .catch(() => setPendingTypeOptions(STATIC_PENDING_TYPES))
  }, [])

  function resetForm() {
    setCustomerName(''); setMobile(''); setLandline(''); setAfm('')
    setDescription(''); setDueDate(''); setNotes(''); setPendingType('')
    setFormErrors([])
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    const errs: string[] = []
    if (!customerName.trim()) errs.push('Απαιτείται όνομα πελάτη')
    if (!description.trim()) errs.push('Απαιτείται περιγραφή')
    if (errs.length) { setFormErrors(errs); return }
    const p = await savePendingItem({ customerName, mobile, landline, afm, description, dueDate, notes, pendingType })
    setItems(prev => [p, ...prev])
    resetForm()
  }

  function openEdit(item: PendingItem) {
    setModalItem(item)
    setModalCustomerName(item.customerName || '')
    setModalMobile(item.mobile || '')
    setModalLandline(item.landline || '')
    setModalAfm(item.afm || '')
    setModalDescription(item.description || '')
    setModalDueDate(item.dueDate || '')
    setModalNotes(item.notes || '')
    setModalPendingType(item.pendingType || '')
    setModalErrors([])
  }

  async function onSaveModal(e: React.FormEvent) {
    e.preventDefault()
    const errs: string[] = []
    if (!modalCustomerName.trim()) errs.push('Απαιτείται όνομα πελάτη')
    if (!modalDescription.trim()) errs.push('Απαιτείται περιγραφή')
    if (errs.length) { setModalErrors(errs); return }
    const updated = await updatePendingItem(modalItem!.id, {
      customerName: modalCustomerName, mobile: modalMobile, landline: modalLandline,
      afm: modalAfm, description: modalDescription, dueDate: modalDueDate,
      notes: modalNotes, pendingType: modalPendingType,
    })
    if (updated) setItems(prev => prev.map(p => p.id === modalItem!.id ? updated : p))
    setModalItem(null)
  }

  async function onDelete(id: string) {
    if (!confirm('Διαγραφή εκκρεμότητας; Δεν αναστρέφεται.')) return
    const ok = await deletePendingItem(id)
    if (ok) setItems(prev => prev.filter(p => p.id !== id))
  }

  const visible = useMemo(() => {
    return items.filter(it => {
      if (filterType && it.pendingType !== filterType) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${it.customerName} ${it.description} ${it.afm} ${it.mobile}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [items, search, filterType])

  const typeChips = useMemo(() => {
    const seen = new Set<string>()
    items.forEach(it => { if (it.pendingType) seen.add(it.pendingType) })
    return Array.from(seen)
  }, [items])

  return (
    <div className="page-content">
      <PageHeader title="Εκκρεμότητες" subtitle="Παρακολούθηση εκκρεμών ενεργειών πελατών" breadcrumb="Εκκρεμότητες" />

      <div className="page-inner" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* ── SIDEBAR FORM ─────────────────────────────────────── */}
        <aside style={{ width: 340, flexShrink: 0, position: 'sticky', top: 100 }}>
          <div className="panel-card" style={{ padding: 20 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Νέα Εκκρεμότητα
            </h2>

            {formErrors.length > 0 && (
              <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '0.85rem', color: '#fca5a5' }}>
                {formErrors.map((e, i) => <div key={i}>• {e}</div>)}
              </div>
            )}

            <form onSubmit={onCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Πελάτης *">
                <input className="panel-input" placeholder="Ονοματεπώνυμο" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </Field>

              <Field label="Τύπος">
                <select className="panel-input" value={pendingType} onChange={e => setPendingType(e.target.value)}>
                  <option value="">— Επίλεξε τύπο —</option>
                  {pendingTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>

              <Field label="Περιγραφή *">
                <input className="panel-input" placeholder="Τι αφορά..." value={description} onChange={e => setDescription(e.target.value)} />
              </Field>

              <Field label="Προθεσμία">
                <input className="panel-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Field label="Κινητό">
                  <input className="panel-input" placeholder="69..." value={mobile} onChange={e => setMobile(e.target.value)} />
                </Field>
                <Field label="Σταθερό">
                  <input className="panel-input" placeholder="21..." value={landline} onChange={e => setLandline(e.target.value)} />
                </Field>
              </div>

              <Field label="ΑΦΜ">
                <input className="panel-input" placeholder="9 ψηφία" value={afm} onChange={e => setAfm(e.target.value)} />
              </Field>

              <Field label="Σημειώσεις">
                <textarea className="panel-input" placeholder="Επιπλέον πληροφορίες..." value={notes} onChange={e => setNotes(e.target.value)} style={{ height: 72, resize: 'none' }} />
              </Field>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" className="btn-ghost" onClick={resetForm} style={{ flex: 1 }}>Καθαρισμός</button>
                <button type="submit" className="btn" style={{ flex: 2 }}>Δημιουργία</button>
              </div>
            </form>
          </div>
        </aside>

        {/* ── LIST ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* search + filter bar */}
          <div className="panel-card" style={{ padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: typeChips.length ? 12 : 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5, flexShrink: 0 }} aria-hidden>
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                className="panel-input"
                placeholder="Αναζήτηση πελάτη, περιγραφής..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, fontSize: '0.95rem' }}
              />
              {(search || filterType) && (
                <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => { setSearch(''); setFilterType('') }}>
                  Καθαρισμός
                </button>
              )}
            </div>
            {typeChips.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {typeChips.map(t => {
                  const { accent, bg, text } = typeColor(t)
                  const active = filterType === t
                  return (
                    <button
                      key={t} type="button"
                      onClick={() => setFilterType(active ? '' : t)}
                      style={{
                        padding: '4px 11px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600,
                        cursor: 'pointer', border: `1px solid ${active ? accent : 'rgba(255,255,255,0.08)'}`,
                        background: active ? bg : 'transparent',
                        color: active ? text : 'rgba(255,255,255,0.6)',
                        transition: 'all 150ms ease',
                      }}
                    >{t}</button>
                  )
                })}
              </div>
            )}
          </div>

          {/* count header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontWeight: 700, color: '#fff' }}>Εκκρεμότητες</span>
            <span style={{ padding: '2px 10px', borderRadius: 999, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', fontSize: '0.82rem', color: '#c4b5fd', fontWeight: 700 }}>
              {visible.length}
            </span>
          </div>

          {/* list */}
          {loading ? (
            <div className="panel-card muted" style={{ textAlign: 'center', padding: 40 }}>Φόρτωση...</div>
          ) : visible.length === 0 ? (
            <div className="panel-card" style={{ textAlign: 'center', padding: '52px 24px' }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📋</div>
              <div style={{ fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                {search || filterType ? 'Δεν βρέθηκαν αποτελέσματα' : 'Δεν υπάρχουν εκκρεμότητες'}
              </div>
              <div className="muted" style={{ fontSize: '0.9rem' }}>
                {search || filterType ? 'Δοκίμασε διαφορετική αναζήτηση.' : 'Πρόσθεσε την πρώτη σου εκκρεμότητα από το φόρμα αριστερά.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visible.map(it => {
                const { accent, bg, text } = typeColor(it.pendingType)
                const ds = dueStatus(it.dueDate)
                return (
                  <div key={it.id} className="panel-card" style={{
                    padding: 0, overflow: 'hidden',
                    borderLeft: `3px solid ${accent}`,
                    display: 'flex', gap: 0,
                  }}>
                    <div style={{ flex: 1, padding: '16px 18px' }}>
                      {/* row 1: avatar + name + badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <Avatar name={it.customerName} accent={accent} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {it.customerName || '—'}
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                            <TypeBadge type={it.pendingType} />
                            <DueBadge date={it.dueDate} />
                          </div>
                        </div>
                      </div>

                      {/* description */}
                      {it.description && (
                        <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', lineHeight: 1.45 }}>
                          {it.description}
                        </div>
                      )}

                      {/* contact row */}
                      {(it.mobile || it.landline || it.afm) && (
                        <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
                          {it.mobile && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>
                              {it.mobile}
                            </span>
                          )}
                          {it.landline && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.37 19 19.5 19.5 0 0 1 5 12.63 19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.07 2H7a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="1.8"/></svg>
                              {it.landline}
                            </span>
                          )}
                          {it.afm && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8"/><polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8"/></svg>
                              ΑΦΜ {it.afm}
                            </span>
                          )}
                        </div>
                      )}

                      {/* notes */}
                      {it.notes && (
                        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                          {it.notes}
                        </div>
                      )}
                    </div>

                    {/* actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderLeft: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
                      <button
                        className="btn-ghost"
                        onClick={() => openEdit(it)}
                        aria-label={`Επεξεργασία ${it.customerName || ''}`}
                        style={{ flex: 1, borderRadius: 0, padding: '0 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, minWidth: 72, fontSize: '0.75rem', borderLeft: 'none', borderTop: 'none', borderRight: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Επεξ.
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={() => onDelete(it.id)}
                        aria-label={`Διαγραφή ${it.customerName || ''}`}
                        style={{ flex: 1, borderRadius: 0, padding: '0 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, minWidth: 72, fontSize: '0.75rem', color: '#fca5a5', borderLeft: 'none', borderBottom: 'none', borderRight: 'none', borderTop: 'none' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                          <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                        Διαγρ.
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── EDIT MODAL ───────────────────────────────────────────── */}
      <Modal isOpen={!!modalItem} title="Επεξεργασία Εκκρεμότητας" onClose={() => setModalItem(null)} size="md" height="short">
        <form onSubmit={onSaveModal} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {modalErrors.length > 0 && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '0.85rem', color: '#fca5a5' }}>
              {modalErrors.map((e, i) => <div key={i}>• {e}</div>)}
            </div>
          )}

          <Field label="Πελάτης *">
            <input className="panel-input" placeholder="Ονοματεπώνυμο" value={modalCustomerName} onChange={e => setModalCustomerName(e.target.value)} autoFocus />
          </Field>

          <Field label="Τύπος">
            <select className="panel-input" value={modalPendingType} onChange={e => setModalPendingType(e.target.value)}>
              <option value="">— Επίλεξε τύπο —</option>
              {pendingTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>

          <Field label="Περιγραφή *">
            <input className="panel-input" placeholder="Τι αφορά..." value={modalDescription} onChange={e => setModalDescription(e.target.value)} />
          </Field>

          <Field label="Προθεσμία">
            <input className="panel-input" type="date" value={modalDueDate} onChange={e => setModalDueDate(e.target.value)} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field label="Κινητό">
              <input className="panel-input" placeholder="69..." value={modalMobile} onChange={e => setModalMobile(e.target.value)} />
            </Field>
            <Field label="Σταθερό">
              <input className="panel-input" placeholder="21..." value={modalLandline} onChange={e => setModalLandline(e.target.value)} />
            </Field>
          </div>

          <Field label="ΑΦΜ">
            <input className="panel-input" placeholder="9 ψηφία" value={modalAfm} onChange={e => setModalAfm(e.target.value)} />
          </Field>

          <Field label="Σημειώσεις">
            <textarea className="panel-input" placeholder="Επιπλέον πληροφορίες..." value={modalNotes} onChange={e => setModalNotes(e.target.value)} style={{ height: 72, resize: 'none' }} />
          </Field>

          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={() => setModalItem(null)}>Άκυρο</button>
            <button type="submit" className="btn">Αποθήκευση</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
