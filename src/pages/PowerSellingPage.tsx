import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { formatNumber } from '../utils/formatNumber'
import {
  loadPowerSellingItems, savePowerSellingItem, updatePowerSellingItem, deletePowerSellingItem, addPowerSellingComment,
  PowerSellingItem, ConnectionType,
} from '../services/storage'
import { MOBILE_PLAN_PRESETS, HOME_TYPE_OPTIONS, PROVIDER_PRESETS } from '../constants'

type OfferType = 'mobile' | 'landline'
type Category = 'mobile' | 'landline' | 'both' | 'none'

const OFFER_TYPE_LABEL: Record<OfferType, string> = { mobile: 'Κινητό', landline: 'Σταθερό' }
const CONNECTION_TYPE_LABEL: Record<ConnectionType, string> = { new: 'Νέα Σύνδεση', portability: 'Φορητότητα' }
const CATEGORY_LABEL: Record<Category, string> = { mobile: 'Κινητό', landline: 'Σταθερό', both: 'Και τα δύο', none: '—' }

function categoryOf(offerTypes: string[]): Category {
  const hasMobile = offerTypes.includes('mobile')
  const hasLandline = offerTypes.includes('landline')
  if (hasMobile && hasLandline) return 'both'
  if (hasMobile) return 'mobile'
  if (hasLandline) return 'landline'
  return 'none'
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

// ─── shared per-line (mobile/landline) fields — used both in the wizard and the edit modal ──
type TypeFieldsValue = {
  plan: string
  price: number | ''
  connectionType: ConnectionType | null
  previousProvider: string
  previousPrice: number | ''
}
const emptyTypeFields: TypeFieldsValue = { plan: '', price: '', connectionType: null, previousProvider: '', previousPrice: '' }

function TypeFieldsEditor({ idPrefix, label, value, onChange, planOptions }: { idPrefix: string; label: string; value: TypeFieldsValue; onChange: (v: TypeFieldsValue) => void; planOptions: string[] }) {
  const planListId = `${idPrefix}-plans`
  const providerListId = `${idPrefix}-providers`
  return (
    <div>
      <StepLabel>{label} — Πρόγραμμα &amp; Τιμή</StepLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12, marginBottom: 14 }}>
        <input className="panel-input" list={planListId} placeholder="π.χ. RED 10GB ή επίλεξε" value={value.plan} onChange={e => onChange({ ...value, plan: e.target.value })} />
        <datalist id={planListId}>{planOptions.map(p => <option key={p} value={p} />)}</datalist>
        <input className="panel-input" type="number" step="0.01" min={0} placeholder="Τιμή €" value={value.price} onChange={e => onChange({ ...value, price: e.target.value === '' ? '' : parseFloat(e.target.value) })} />
      </div>
      <StepLabel>{label} — Σύνδεση <span style={{ fontWeight: 400, opacity: 0.6, textTransform: 'none' }}>(προαιρετικό)</span></StepLabel>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className={value.connectionType === 'new' ? 'btn' : 'btn-ghost'} onClick={() => onChange({ ...value, connectionType: value.connectionType === 'new' ? null : 'new' })} style={{ flex: 1, padding: '10px 0' }}>Νέα Σύνδεση</button>
        <button type="button" className={value.connectionType === 'portability' ? 'btn' : 'btn-ghost'} onClick={() => onChange({ ...value, connectionType: value.connectionType === 'portability' ? null : 'portability' })} style={{ flex: 1, padding: '10px 0' }}>Φορητότητα</button>
      </div>
      {value.connectionType === 'portability' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12, marginTop: 12 }}>
          <input className="panel-input" list={providerListId} placeholder="Από ποιον πάροχο * ή επίλεξε" value={value.previousProvider} onChange={e => onChange({ ...value, previousProvider: e.target.value })} />
          <datalist id={providerListId}>{PROVIDER_PRESETS.map(p => <option key={p} value={p} />)}</datalist>
          <input className="panel-input" type="number" step="0.01" min={0} placeholder="Πλήρωνε €" value={value.previousPrice} onChange={e => onChange({ ...value, previousPrice: e.target.value === '' ? '' : parseFloat(e.target.value) })} />
        </div>
      )}
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

export default function PowerSellingPage() {
  const navigate = useNavigate()

  // ── wizard state ──────────────────────────────────────────────
  const [step, setStep] = useState(0)
  const [customerName, setCustomerName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [afm, setAfm] = useState('')
  const [offerTypes, setOfferTypes] = useState<OfferType[]>([])
  const [mobile, setMobile] = useState<TypeFieldsValue>(emptyTypeFields)
  const [landline, setLandline] = useState<TypeFieldsValue>(emptyTypeFields)
  const [hasGiftDevices, setHasGiftDevices] = useState<boolean | null>(null)
  const [giftDevicesCount, setGiftDevicesCount] = useState<number | ''>('')
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
  const [editOfferTypes, setEditOfferTypes] = useState<OfferType[]>([])
  const [editMobile, setEditMobile] = useState<TypeFieldsValue>(emptyTypeFields)
  const [editLandline, setEditLandline] = useState<TypeFieldsValue>(emptyTypeFields)
  const [editHasGift, setEditHasGift] = useState<boolean | null>(null)
  const [editGiftCount, setEditGiftCount] = useState<number | ''>('')
  const [editHasSubsidy, setEditHasSubsidy] = useState<boolean | null>(null)
  const [editSubsidyAmount, setEditSubsidyAmount] = useState<number | ''>('')
  const [editErrors, setEditErrors] = useState<string[]>([])
  const [editSaving, setEditSaving] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [commentSaving, setCommentSaving] = useState(false)
  const [deleteConfirming, setDeleteConfirming] = useState(false)

  const reload = () => { setLoading(true); loadPowerSellingItems().then(all => { setItems(all); setLoading(false) }) }
  useEffect(() => { reload() }, [])

  const toggleOfferType = (t: OfferType) => setOfferTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const steps = [
    { key: 'name', title: 'Πελάτης' },
    { key: 'offer', title: 'Προσφορά' },
    { key: 'plans', title: 'Προγράμματα' },
    { key: 'gift', title: 'Πάγια δώρο' },
    { key: 'subsidy', title: 'Επιδότηση' },
    { key: 'review', title: 'Επιβεβαίωση' },
  ]

  function validateTypeFields(v: TypeFieldsValue): string {
    if (!v.plan.trim() || v.price === '') return 'πρόγραμμα και τιμή'
    if (v.connectionType === 'portability' && !v.previousProvider.trim()) return 'πάροχο προέλευσης (φορητότητα)'
    return ''
  }

  function validateStep(idx: number): string {
    if (idx === 0) {
      if (!customerName.trim()) return 'Συμπλήρωσε το ονοματεπώνυμο του πελάτη.'
      if (!contactPhone.trim()) return 'Συμπλήρωσε τηλέφωνο επικοινωνίας.'
    }
    if (idx === 1) {
      if (offerTypes.length === 0) return 'Επίλεξε τι αφορούσε η προσφορά.'
    }
    if (idx === 2) {
      if (offerTypes.includes('mobile')) {
        const missing = validateTypeFields(mobile)
        if (missing) return `Συμπλήρωσε ${missing} για το κινητό.`
      }
      if (offerTypes.includes('landline')) {
        const missing = validateTypeFields(landline)
        if (missing) return `Συμπλήρωσε ${missing} για το σταθερό.`
      }
    }
    if (idx === 3) {
      if (hasGiftDevices === null) return 'Επίλεξε αν δόθηκε πάγια δώρο.'
      if (hasGiftDevices && (giftDevicesCount === '' || Number(giftDevicesCount) <= 0)) return 'Συμπλήρωσε πόσα πάγια δόθηκαν δώρο.'
    }
    if (idx === 4) {
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
    setOfferTypes([])
    setMobile(emptyTypeFields); setLandline(emptyTypeFields)
    setHasGiftDevices(null); setGiftDevicesCount('')
    setHasSubsidy(null); setSubsidyAmount('')
    setNotes('')
    setError('')
  }

  const typeFieldsToPayload = (v: TypeFieldsValue) => ({
    plan: v.plan,
    price: v.price === '' ? undefined : Number(v.price),
    connectionType: v.connectionType || undefined,
    previousProvider: v.connectionType === 'portability' ? v.previousProvider : '',
    previousPrice: v.previousPrice === '' ? undefined : Number(v.previousPrice),
  })

  const submit = async () => {
    for (let i = 0; i < steps.length - 1; i++) {
      const err = validateStep(i)
      if (err) { setStep(i); setError(err); return }
    }
    setSaving(true)
    try {
      const mobilePayload = offerTypes.includes('mobile') ? typeFieldsToPayload(mobile) : null
      const landlinePayload = offerTypes.includes('landline') ? typeFieldsToPayload(landline) : null
      const saved = await savePowerSellingItem({
        customerName, contactPhone, afm,
        offerTypes,
        mobilePlan: mobilePayload?.plan, mobilePrice: mobilePayload?.price,
        mobileConnectionType: mobilePayload?.connectionType, mobilePreviousProvider: mobilePayload?.previousProvider, mobilePreviousPrice: mobilePayload?.previousPrice,
        landlinePlan: landlinePayload?.plan, landlinePrice: landlinePayload?.price,
        landlineConnectionType: landlinePayload?.connectionType, landlinePreviousProvider: landlinePayload?.previousProvider, landlinePreviousPrice: landlinePayload?.previousPrice,
        hasGiftDevices: !!hasGiftDevices,
        giftDevicesCount: hasGiftDevices && giftDevicesCount !== '' ? Number(giftDevicesCount) : undefined,
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
    let out = items.map(it => ({ it, category: categoryOf(it.offerTypes) }))
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
    items.forEach(it => { counts[categoryOf(it.offerTypes)]++ })
    return counts
  }, [items])

  // ── edit modal ───────────────────────────────────────────────
  function openEdit(it: PowerSellingItem) {
    setEditItem(it)
    setEditName(it.customerName || '')
    setEditPhone(it.contactPhone || '')
    setEditAfm(it.afm || '')
    setEditOfferTypes((it.offerTypes || []) as OfferType[])
    setEditMobile({
      plan: it.mobilePlan || '', price: typeof it.mobilePrice === 'number' ? it.mobilePrice : '',
      connectionType: it.mobileConnectionType || null, previousProvider: it.mobilePreviousProvider || '',
      previousPrice: typeof it.mobilePreviousPrice === 'number' ? it.mobilePreviousPrice : '',
    })
    setEditLandline({
      plan: it.landlinePlan || '', price: typeof it.landlinePrice === 'number' ? it.landlinePrice : '',
      connectionType: it.landlineConnectionType || null, previousProvider: it.landlinePreviousProvider || '',
      previousPrice: typeof it.landlinePreviousPrice === 'number' ? it.landlinePreviousPrice : '',
    })
    setEditHasGift(!!it.hasGiftDevices)
    setEditGiftCount(typeof it.giftDevicesCount === 'number' ? it.giftDevicesCount : '')
    setEditHasSubsidy(!!it.hasSubsidy)
    setEditSubsidyAmount(typeof it.subsidyAmount === 'number' ? it.subsidyAmount : '')
    setEditErrors([])
    setNewComment('')
  }

  function toggleEditOfferType(t: OfferType) {
    setEditOfferTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  async function saveEdit() {
    if (!editItem) return
    const errs: string[] = []
    if (!editName.trim()) errs.push('Απαιτείται ονοματεπώνυμο πελάτη.')
    if (!editPhone.trim()) errs.push('Απαιτείται τηλέφωνο επικοινωνίας.')
    if (editOfferTypes.length === 0) errs.push('Επίλεξε τι αφορούσε η προσφορά.')
    if (editOfferTypes.includes('mobile')) {
      const missing = validateTypeFields(editMobile)
      if (missing) errs.push(`Συμπλήρωσε ${missing} για το κινητό.`)
    }
    if (editOfferTypes.includes('landline')) {
      const missing = validateTypeFields(editLandline)
      if (missing) errs.push(`Συμπλήρωσε ${missing} για το σταθερό.`)
    }
    if (editHasGift && (editGiftCount === '' || Number(editGiftCount) <= 0)) errs.push('Συμπλήρωσε πόσα πάγια δόθηκαν δώρο.')
    if (editHasSubsidy && (editSubsidyAmount === '' || Number(editSubsidyAmount) <= 0)) errs.push('Συμπλήρωσε το ποσό της επιδότησης.')
    if (errs.length) { setEditErrors(errs); return }

    setEditSaving(true)
    try {
      const mobilePayload = editOfferTypes.includes('mobile') ? typeFieldsToPayload(editMobile) : null
      const landlinePayload = editOfferTypes.includes('landline') ? typeFieldsToPayload(editLandline) : null
      const updated = await updatePowerSellingItem(editItem.id, {
        customerName: editName, contactPhone: editPhone, afm: editAfm,
        offerTypes: editOfferTypes,
        mobilePlan: mobilePayload?.plan, mobilePrice: mobilePayload?.price,
        mobileConnectionType: mobilePayload?.connectionType, mobilePreviousProvider: mobilePayload?.previousProvider, mobilePreviousPrice: mobilePayload?.previousPrice,
        landlinePlan: landlinePayload?.plan, landlinePrice: landlinePayload?.price,
        landlineConnectionType: landlinePayload?.connectionType, landlinePreviousProvider: landlinePayload?.previousProvider, landlinePreviousPrice: landlinePayload?.previousPrice,
        hasGiftDevices: !!editHasGift,
        giftDevicesCount: editHasGift && editGiftCount !== '' ? Number(editGiftCount) : undefined,
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
              <StepLabel>Τι αφορούσε η προσφορά;</StepLabel>
              <div style={{ display: 'flex', gap: 10 }}>
                {(['mobile', 'landline'] as OfferType[]).map(t => (
                  <button key={t} type="button" onClick={() => toggleOfferType(t)} className={offerTypes.includes(t) ? 'btn' : 'btn-ghost'} style={{ flex: 1, padding: '16px 0', fontWeight: 700, fontSize: '1rem' }}>
                    {OFFER_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: 10 }}>Μπορείς να επιλέξεις και τα δύο, αν η προσφορά αφορούσε συνδυασμό.</div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {offerTypes.includes('mobile') && <TypeFieldsEditor idPrefix="wizard-mobile" label="Κινητό" value={mobile} onChange={setMobile} planOptions={MOBILE_PLAN_PRESETS} />}
              {offerTypes.includes('landline') && <TypeFieldsEditor idPrefix="wizard-landline" label="Σταθερό" value={landline} onChange={setLandline} planOptions={HOME_TYPE_OPTIONS} />}
            </div>
          )}

          {step === 3 && (
            <div>
              <StepLabel>Δόθηκε πάγια δώρο;</StepLabel>
              <YesNoToggle value={hasGiftDevices} onChange={v => { setHasGiftDevices(v); if (!v) setGiftDevicesCount('') }} />
              {hasGiftDevices && (
                <div style={{ marginTop: 16 }}>
                  <StepLabel>Πόσα πάγια;</StepLabel>
                  <input className="panel-input" type="number" min={1} step={1} placeholder="π.χ. 1" value={giftDevicesCount} onChange={e => setGiftDevicesCount(e.target.value === '' ? '' : parseInt(e.target.value, 10))} style={{ width: 160 }} autoFocus />
                </div>
              )}
            </div>
          )}

          {step === 4 && (
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

          {step === 5 && (
            <div>
              <StepLabel>Σύνοψη</StepLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 18, marginBottom: 16 }}>
                <SummaryRow label="Πελάτης" value={customerName} />
                <SummaryRow label="Τηλέφωνο" value={contactPhone} />
                {afm && <SummaryRow label="ΑΦΜ" value={afm} />}
                <SummaryRow label="Αφορούσε" value={offerTypes.map(t => OFFER_TYPE_LABEL[t]).join(' & ') || '—'} />
                {offerTypes.includes('mobile') && (
                  <>
                    <SummaryRow label="Κινητό" value={`${mobile.plan} — ${formatNumber(Number(mobile.price) || 0, 2)} €`} />
                    {mobile.connectionType && <SummaryRow label="Κινητό — Σύνδεση" value={`${CONNECTION_TYPE_LABEL[mobile.connectionType]}${mobile.connectionType === 'portability' ? ` από ${mobile.previousProvider || '—'}` : ''}`} />}
                    {mobile.previousPrice !== '' && <SummaryRow label="Κινητό — Πλήρωνε" value={`${formatNumber(Number(mobile.previousPrice) || 0, 2)} €`} />}
                  </>
                )}
                {offerTypes.includes('landline') && (
                  <>
                    <SummaryRow label="Σταθερό" value={`${landline.plan} — ${formatNumber(Number(landline.price) || 0, 2)} €`} />
                    {landline.connectionType && <SummaryRow label="Σταθερό — Σύνδεση" value={`${CONNECTION_TYPE_LABEL[landline.connectionType]}${landline.connectionType === 'portability' ? ` από ${landline.previousProvider || '—'}` : ''}`} />}
                    {landline.previousPrice !== '' && <SummaryRow label="Σταθερό — Πλήρωνε" value={`${formatNumber(Number(landline.previousPrice) || 0, 2)} €`} />}
                  </>
                )}
                <SummaryRow label="Πάγια δώρο" value={hasGiftDevices ? `Ναι — ${giftDevicesCount}` : 'Όχι'} />
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
                    <CategoryBadge category={category} />
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{formatDate(it.createdAt)}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                    {it.contactPhone && <div>📞 {it.contactPhone}</div>}
                    {it.mobilePlan && <div>📱 {it.mobilePlan} — {formatNumber(it.mobilePrice || 0, 2)} €{it.mobileConnectionType ? ` · ${CONNECTION_TYPE_LABEL[it.mobileConnectionType]}` : ''}</div>}
                    {it.landlinePlan && <div>☎️ {it.landlinePlan} — {formatNumber(it.landlinePrice || 0, 2)} €{it.landlineConnectionType ? ` · ${CONNECTION_TYPE_LABEL[it.landlineConnectionType]}` : ''}</div>}
                    {it.hasGiftDevices && <div>🎁 Πάγια δώρο × {it.giftDevicesCount}</div>}
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
              <StepLabel>Τι αφορούσε η προσφορά</StepLabel>
              <div style={{ display: 'flex', gap: 10 }}>
                {(['mobile', 'landline'] as OfferType[]).map(t => (
                  <button key={t} type="button" onClick={() => toggleEditOfferType(t)} className={editOfferTypes.includes(t) ? 'btn' : 'btn-ghost'} style={{ flex: 1, padding: '10px 0', fontWeight: 700 }}>
                    {OFFER_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            {editOfferTypes.includes('mobile') && <TypeFieldsEditor idPrefix="edit-mobile" label="Κινητό" value={editMobile} onChange={setEditMobile} planOptions={MOBILE_PLAN_PRESETS} />}
            {editOfferTypes.includes('landline') && <TypeFieldsEditor idPrefix="edit-landline" label="Σταθερό" value={editLandline} onChange={setEditLandline} planOptions={HOME_TYPE_OPTIONS} />}

            <div>
              <StepLabel>Πάγια δώρο</StepLabel>
              <YesNoToggle value={editHasGift} onChange={v => { setEditHasGift(v); if (!v) setEditGiftCount('') }} />
              {editHasGift && (
                <input className="panel-input" type="number" min={1} step={1} placeholder="Πόσα;" value={editGiftCount} onChange={e => setEditGiftCount(e.target.value === '' ? '' : parseInt(e.target.value, 10))} style={{ width: 160, marginTop: 10 }} />
              )}
            </div>

            <div>
              <StepLabel>Επιδότηση</StepLabel>
              <YesNoToggle value={editHasSubsidy} onChange={v => { setEditHasSubsidy(v); if (!v) setEditSubsidyAmount('') }} />
              {editHasSubsidy && (
                <input className="panel-input" type="number" min={0} step="0.01" placeholder="Ποσό €" value={editSubsidyAmount} onChange={e => setEditSubsidyAmount(e.target.value === '' ? '' : parseFloat(e.target.value))} style={{ width: 160, marginTop: 10 }} />
              )}
            </div>

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
    </div>
  )
}
