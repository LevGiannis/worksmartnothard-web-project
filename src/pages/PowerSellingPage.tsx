import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { formatNumber } from '../utils/formatNumber'
import { safeLocalStorageGet } from '../utils/safeLocalStorage'
import {
  loadPowerSellingItems, savePowerSellingItem, updatePowerSellingItem, deletePowerSellingItem, addPowerSellingComment,
  PowerSellingItem, PowerSellingLine, ConnectionType,
} from '../services/storage'
import { MOBILE_PLAN_PRESETS, HOME_TYPE_OPTIONS, PROVIDER_PRESETS } from '../constants'

type OfferType = 'mobile' | 'landline'
type Category = 'mobile' | 'landline' | 'both' | 'none'

const OFFER_TYPE_LABEL: Record<OfferType, string> = { mobile: 'Κινητό', landline: 'Σταθερό' }
const CONNECTION_TYPE_LABEL: Record<ConnectionType, string> = { new: 'Νέα Σύνδεση', portability: 'Φορητότητα' }
const CATEGORY_LABEL: Record<Category, string> = { mobile: 'Κινητό', landline: 'Σταθερό', both: 'Και τα δύο', none: '—' }
const LINE_LABEL: Record<OfferType, string> = { mobile: 'Κινητή Τηλεφωνία', landline: 'Σταθερή Τηλεφωνία & Internet' }
const LINE_ICON: Record<OfferType, string> = { mobile: '📱', landline: '☎️' }

function categoryOf(types: string[]): Category {
  const hasMobile = types.includes('mobile')
  const hasLandline = types.includes('landline')
  if (hasMobile && hasLandline) return 'both'
  if (hasMobile) return 'mobile'
  if (hasLandline) return 'landline'
  return 'none'
}

// annotates lines with a per-type ordinal (#1, #2, ...); showOrdinal is only true when a category has more than one line,
// so the common single-line-per-category case stays uncluttered.
function withOrdinals<T extends { type: OfferType }>(lines: T[]): (T & { ordinal: number; showOrdinal: boolean })[] {
  const counts: Record<OfferType, number> = { mobile: 0, landline: 0 }
  lines.forEach(l => { counts[l.type]++ })
  const seen: Record<OfferType, number> = { mobile: 0, landline: 0 }
  return lines.map(l => {
    seen[l.type]++
    return { ...l, ordinal: seen[l.type], showOrdinal: counts[l.type] > 1 }
  })
}
function lineTitle(l: { type: OfferType; ordinal: number; showOrdinal: boolean }) {
  return OFFER_TYPE_LABEL[l.type] + (l.showOrdinal ? ` #${l.ordinal}` : '')
}
function summarizeLines(lines: { type: OfferType }[]): string {
  const counts: Record<OfferType, number> = { mobile: 0, landline: 0 }
  lines.forEach(l => { counts[l.type]++ })
  const parts: string[] = []
  if (counts.mobile) parts.push(counts.mobile > 1 ? `${counts.mobile} × ${OFFER_TYPE_LABEL.mobile}` : OFFER_TYPE_LABEL.mobile)
  if (counts.landline) parts.push(counts.landline > 1 ? `${counts.landline} × ${OFFER_TYPE_LABEL.landline}` : OFFER_TYPE_LABEL.landline)
  return parts.join(' + ') || '—'
}

function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7 }}>
      {children}
    </div>
  )
}

function YesNoToggle({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <button type="button" onClick={() => onChange(true)} className={value === true ? 'btn' : 'btn-ghost'} style={{ flex: 1, padding: '12px 0', fontWeight: 700 }}>Ναι</button>
      <button type="button" onClick={() => onChange(false)} className={value === false ? 'btn' : 'btn-ghost'} style={{ flex: 1, padding: '12px 0', fontWeight: 700 }}>Όχι</button>
    </div>
  )
}

// ─── one editable offer line (mobile or landline) — a single line can appear more than once per category ──
type WizardLine = {
  id: string
  type: OfferType
  plan: string
  price: number | ''
  connectionType: ConnectionType | null
  previousProvider: string
  previousPrice: number | ''
}
function makeLine(type: OfferType): WizardLine {
  return { id: uuidv4(), type, plan: '', price: '', connectionType: null, previousProvider: '', previousPrice: '' }
}
function validateTypeFields(v: WizardLine): string {
  if (!v.plan.trim() || v.price === '') return 'πρόγραμμα και τιμή'
  if (v.connectionType === 'portability' && !v.previousProvider.trim()) return 'πάροχο προέλευσης (φορητότητα)'
  return ''
}
function lineToPayload(l: WizardLine): PowerSellingLine {
  return {
    id: l.id,
    type: l.type,
    plan: l.plan,
    price: l.price === '' ? undefined : Number(l.price),
    connectionType: l.connectionType || undefined,
    previousProvider: l.connectionType === 'portability' ? l.previousProvider : '',
    previousPrice: l.previousPrice === '' ? undefined : Number(l.previousPrice),
  }
}

function TypeFieldsEditor({ idPrefix, value, onChange, planOptions }: { idPrefix: string; value: WizardLine; onChange: (patch: Partial<WizardLine>) => void; planOptions: string[] }) {
  const planListId = `${idPrefix}-plans`
  const providerListId = `${idPrefix}-providers`
  return (
    <div>
      <StepLabel>Πρόγραμμα &amp; Τιμή</StepLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12, marginBottom: 14 }}>
        <input className="panel-input" list={planListId} placeholder="π.χ. RED 10GB ή επίλεξε" value={value.plan} onChange={e => onChange({ plan: e.target.value })} />
        <datalist id={planListId}>{planOptions.map(p => <option key={p} value={p} />)}</datalist>
        <input className="panel-input" type="number" step="0.01" min={0} placeholder="Τιμή €" value={value.price} onChange={e => onChange({ price: e.target.value === '' ? '' : parseFloat(e.target.value) })} />
      </div>
      <StepLabel>Σύνδεση <span style={{ fontWeight: 400, opacity: 0.6, textTransform: 'none' }}>(προαιρετικό)</span></StepLabel>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className={value.connectionType === 'new' ? 'btn' : 'btn-ghost'} onClick={() => onChange({ connectionType: value.connectionType === 'new' ? null : 'new' })} style={{ flex: 1, padding: '10px 0' }}>Νέα Σύνδεση</button>
        <button type="button" className={value.connectionType === 'portability' ? 'btn' : 'btn-ghost'} onClick={() => onChange({ connectionType: value.connectionType === 'portability' ? null : 'portability' })} style={{ flex: 1, padding: '10px 0' }}>Φορητότητα</button>
      </div>
      {value.connectionType === 'portability' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12, marginTop: 12 }}>
          <input className="panel-input" list={providerListId} placeholder="Από ποιον πάροχο * ή επίλεξε" value={value.previousProvider} onChange={e => onChange({ previousProvider: e.target.value })} />
          <datalist id={providerListId}>{PROVIDER_PRESETS.map(p => <option key={p} value={p} />)}</datalist>
          <input className="panel-input" type="number" step="0.01" min={0} placeholder="Πλήρωνε €" value={value.previousPrice} onChange={e => onChange({ previousPrice: e.target.value === '' ? '' : parseFloat(e.target.value) })} />
        </div>
      )}
    </div>
  )
}

function LineEditorCard({ idPrefix, line, title, onChange, onRemove }: { idPrefix: string; line: WizardLine; title: string; onChange: (patch: Partial<WizardLine>) => void; onRemove: () => void }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 18, background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {LINE_ICON[line.type]} {title}
        </div>
        <button type="button" onClick={onRemove} className="btn-ghost" style={{ padding: '4px 10px', fontSize: '0.76rem', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.2)' }}>🗑 Αφαίρεση</button>
      </div>
      <TypeFieldsEditor idPrefix={idPrefix} value={line} onChange={onChange} planOptions={line.type === 'mobile' ? MOBILE_PLAN_PRESETS : HOME_TYPE_OPTIONS} />
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)' }}>{label}</span>
      <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600, textAlign: 'right' }}>{value || '—'}</span>
    </div>
  )
}

function CategoryBadge({ category }: { category: Category }) {
  const colors: Record<Category, { bg: string; text: string }> = {
    mobile: { bg: 'rgba(59,130,246,0.16)', text: '#93c5fd' },
    landline: { bg: 'rgba(16,185,129,0.16)', text: '#6ee7b7' },
    both: { bg: 'rgba(236,72,153,0.16)', text: '#f9a8d4' },
    none: { bg: 'rgba(107,114,128,0.16)', text: '#d1d5db' },
  }
  const c = colors[category]
  return <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: '0.76rem', fontWeight: 700, background: c.bg, color: c.text, whiteSpace: 'nowrap' }}>{CATEGORY_LABEL[category]}</span>
}

function formatDate(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('el-GR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatDateTime(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleString('el-GR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ─── Vodafone brand tokens (from the public brand identity: Pantone 485 / #E60000 red,
// the 2017+ "speech mark" graphic device, extended accent palette, and the Greek
// "Μαζί μπορούμε" / "Together We Can" tagline) — Poppins stands in for the
// proprietary, Vodafone-exclusive "Vodafone Rg" typeface. ────────────────────────
const VF = {
  red: '#e60000',
  black: '#333333',
  grey: '#767676',
  yellow: '#fecb00',
  teal: '#00b0ca',
  lime: '#a8b400',
}

// ─── customer-facing printable offer: only what the customer needs to see, styled to stand out ──
function PrintableOffer({ item }: { item: PowerSellingItem }) {
  const sellerName = `${safeLocalStorageGet('ws_user_first') || ''} ${safeLocalStorageGet('ws_user_last') || ''}`.trim()
  const store = safeLocalStorageGet('ws_user_store') || ''

  const lines = withOrdinals(item.lines)
  const totalMonthly = lines.reduce((s, l) => s + (l.price || 0), 0)

  const monthlyGain = lines.reduce((s, l) => s + Math.max(0, (l.previousPrice || 0) - (l.price || 0)), 0)
  const giftValue = item.hasGiftDevices && typeof item.giftDevicesValue === 'number' ? item.giftDevicesValue : 0
  const yearlyGain = monthlyGain * 12 + giftValue
  const showGain = monthlyGain > 0 || giftValue > 0

  return (
    <div className="print-only-offer">
      <div style={{ fontFamily: "'Poppins', Arial, sans-serif", color: VF.black, background: '#fff' }}>

        {/* full-bleed Vodafone-red masthead, with the speech-mark as a soft outlined graphic device
            (2017+ identity: red field, white/outlined mark — not a literal copy of the logo artwork) */}
        <div style={{ position: 'relative', background: VF.red, padding: '22px 36px', overflow: 'hidden' }}>
          <div aria-hidden style={{
            position: 'absolute', right: -30, top: -60, width: 220, height: 220,
            borderRadius: '60% 40% 55% 45% / 45% 55% 40% 60%',
            border: '3px solid rgba(255,255,255,0.35)',
          }} />
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, flexShrink: 0, background: '#fff',
                borderRadius: '60% 40% 55% 45% / 45% 55% 40% 60%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 19, color: VF.red,
              }}>V</div>
              <div style={{ fontWeight: 900, fontSize: 22, color: '#fff', letterSpacing: 1.5 }}>VODAFONE</div>
            </div>
            {store && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.92)', fontWeight: 700, letterSpacing: 0.5 }}>{store}</div>}
          </div>
        </div>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '30px 36px 36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `3px solid ${VF.red}`, paddingBottom: 14, marginBottom: 26 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 2, color: VF.red, textTransform: 'uppercase' }}>Η προσφορά σου</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: '#111', marginTop: 4 }}>{item.customerName}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: VF.grey }}>{formatDate(item.createdAt)}</div>
          </div>

          {lines.map(l => (
            <div key={l.id} style={{ background: '#fff', border: '1px solid #ececec', borderLeft: `5px solid ${VF.red}`, borderRadius: 10, padding: 22, marginBottom: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: VF.grey, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{LINE_ICON[l.type]} {LINE_LABEL[l.type]}{l.showOrdinal ? ` #${l.ordinal}` : ''}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 900, textTransform: 'uppercase' }}>{l.plan}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: VF.red }}>{formatNumber(l.price || 0, 2)} €<span style={{ fontSize: 14, fontWeight: 600, color: VF.grey }}>/μήνα</span></div>
              </div>
              {l.connectionType && (
                <div style={{ fontSize: 13.5, color: '#555', marginTop: 8 }}>
                  {l.connectionType === 'portability' ? `Μεταφορά αριθμού από ${l.previousProvider || 'άλλον πάροχο'}` : 'Νέα σύνδεση'}
                </div>
              )}
              {typeof l.previousPrice === 'number' && l.previousPrice > (l.price || 0) && (
                <div style={{ marginTop: 12, background: '#f7f9e8', border: `1px solid ${VF.lime}66`, borderRadius: 10, padding: '10px 14px', fontSize: 14.5, color: '#5c6300', fontWeight: 800 }}>
                  💰 Εξοικονομείς {formatNumber(l.previousPrice - (l.price || 0), 2)} €/μήνα σε σχέση με πριν
                </div>
              )}
            </div>
          ))}

          {(item.hasGiftDevices || item.hasSubsidy) && (
            <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
              {item.hasGiftDevices && (
                <div style={{ flex: 1, background: '#fffcf0', border: `1px solid ${VF.yellow}88`, borderRadius: 10, padding: 18, textAlign: 'center' }}>
                  <div style={{ fontSize: 28 }}>🎁</div>
                  <div style={{ fontWeight: 800, fontSize: 15.5, marginTop: 6, color: '#8a6d00' }}>Δώρο {item.giftDevicesCount} πάγι{item.giftDevicesCount === 1 ? 'ο' : 'α'}</div>
                </div>
              )}
              {item.hasSubsidy && (
                <div style={{ flex: 1, background: '#f0fbfd', border: `1px solid ${VF.teal}66`, borderRadius: 10, padding: 18, textAlign: 'center' }}>
                  <div style={{ fontSize: 28 }}>💶</div>
                  <div style={{ fontWeight: 800, fontSize: 15.5, marginTop: 6, color: '#00707f' }}>Επιδότηση {formatNumber(item.subsidyAmount || 0, 2)} €</div>
                </div>
              )}
            </div>
          )}

          {lines.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: VF.red, color: '#fff', borderRadius: 10, padding: '18px 22px', marginTop: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Συνολικό μηνιαίο κόστος</div>
              <div style={{ fontSize: 26, fontWeight: 900 }}>{formatNumber(totalMonthly, 2)} €</div>
            </div>
          )}

          {showGain && (
            <div style={{ background: '#f7f9e8', border: `2px solid ${VF.lime}`, borderRadius: 12, padding: '20px 22px', marginTop: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#5c6300', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>💰 Πόσα κερδίζεις</div>
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#5c6300' }}>{formatNumber(monthlyGain, 2)} €</div>
                  <div style={{ fontSize: 12.5, color: '#5c6300', fontWeight: 700 }}>τον μήνα</div>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#5c6300' }}>{formatNumber(yearlyGain, 2)} €</div>
                  <div style={{ fontSize: 12.5, color: '#5c6300', fontWeight: 700 }}>τον χρόνο{giftValue > 0 ? ' (με το δώρο)' : ''}</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 36, paddingTop: 16, borderTop: '2px solid #f2f2f2', fontSize: 12, color: VF.grey }}>
            {sellerName && `Ο σύμβουλός σου: ${sellerName}`}{store && ` · ${store}`}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, fontWeight: 800, color: VF.red, letterSpacing: 0.5 }}>Μαζί μπορούμε.</div>
        </div>
      </div>
    </div>
  )
}

export default function PowerSellingPage() {
  const navigate = useNavigate()

  // ── wizard state ──────────────────────────────────────────────
  const [step, setStep] = useState(0)
  const [customerName, setCustomerName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [afm, setAfm] = useState('')
  const [lines, setLines] = useState<WizardLine[]>([])
  const [hasGiftDevices, setHasGiftDevices] = useState<boolean | null>(null)
  const [giftDevicesCount, setGiftDevicesCount] = useState<number | ''>('')
  const [giftDevicesValue, setGiftDevicesValue] = useState<number | ''>('')
  const [hasSubsidy, setHasSubsidy] = useState<boolean | null>(null)
  const [subsidyAmount, setSubsidyAmount] = useState<number | ''>('')
  const [notes, setNotes] = useState('')

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  // ── list / management state ───────────────────────────────────
  const [items, setItems] = useState<PowerSellingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<Category | ''>('')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  // ── edit modal state ──────────────────────────────────────────
  const [editItem, setEditItem] = useState<PowerSellingItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAfm, setEditAfm] = useState('')
  const [editLines, setEditLines] = useState<WizardLine[]>([])
  const [editHasGift, setEditHasGift] = useState<boolean | null>(null)
  const [editGiftCount, setEditGiftCount] = useState<number | ''>('')
  const [editGiftValue, setEditGiftValue] = useState<number | ''>('')
  const [editHasSubsidy, setEditHasSubsidy] = useState<boolean | null>(null)
  const [editSubsidyAmount, setEditSubsidyAmount] = useState<number | ''>('')
  const [editErrors, setEditErrors] = useState<string[]>([])
  const [editSaving, setEditSaving] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [commentSaving, setCommentSaving] = useState(false)
  const [deleteConfirming, setDeleteConfirming] = useState(false)

  // ── print ────────────────────────────────────────────────────
  const [printItem, setPrintItem] = useState<PowerSellingItem | null>(null)

  const reload = () => { setLoading(true); loadPowerSellingItems().then(all => { setItems(all); setLoading(false) }) }
  useEffect(() => { reload() }, [])

  useEffect(() => {
    if (!printItem) return
    const t = setTimeout(() => window.print(), 50)
    return () => clearTimeout(t)
  }, [printItem])

  useEffect(() => {
    const onAfterPrint = () => setPrintItem(null)
    window.addEventListener('afterprint', onAfterPrint)
    return () => window.removeEventListener('afterprint', onAfterPrint)
  }, [])

  const addLine = (type: OfferType) => setLines(prev => [...prev, makeLine(type)])
  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id))
  const updateLine = (id: string, patch: Partial<WizardLine>) => setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))

  const steps = [
    { key: 'name', title: 'Πελάτης' },
    { key: 'lines', title: 'Γραμμές' },
    { key: 'gift', title: 'Πάγια δώρο' },
    { key: 'subsidy', title: 'Επιδότηση' },
    { key: 'review', title: 'Επιβεβαίωση' },
  ]

  function validateStep(idx: number): string {
    if (idx === 0) {
      if (!customerName.trim()) return 'Συμπλήρωσε το ονοματεπώνυμο του πελάτη.'
      if (!contactPhone.trim()) return 'Συμπλήρωσε τηλέφωνο επικοινωνίας.'
    }
    if (idx === 1) {
      if (lines.length === 0) return 'Πρόσθεσε τουλάχιστον μία γραμμή προσφοράς.'
      for (const l of withOrdinals(lines)) {
        const missing = validateTypeFields(l)
        if (missing) return `Συμπλήρωσε ${missing} για ${lineTitle(l)}.`
      }
    }
    if (idx === 2) {
      if (hasGiftDevices === null) return 'Επίλεξε αν δόθηκε πάγια δώρο.'
      if (hasGiftDevices && (giftDevicesCount === '' || Number(giftDevicesCount) <= 0)) return 'Συμπλήρωσε πόσα πάγια δόθηκαν δώρο.'
    }
    if (idx === 3) {
      if (hasSubsidy === null) return 'Επίλεξε αν υπήρχε επιδότηση.'
      if (hasSubsidy && (subsidyAmount === '' || Number(subsidyAmount) <= 0)) return 'Συμπλήρωσε το ποσό της επιδότησης.'
    }
    return ''
  }

  const goNext = () => {
    const err = validateStep(step)
    if (err) { setError(err); return }
    setError('')
    setStep(s => Math.min(s + 1, steps.length - 1))
  }
  const goBack = () => { setError(''); setStep(s => Math.max(s - 1, 0)) }

  const resetForm = () => {
    setStep(0)
    setCustomerName(''); setContactPhone(''); setAfm('')
    setLines([])
    setHasGiftDevices(null); setGiftDevicesCount(''); setGiftDevicesValue('')
    setHasSubsidy(null); setSubsidyAmount('')
    setNotes('')
    setError('')
  }

  const submit = async () => {
    for (let i = 0; i < steps.length - 1; i++) {
      const err = validateStep(i)
      if (err) { setStep(i); setError(err); return }
    }
    setSaving(true)
    try {
      const saved = await savePowerSellingItem({
        customerName, contactPhone, afm,
        lines: lines.map(lineToPayload),
        hasGiftDevices: !!hasGiftDevices,
        giftDevicesCount: hasGiftDevices && giftDevicesCount !== '' ? Number(giftDevicesCount) : undefined,
        giftDevicesValue: hasGiftDevices && giftDevicesValue !== '' ? Number(giftDevicesValue) : undefined,
        hasSubsidy: !!hasSubsidy,
        subsidyAmount: hasSubsidy && subsidyAmount !== '' ? Number(subsidyAmount) : undefined,
      })
      if (notes.trim()) await addPowerSellingComment(saved.id, notes.trim())
      setToast('Η φόρμα πώλησης αποθηκεύτηκε')
      reload()
      resetForm()
      setTimeout(() => setToast(''), 2500)
    } catch (e) {
      console.error(e)
      setError('Σφάλμα αποθήκευσης')
    } finally {
      setSaving(false)
    }
  }

  // ── management: filtering + sorting ─────────────────────────────
  const visible = useMemo(() => {
    let out = items.map(it => ({ it, category: categoryOf(it.lines.map(l => l.type)) }))
    if (filterCategory) out = out.filter(x => x.category === filterCategory)
    if (search) {
      const q = search.toLowerCase()
      out = out.filter(({ it }) => `${it.customerName} ${it.contactPhone} ${it.afm}`.toLowerCase().includes(q))
    }
    out = out.sort((a, b) => {
      const cmp = (a.it.createdAt || '').localeCompare(b.it.createdAt || '')
      return sortDir === 'desc' ? -cmp : cmp
    })
    return out
  }, [items, search, filterCategory, sortDir])

  const categoryCounts = useMemo(() => {
    const counts: Record<Category, number> = { mobile: 0, landline: 0, both: 0, none: 0 }
    items.forEach(it => { counts[categoryOf(it.lines.map(l => l.type))]++ })
    return counts
  }, [items])

  // ── edit modal ───────────────────────────────────────────────
  function openEdit(it: PowerSellingItem) {
    setEditItem(it)
    setEditName(it.customerName || '')
    setEditPhone(it.contactPhone || '')
    setEditAfm(it.afm || '')
    setEditLines(it.lines.map(l => ({
      id: l.id || uuidv4(),
      type: l.type,
      plan: l.plan || '',
      price: typeof l.price === 'number' ? l.price : '',
      connectionType: l.connectionType || null,
      previousProvider: l.previousProvider || '',
      previousPrice: typeof l.previousPrice === 'number' ? l.previousPrice : '',
    })))
    setEditHasGift(!!it.hasGiftDevices)
    setEditGiftCount(typeof it.giftDevicesCount === 'number' ? it.giftDevicesCount : '')
    setEditGiftValue(typeof it.giftDevicesValue === 'number' ? it.giftDevicesValue : '')
    setEditHasSubsidy(!!it.hasSubsidy)
    setEditSubsidyAmount(typeof it.subsidyAmount === 'number' ? it.subsidyAmount : '')
    setEditErrors([])
    setNewComment('')
  }

  const addEditLine = (type: OfferType) => setEditLines(prev => [...prev, makeLine(type)])
  const removeEditLine = (id: string) => setEditLines(prev => prev.filter(l => l.id !== id))
  const updateEditLine = (id: string, patch: Partial<WizardLine>) => setEditLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))

  async function saveEdit() {
    if (!editItem) return
    const errs: string[] = []
    if (!editName.trim()) errs.push('Απαιτείται ονοματεπώνυμο πελάτη.')
    if (!editPhone.trim()) errs.push('Απαιτείται τηλέφωνο επικοινωνίας.')
    if (editLines.length === 0) errs.push('Πρόσθεσε τουλάχιστον μία γραμμή προσφοράς.')
    for (const l of withOrdinals(editLines)) {
      const missing = validateTypeFields(l)
      if (missing) errs.push(`Συμπλήρωσε ${missing} για ${lineTitle(l)}.`)
    }
    if (editHasGift && (editGiftCount === '' || Number(editGiftCount) <= 0)) errs.push('Συμπλήρωσε πόσα πάγια δόθηκαν δώρο.')
    if (editHasSubsidy && (editSubsidyAmount === '' || Number(editSubsidyAmount) <= 0)) errs.push('Συμπλήρωσε το ποσό της επιδότησης.')
    if (errs.length) { setEditErrors(errs); return }

    setEditSaving(true)
    try {
      const updated = await updatePowerSellingItem(editItem.id, {
        customerName: editName, contactPhone: editPhone, afm: editAfm,
        lines: editLines.map(lineToPayload),
        hasGiftDevices: !!editHasGift,
        giftDevicesCount: editHasGift && editGiftCount !== '' ? Number(editGiftCount) : undefined,
        giftDevicesValue: editHasGift && editGiftValue !== '' ? Number(editGiftValue) : undefined,
        hasSubsidy: !!editHasSubsidy,
        subsidyAmount: editHasSubsidy && editSubsidyAmount !== '' ? Number(editSubsidyAmount) : undefined,
      })
      if (updated) {
        setItems(prev => prev.map(p => p.id === updated.id ? updated : p))
        setEditItem(updated)
      }
      setToast('Οι αλλαγές αποθηκεύτηκαν')
      setTimeout(() => setToast(''), 2000)
    } finally {
      setEditSaving(false)
    }
  }

  async function submitComment() {
    if (!editItem || !newComment.trim()) return
    setCommentSaving(true)
    try {
      const updated = await addPowerSellingComment(editItem.id, newComment.trim())
      if (updated) {
        setItems(prev => prev.map(p => p.id === updated.id ? updated : p))
        setEditItem(updated)
      }
      setNewComment('')
    } finally {
      setCommentSaving(false)
    }
  }

  async function onDeleteEditItem() {
    if (!editItem) return
    setDeleteConfirming(true)
    const ok = await deletePowerSellingItem(editItem.id)
    setDeleteConfirming(false)
    if (ok) {
      setItems(prev => prev.filter(p => p.id !== editItem.id))
      setEditItem(null)
    }
  }

  const pct = Math.round(((step + 1) / steps.length) * 100)

  return (
    <div className="page-content">
      <PageHeader
        title="Power Selling"
        subtitle="Καταχώρησε τις προσφορές που έδωσες σε πελάτες — απάντησε βήμα βήμα"
        breadcrumb="Power Selling"
      />
      <div className="page-inner">

        {/* ── Wizard ── */}
        <div className="panel-card" style={{ padding: 28, maxWidth: 760, margin: '0 auto 28px' }}>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              {steps.map((s, i) => (
                <div key={s.key} style={{ fontSize: '0.72rem', fontWeight: i === step ? 700 : 500, color: i === step ? '#c4b5fd' : i < step ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)', flex: 1, textAlign: i === 0 ? 'left' : i === steps.length - 1 ? 'right' : 'center' }}>
                  {s.title}
                </div>
              ))}
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#7c3aed,#ff6b8a)', borderRadius: 999, transition: 'width 300ms ease' }} />
            </div>
          </div>

          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <StepLabel>Ονοματεπώνυμο πελάτη</StepLabel>
                <input className="panel-input" placeholder="π.χ. Γεώργιος Παπαδόπουλος" value={customerName} onChange={e => setCustomerName(e.target.value)} style={{ width: '100%', fontSize: '1.05rem', padding: '14px 16px' }} autoFocus />
              </div>
              <div>
                <StepLabel>Τηλέφωνο επικοινωνίας</StepLabel>
                <input className="panel-input" placeholder="69xxxxxxxx" value={contactPhone} onChange={e => setContactPhone(e.target.value)} style={{ width: '100%', fontSize: '1.05rem', padding: '14px 16px' }} />
              </div>
              <div>
                <StepLabel>ΑΦΜ <span style={{ fontWeight: 400, opacity: 0.6, textTransform: 'none' }}>(προαιρετικό)</span></StepLabel>
                <input className="panel-input" placeholder="π.χ. 123456789" value={afm} onChange={e => setAfm(e.target.value)} style={{ width: '100%', fontSize: '1.05rem', padding: '14px 16px' }} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <StepLabel>Γραμμές προσφοράς</StepLabel>
              <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                <button type="button" className="btn-ghost" onClick={() => addLine('mobile')} style={{ flex: 1, padding: '12px 0', fontWeight: 700 }}>+ Κινητό</button>
                <button type="button" className="btn-ghost" onClick={() => addLine('landline')} style={{ flex: 1, padding: '12px 0', fontWeight: 700 }}>+ Σταθερό</button>
              </div>
              {lines.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '20px 0' }}>
                  Πρόσθεσε τουλάχιστον μία γραμμή — μπορείς να προσθέσεις όσες θέλεις, ακόμα και παραπάνω από μία στην ίδια κατηγορία.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {withOrdinals(lines).map(l => (
                    <LineEditorCard
                      key={l.id}
                      idPrefix={`wizard-${l.id}`}
                      line={l}
                      title={lineTitle(l)}
                      onChange={patch => updateLine(l.id, patch)}
                      onRemove={() => removeLine(l.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <StepLabel>Δόθηκε πάγια δώρο;</StepLabel>
              <YesNoToggle value={hasGiftDevices} onChange={v => { setHasGiftDevices(v); if (!v) { setGiftDevicesCount(''); setGiftDevicesValue('') } }} />
              {hasGiftDevices && (
                <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
                  <div>
                    <StepLabel>Πόσα πάγια;</StepLabel>
                    <input className="panel-input" type="number" min={1} step={1} placeholder="π.χ. 1" value={giftDevicesCount} onChange={e => setGiftDevicesCount(e.target.value === '' ? '' : parseInt(e.target.value, 10))} style={{ width: 160 }} autoFocus />
                  </div>
                  <div>
                    <StepLabel>Αξία δώρου (€) <span style={{ fontWeight: 400, opacity: 0.6, textTransform: 'none' }}>(προαιρετικό)</span></StepLabel>
                    <input className="panel-input" type="number" min={0} step="0.01" placeholder="π.χ. 150" value={giftDevicesValue} onChange={e => setGiftDevicesValue(e.target.value === '' ? '' : parseFloat(e.target.value))} style={{ width: 160 }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <StepLabel>Υπήρχε επιδότηση;</StepLabel>
              <YesNoToggle value={hasSubsidy} onChange={v => { setHasSubsidy(v); if (!v) setSubsidyAmount('') }} />
              {hasSubsidy && (
                <div style={{ marginTop: 16 }}>
                  <StepLabel>Ποσό επιδότησης (€)</StepLabel>
                  <input className="panel-input" type="number" min={0} step="0.01" placeholder="π.χ. 50" value={subsidyAmount} onChange={e => setSubsidyAmount(e.target.value === '' ? '' : parseFloat(e.target.value))} style={{ width: 160 }} autoFocus />
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <StepLabel>Σύνοψη</StepLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 18, marginBottom: 16 }}>
                <SummaryRow label="Πελάτης" value={customerName} />
                <SummaryRow label="Τηλέφωνο" value={contactPhone} />
                {afm && <SummaryRow label="ΑΦΜ" value={afm} />}
                <SummaryRow label="Αφορούσε" value={summarizeLines(lines)} />
                {withOrdinals(lines).map(l => (
                  <React.Fragment key={l.id}>
                    <SummaryRow label={lineTitle(l)} value={`${l.plan} — ${formatNumber(Number(l.price) || 0, 2)} €`} />
                    {l.connectionType && <SummaryRow label={`${lineTitle(l)} — Σύνδεση`} value={`${CONNECTION_TYPE_LABEL[l.connectionType]}${l.connectionType === 'portability' ? ` από ${l.previousProvider || '—'}` : ''}`} />}
                    {l.previousPrice !== '' && <SummaryRow label={`${lineTitle(l)} — Πλήρωνε`} value={`${formatNumber(Number(l.previousPrice) || 0, 2)} €`} />}
                  </React.Fragment>
                ))}
                <SummaryRow label="Πάγια δώρο" value={hasGiftDevices ? `Ναι — ${giftDevicesCount}${giftDevicesValue !== '' ? ` (αξίας ${formatNumber(Number(giftDevicesValue) || 0, 2)} €)` : ''}` : 'Όχι'} />
                <SummaryRow label="Επιδότηση" value={hasSubsidy ? `Ναι — ${formatNumber(Number(subsidyAmount) || 0, 2)} €` : 'Όχι'} />
              </div>
              <StepLabel>Σχόλιο <span style={{ fontWeight: 400, opacity: 0.6, textTransform: 'none' }}>(προαιρετικό)</span></StepLabel>
              <textarea className="panel-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
            </div>
          )}

          {error && (
            <div role="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginTop: 18 }}>
              <span style={{ color: '#fca5a5', fontSize: '0.85rem' }}>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 26, alignItems: 'center' }}>
            {step > 0 ? (
              <button type="button" className="btn-ghost" onClick={goBack} style={{ padding: '10px 18px' }}>Πίσω</button>
            ) : (
              <button type="button" className="btn-ghost" onClick={() => navigate(-1)} style={{ padding: '10px 18px' }}>Ακύρωση</button>
            )}
            <div style={{ flex: 1 }} />
            {step < steps.length - 1 ? (
              <button type="button" className="btn" onClick={goNext} style={{ minWidth: 140, padding: '10px 20px', fontWeight: 700 }}>Επόμενο</button>
            ) : (
              <button type="button" className="btn" onClick={submit} disabled={saving} style={{ minWidth: 160, padding: '10px 20px', fontWeight: 700 }}>
                {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
              </button>
            )}
          </div>
        </div>

        {/* ── Management: browse / filter / edit / delete ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Καταχωρημένες φόρμες</span>
            <span style={{ padding: '2px 10px', borderRadius: 999, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', fontSize: '0.82rem', color: '#c4b5fd', fontWeight: 700 }}>
              {visible.length}
            </span>
          </div>

          {/* search + filter + sort bar */}
          <div className="panel-card" style={{ padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5, flexShrink: 0 }} aria-hidden>
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" /><path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input className="panel-input" placeholder="Αναζήτηση πελάτη, τηλεφώνου, ΑΦΜ..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, fontSize: '0.95rem' }} />
              <button type="button" className="btn-ghost" onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')} style={{ padding: '5px 12px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                {sortDir === 'desc' ? 'Νεότερα πρώτα ↓' : 'Παλαιότερα πρώτα ↑'}
              </button>
              {(search || filterCategory) && (
                <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: '0.8rem' }} onClick={() => { setSearch(''); setFilterCategory('') }}>Καθαρισμός</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['mobile', 'landline', 'both'] as Category[]).map(cat => {
                const active = filterCategory === cat
                return (
                  <button key={cat} type="button" onClick={() => setFilterCategory(active ? '' : cat)}
                    style={{ padding: '4px 11px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: `1px solid ${active ? '#7c3aed' : 'rgba(255,255,255,0.08)'}`, background: active ? 'rgba(124,58,237,0.18)' : 'transparent', color: active ? '#c4b5fd' : 'rgba(255,255,255,0.6)', transition: 'all 150ms ease' }}>
                    {CATEGORY_LABEL[cat]} ({categoryCounts[cat]})
                  </button>
                )
              })}
            </div>
          </div>

          {loading ? (
            <div className="panel-card muted" style={{ textAlign: 'center', padding: 40 }}>Φόρτωση...</div>
          ) : visible.length === 0 ? (
            <div className="panel-card" style={{ textAlign: 'center', padding: '52px 24px' }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>⚡</div>
              <div style={{ fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                {search || filterCategory ? 'Δεν βρέθηκαν αποτελέσματα' : 'Δεν υπάρχουν καταχωρήσεις'}
              </div>
              <div className="muted" style={{ fontSize: '0.9rem' }}>
                {search || filterCategory ? 'Δοκίμασε διαφορετική αναζήτηση ή φίλτρο.' : 'Συμπλήρωσε την πρώτη φόρμα πώλησης από πάνω.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {visible.map(({ it, category }) => (
                <div key={it.id} className="panel-card" style={{ padding: 18, cursor: 'pointer' }} onClick={() => openEdit(it)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{it.customerName || '—'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        title="Εκτύπωση προσφοράς"
                        aria-label={`Εκτύπωση προσφοράς για ${it.customerName || ''}`}
                        onClick={e => { e.stopPropagation(); setPrintItem(it) }}
                        style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.78rem', lineHeight: 1 }}
                      >🖨️</button>
                      <CategoryBadge category={category} />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{formatDate(it.createdAt)}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                    {it.contactPhone && <div>📞 {it.contactPhone}</div>}
                    {withOrdinals(it.lines).map(l => (
                      <div key={l.id}>
                        {LINE_ICON[l.type]} {l.showOrdinal ? `${lineTitle(l)}: ` : ''}{l.plan} — {formatNumber(l.price || 0, 2)} €{l.connectionType ? ` · ${CONNECTION_TYPE_LABEL[l.connectionType]}` : ''}
                      </div>
                    ))}
                    {it.hasGiftDevices && <div>🎁 Πάγια δώρο × {it.giftDevicesCount}{typeof it.giftDevicesValue === 'number' ? ` (${formatNumber(it.giftDevicesValue, 2)} €)` : ''}</div>}
                    {it.hasSubsidy && <div>💶 Επιδότηση {formatNumber(it.subsidyAmount || 0, 2)} €</div>}
                  </div>
                  {it.comments.length > 0 && (
                    <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#c4b5fd' }}>💬 {it.comments.length} σχόλιο{it.comments.length > 1 ? 'α' : ''}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Edit / view modal ── */}
      <Modal isOpen={!!editItem} title={`Φόρμα — ${editItem?.customerName || ''}`} onClose={() => setEditItem(null)} size="md" height="short">
        {editItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {editErrors.length > 0 && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '0.85rem', color: '#fca5a5' }}>
                {editErrors.map((e, i) => <div key={i}>• {e}</div>)}
              </div>
            )}

            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>Καταχωρήθηκε: {formatDateTime(editItem.createdAt)}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <StepLabel>Ονοματεπώνυμο</StepLabel>
                <input className="panel-input" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <StepLabel>Τηλέφωνο</StepLabel>
                <input className="panel-input" value={editPhone} onChange={e => setEditPhone(e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <StepLabel>ΑΦΜ <span style={{ fontWeight: 400, opacity: 0.6, textTransform: 'none' }}>(προαιρετικό)</span></StepLabel>
              <input className="panel-input" value={editAfm} onChange={e => setEditAfm(e.target.value)} style={{ width: '100%' }} />
            </div>

            <div>
              <StepLabel>Γραμμές προσφοράς</StepLabel>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <button type="button" className="btn-ghost" onClick={() => addEditLine('mobile')} style={{ flex: 1, padding: '8px 0', fontWeight: 700 }}>+ Κινητό</button>
                <button type="button" className="btn-ghost" onClick={() => addEditLine('landline')} style={{ flex: 1, padding: '8px 0', fontWeight: 700 }}>+ Σταθερό</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {withOrdinals(editLines).map(l => (
                  <LineEditorCard
                    key={l.id}
                    idPrefix={`edit-${l.id}`}
                    line={l}
                    title={lineTitle(l)}
                    onChange={patch => updateEditLine(l.id, patch)}
                    onRemove={() => removeEditLine(l.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <StepLabel>Πάγια δώρο</StepLabel>
              <YesNoToggle value={editHasGift} onChange={v => { setEditHasGift(v); if (!v) { setEditGiftCount(''); setEditGiftValue('') } }} />
              {editHasGift && (
                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <input className="panel-input" type="number" min={1} step={1} placeholder="Πόσα;" value={editGiftCount} onChange={e => setEditGiftCount(e.target.value === '' ? '' : parseInt(e.target.value, 10))} style={{ width: 160 }} />
                  <input className="panel-input" type="number" min={0} step="0.01" placeholder="Αξία δώρου €" value={editGiftValue} onChange={e => setEditGiftValue(e.target.value === '' ? '' : parseFloat(e.target.value))} style={{ width: 160 }} />
                </div>
              )}
            </div>

            <div>
              <StepLabel>Επιδότηση</StepLabel>
              <YesNoToggle value={editHasSubsidy} onChange={v => { setEditHasSubsidy(v); if (!v) setEditSubsidyAmount('') }} />
              {editHasSubsidy && (
                <input className="panel-input" type="number" min={0} step="0.01" placeholder="Ποσό €" value={editSubsidyAmount} onChange={e => setEditSubsidyAmount(e.target.value === '' ? '' : parseFloat(e.target.value))} style={{ width: 160, marginTop: 10 }} />
              )}
            </div>

            <button className="btn-ghost" onClick={() => editItem && setPrintItem(editItem)} style={{ padding: '10px 0', fontWeight: 700 }}>
              🖨️ Εκτύπωση προσφοράς για τον πελάτη
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" disabled={editSaving} onClick={saveEdit} style={{ flex: 1, padding: '10px 0', fontWeight: 700 }}>
                {editSaving ? 'Αποθήκευση...' : 'Αποθήκευση αλλαγών'}
              </button>
              <button className="btn-ghost" disabled={deleteConfirming} onClick={onDeleteEditItem} style={{ padding: '10px 16px', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.25)' }}>
                {deleteConfirming ? 'Διαγραφή...' : 'Διαγραφή'}
              </button>
            </div>

            {/* comments */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14, marginTop: 4 }}>
              <StepLabel>Σχόλια ({editItem.comments.length})</StepLabel>
              {editItem.comments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxHeight: 180, overflowY: 'auto' }}>
                  {editItem.comments.map(c => (
                    <div key={c.id} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.text}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{formatDateTime(c.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="panel-input" placeholder="Πρόσθεσε σχόλιο..." value={newComment} onChange={e => setNewComment(e.target.value)} style={{ flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') submitComment() }} />
                <button className="btn" disabled={commentSaving || !newComment.trim()} onClick={submitComment} style={{ padding: '8px 16px' }}>Προσθήκη</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {toast && (
        <div className="toast fixed top-6 right-6" style={{ background: 'linear-gradient(90deg,#10b981,#059669)', color: '#fff', padding: '12px 18px', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.4)', zIndex: 300, fontSize: '0.9rem', fontWeight: 600 }} role="status">
          {toast}
        </div>
      )}

      {printItem && <PrintableOffer item={printItem} />}
    </div>
  )
}
