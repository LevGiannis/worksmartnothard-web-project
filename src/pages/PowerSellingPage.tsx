import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { formatNumber } from '../utils/formatNumber'
import { loadPowerSellingItems, savePowerSellingItem, deletePowerSellingItem, PowerSellingItem } from '../services/storage'

type OfferType = 'mobile' | 'landline'

const OFFER_TYPE_LABEL: Record<OfferType, string> = { mobile: 'Κινητό', landline: 'Σταθερό' }

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
      <button
        type="button"
        onClick={() => onChange(true)}
        className={value === true ? 'btn' : 'btn-ghost'}
        style={{ flex: 1, padding: '12px 0', fontWeight: 700 }}
      >Ναι</button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={value === false ? 'btn' : 'btn-ghost'}
        style={{ flex: 1, padding: '12px 0', fontWeight: 700 }}
      >Όχι</button>
    </div>
  )
}

export default function PowerSellingPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [customerName, setCustomerName] = useState('')
  const [offerTypes, setOfferTypes] = useState<OfferType[]>([])
  const [mobilePlan, setMobilePlan] = useState('')
  const [mobilePrice, setMobilePrice] = useState<number | ''>('')
  const [landlinePlan, setLandlinePlan] = useState('')
  const [landlinePrice, setLandlinePrice] = useState<number | ''>('')
  const [hasGiftDevices, setHasGiftDevices] = useState<boolean | null>(null)
  const [giftDevicesCount, setGiftDevicesCount] = useState<number | ''>('')
  const [hasSubsidy, setHasSubsidy] = useState<boolean | null>(null)
  const [subsidyAmount, setSubsidyAmount] = useState<number | ''>('')
  const [notes, setNotes] = useState('')

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [recent, setRecent] = useState<PowerSellingItem[]>([])

  const reloadRecent = () => loadPowerSellingItems().then(items => setRecent(items.slice(0, 8)))
  useEffect(() => { reloadRecent() }, [])

  const toggleOfferType = (t: OfferType) => {
    setOfferTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const steps = [
    { key: 'name', title: 'Πελάτης' },
    { key: 'offer', title: 'Προσφορά' },
    { key: 'plans', title: 'Προγράμματα' },
    { key: 'gift', title: 'Πάγια δώρο' },
    { key: 'subsidy', title: 'Επιδότηση' },
    { key: 'review', title: 'Επιβεβαίωση' },
  ]

  function validateStep(idx: number): string {
    if (idx === 0) {
      if (!customerName.trim()) return 'Συμπλήρωσε το ονοματεπώνυμο του πελάτη.'
    }
    if (idx === 1) {
      if (offerTypes.length === 0) return 'Επίλεξε τι αφορούσε η προσφορά.'
    }
    if (idx === 2) {
      if (offerTypes.includes('mobile') && (!mobilePlan.trim() || mobilePrice === '')) return 'Συμπλήρωσε πρόγραμμα και τιμή για το κινητό.'
      if (offerTypes.includes('landline') && (!landlinePlan.trim() || landlinePrice === '')) return 'Συμπλήρωσε πρόγραμμα και τιμή για το σταθερό.'
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
  const goBack = () => {
    setError('')
    setStep(s => Math.max(s - 1, 0))
  }

  const resetForm = () => {
    setStep(0)
    setCustomerName('')
    setOfferTypes([])
    setMobilePlan(''); setMobilePrice('')
    setLandlinePlan(''); setLandlinePrice('')
    setHasGiftDevices(null); setGiftDevicesCount('')
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
      await savePowerSellingItem({
        customerName,
        offerTypes,
        mobilePlan: offerTypes.includes('mobile') ? mobilePlan : '',
        mobilePrice: offerTypes.includes('mobile') && mobilePrice !== '' ? Number(mobilePrice) : undefined,
        landlinePlan: offerTypes.includes('landline') ? landlinePlan : '',
        landlinePrice: offerTypes.includes('landline') && landlinePrice !== '' ? Number(landlinePrice) : undefined,
        hasGiftDevices: !!hasGiftDevices,
        giftDevicesCount: hasGiftDevices && giftDevicesCount !== '' ? Number(giftDevicesCount) : undefined,
        hasSubsidy: !!hasSubsidy,
        subsidyAmount: hasSubsidy && subsidyAmount !== '' ? Number(subsidyAmount) : undefined,
        notes,
      })
      setToast('Η φόρμα πώλησης αποθηκεύτηκε')
      await reloadRecent()
      resetForm()
      setTimeout(() => setToast(''), 2500)
    } catch (e) {
      console.error(e)
      setError('Σφάλμα αποθήκευσης')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm('Διαγραφή καταχώρησης; Δεν αναστρέφεται.')) return
    const ok = await deletePowerSellingItem(id)
    if (ok) setRecent(prev => prev.filter(p => p.id !== id))
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

          {/* ── Wizard ── */}
          <div className="panel-card" style={{ padding: 28 }}>

            {/* progress */}
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

            {/* Step 0: name */}
            {step === 0 && (
              <div>
                <StepLabel>Ονοματεπώνυμο πελάτη</StepLabel>
                <input
                  className="panel-input"
                  placeholder="π.χ. Γεώργιος Παπαδόπουλος"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  style={{ width: '100%', fontSize: '1.05rem', padding: '14px 16px' }}
                  autoFocus
                />
              </div>
            )}

            {/* Step 1: offer type */}
            {step === 1 && (
              <div>
                <StepLabel>Τι αφορούσε η προσφορά;</StepLabel>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['mobile', 'landline'] as OfferType[]).map(t => {
                    const active = offerTypes.includes(t)
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleOfferType(t)}
                        className={active ? 'btn' : 'btn-ghost'}
                        style={{ flex: 1, padding: '16px 0', fontWeight: 700, fontSize: '1rem' }}
                      >
                        {OFFER_TYPE_LABEL[t]}
                      </button>
                    )
                  })}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: 10 }}>Μπορείς να επιλέξεις και τα δύο, αν η προσφορά αφορούσε συνδυασμό.</div>
              </div>
            )}

            {/* Step 2: plans + price */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {offerTypes.includes('mobile') && (
                  <div>
                    <StepLabel>Κινητό — Πρόγραμμα &amp; Τιμή</StepLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12 }}>
                      <input className="panel-input" placeholder="π.χ. RED 10GB" value={mobilePlan} onChange={e => setMobilePlan(e.target.value)} />
                      <input className="panel-input" type="number" step="0.01" min={0} placeholder="Τιμή €" value={mobilePrice} onChange={e => setMobilePrice(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                    </div>
                  </div>
                )}
                {offerTypes.includes('landline') && (
                  <div>
                    <StepLabel>Σταθερό — Πρόγραμμα &amp; Τιμή</StepLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12 }}>
                      <input className="panel-input" placeholder="π.χ. VDSL Double" value={landlinePlan} onChange={e => setLandlinePlan(e.target.value)} />
                      <input className="panel-input" type="number" step="0.01" min={0} placeholder="Τιμή €" value={landlinePrice} onChange={e => setLandlinePrice(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: gift devices */}
            {step === 3 && (
              <div>
                <StepLabel>Δόθηκε πάγια δώρο;</StepLabel>
                <YesNoToggle value={hasGiftDevices} onChange={v => { setHasGiftDevices(v); if (!v) setGiftDevicesCount('') }} />
                {hasGiftDevices && (
                  <div style={{ marginTop: 16 }}>
                    <StepLabel>Πόσα πάγια;</StepLabel>
                    <input
                      className="panel-input"
                      type="number"
                      min={1}
                      step={1}
                      placeholder="π.χ. 1"
                      value={giftDevicesCount}
                      onChange={e => setGiftDevicesCount(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      style={{ width: 160 }}
                      autoFocus
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 4: subsidy */}
            {step === 4 && (
              <div>
                <StepLabel>Υπήρχε επιδότηση;</StepLabel>
                <YesNoToggle value={hasSubsidy} onChange={v => { setHasSubsidy(v); if (!v) setSubsidyAmount('') }} />
                {hasSubsidy && (
                  <div style={{ marginTop: 16 }}>
                    <StepLabel>Ποσό επιδότησης (€)</StepLabel>
                    <input
                      className="panel-input"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="π.χ. 50"
                      value={subsidyAmount}
                      onChange={e => setSubsidyAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      style={{ width: 160 }}
                      autoFocus
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 5: review */}
            {step === 5 && (
              <div>
                <StepLabel>Σύνοψη</StepLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 18, marginBottom: 16 }}>
                  <SummaryRow label="Πελάτης" value={customerName} />
                  <SummaryRow label="Αφορούσε" value={offerTypes.map(t => OFFER_TYPE_LABEL[t]).join(' & ') || '—'} />
                  {offerTypes.includes('mobile') && <SummaryRow label="Κινητό" value={`${mobilePlan} — ${formatNumber(Number(mobilePrice) || 0, 2)} €`} />}
                  {offerTypes.includes('landline') && <SummaryRow label="Σταθερό" value={`${landlinePlan} — ${formatNumber(Number(landlinePrice) || 0, 2)} €`} />}
                  <SummaryRow label="Πάγια δώρο" value={hasGiftDevices ? `Ναι — ${giftDevicesCount}` : 'Όχι'} />
                  <SummaryRow label="Επιδότηση" value={hasSubsidy ? `Ναι — ${formatNumber(Number(subsidyAmount) || 0, 2)} €` : 'Όχι'} />
                </div>
                <StepLabel>Σημειώσεις <span style={{ fontWeight: 400, opacity: 0.6, textTransform: 'none' }}>(προαιρετικό)</span></StepLabel>
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

          {/* ── Sidebar: recent entries ── */}
          <div style={{ position: 'sticky', top: 100 }}>
            <div className="panel-card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#ff6b8a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>Πρόσφατες πωλήσεις</div>
              </div>

              {recent.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.25)', fontSize: '0.82rem' }}>Δεν υπάρχουν καταχωρήσεις</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {recent.map(r => (
                    <div key={r.id} style={{ padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'rgba(255,255,255,0.82)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.customerName || '—'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                          {(r.offerTypes || []).map(t => OFFER_TYPE_LABEL[t as OfferType]).join(' & ') || '—'}
                          {r.hasGiftDevices ? ' · Πάγια δώρο' : ''}
                          {r.hasSubsidy ? ' · Επιδότηση' : ''}
                        </div>
                        {r.createdAt && (
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                            {new Date(r.createdAt).toLocaleDateString('el-GR', { day: '2-digit', month: 'short' })}
                          </div>
                        )}
                      </div>
                      <button
                        className="btn-ghost"
                        onClick={() => onDelete(r.id)}
                        aria-label={`Διαγραφή ${r.customerName || ''}`}
                        style={{ padding: '3px 7px', fontSize: '0.72rem', flexShrink: 0, color: '#fca5a5' }}
                      >🗑️</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {toast && (
        <div className="toast fixed top-6 right-6" style={{ background: 'linear-gradient(90deg,#10b981,#059669)', color: '#fff', padding: '12px 18px', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.4)', zIndex: 300, fontSize: '0.9rem', fontWeight: 600 }} role="status">
          {toast}
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
