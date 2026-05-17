import React, { useEffect, useState } from 'react'
import { saveEntry, loadAllGoals, loadAllEntries, Goal, DailyEntry } from '../services/storage'
import { useNavigate } from 'react-router-dom'
import { showNotification } from '../utils/notifications'
import PageHeader from '../components/PageHeader'
import { formatNumber, roundNumber } from '../utils/formatNumber'
import { STATIC_CATEGORIES, HOME_TYPE_OPTIONS, APPOINTMENT_AMOUNTS } from '../constants'
import { validateEntry } from '../utils/validateEntry'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7 }}>
      {children}
    </div>
  )
}

function SectionDivider({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 18px' }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.4 }}>{title}</div>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)', marginLeft: 6 }} />
    </div>
  )
}

export default function AddEntryPage() {
  const navigate = useNavigate()
  const [points, setPoints] = useState<number | ''>('')
  const [category, setCategory] = useState('')
  const [homeType, setHomeType] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [afm, setAfm] = useState('')
  const [mobilePhone, setMobilePhone] = useState('')
  const [landlinePhone, setLandlinePhone] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [recent, setRecent] = useState<DailyEntry[]>([])
  const [appointmentCounts, setAppointmentCounts] = useState<Record<number, number>>({})
  const categoryUpper = String(category || '').toUpperCase()

  useEffect(() => {
    loadAllGoals().then((goals: Goal[]) => {
      const past = Array.from(new Set(goals.map((g: Goal) => String(g.category || g.title || '').toUpperCase()).filter(Boolean))) as string[]
      setSuggestions(Array.from(new Set([...STATIC_CATEGORIES, ...past])) as string[])
      if (!category && STATIC_CATEGORIES.length) setCategory(STATIC_CATEGORIES[0])
    }).catch(() => {
      setSuggestions(STATIC_CATEGORIES)
      if (!category) setCategory(STATIC_CATEGORIES[0])
    })
    loadAllEntries().then((allEntries: DailyEntry[]) => {
      const sorted = (allEntries || []).sort((a, b) => b.date.localeCompare(a.date))
      setRecent(sorted.slice(0, 8))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (categoryUpper === 'VODAFONE HOME W/F') {
      if (!HOME_TYPE_OPTIONS.includes(homeType)) setHomeType(HOME_TYPE_OPTIONS[0])
    } else {
      if (homeType) setHomeType('')
    }
  }, [categoryUpper, homeType])

  useEffect(() => {
    if (categoryUpper === 'ΡΑΝΤΕΒΟΥ') {
      if (!orderNumber.trim()) setOrderNumber('Team Ready')
    } else if (orderNumber === 'Team Ready') {
      setOrderNumber('')
    }
  }, [categoryUpper, orderNumber])

  useEffect(() => {
    if (categoryUpper !== 'ΡΑΝΤΕΒΟΥ' && Object.keys(appointmentCounts).length) {
      setAppointmentCounts({})
    }
  }, [categoryUpper, appointmentCounts])

  useEffect(() => {
    if (categoryUpper === 'ΡΑΝΤΕΒΟΥ') {
      const total = APPOINTMENT_AMOUNTS.reduce((sum, amt) => sum + (appointmentCounts[amt] || 0) * amt, 0)
      setPoints(total ? roundNumber(total, 2) : 0)
    }
  }, [appointmentCounts, categoryUpper])

  const adjustAppointmentCount = (amount: number, delta: number) => {
    setAppointmentCounts(prev => {
      const current = prev[amount] || 0
      const next = Math.max(0, current + delta)
      if (next === current) return prev
      const updated = { ...prev }
      if (next === 0) { delete updated[amount] } else { updated[amount] = next }
      return updated
    })
  }

  const setAppointmentCount = (amount: number, count: number) => {
    setAppointmentCounts(prev => {
      const next = Math.max(0, count)
      const updated = { ...prev }
      if (next === 0) { delete updated[amount] } else { updated[amount] = next }
      return updated
    })
  }

  const validate = () => {
    const appointmentTotal = APPOINTMENT_AMOUNTS.reduce((sum, amt) => sum + (appointmentCounts[amt] || 0) * amt, 0)
    const errs = validateEntry({ category, orderNumber, customerName, points, isRantevou: categoryUpper === 'ΡΑΝΤΕΒΟΥ', appointmentTotal })
    setErrors(errs)
    return errs.length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const normalizedCategory = categoryUpper
      const parsed = normalizedCategory === 'ΡΑΝΤΕΒΟΥ'
        ? APPOINTMENT_AMOUNTS.reduce((sum, amt) => sum + (appointmentCounts[amt] || 0) * amt, 0)
        : (typeof points === 'number' ? points : parseFloat(String(points)))
      await saveEntry({ points: parsed, date: new Date().toISOString(), category: normalizedCategory, homeType, orderNumber, customerName, afm, mobilePhone, landlinePhone })
      setToast('Η καταχώρηση αποθηκεύτηκε')
      showNotification('Καταχώρηση', { body: `${normalizedCategory} — ${parsed} μον. — ${orderNumber}` })
      setTimeout(() => navigate('/'), 600)
    } catch (e) {
      console.error(e)
      setErrors(['Σφάλμα αποθήκευσης'])
    } finally { setSaving(false) }
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Καταχώρηση Παραγωγής"
        subtitle="Πρόσθεσε γρήγορα μια εγγραφή — εμφανίζεται στο μηνιαίο dashboard."
        breadcrumb="Καταχωρήσεις"
      />
      <div className="page-inner">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

          {/* ── Main form ── */}
          <div className="panel-card" style={{ padding: 28 }}>
            <form onSubmit={e => { e.preventDefault(); submit() }}>

              {/* Category section */}
              <SectionDivider
                icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="#a78bfa" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="#a78bfa" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="#a78bfa" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="#a78bfa" strokeWidth="2"/></svg>}
                title="Κατηγορία"
              />
              <div style={{ marginBottom: 16 }}>
                <FieldLabel>Κατηγορία</FieldLabel>
                <div style={{ display: 'flex', gap: 10 }}>
                  <select className="panel-input" value={category} onChange={e => setCategory(e.target.value ? e.target.value.toUpperCase() : '')} aria-label="Επιλογή κατηγορίας" style={{ flex: 1 }}>
                    {suggestions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input className="panel-input" placeholder="ή νέα κατηγορία" value={category} onChange={e => setCategory(e.target.value ? e.target.value.toUpperCase() : '')} style={{ flex: 1 }} />
                </div>
              </div>

              {categoryUpper === 'VODAFONE HOME W/F' && (
                <div style={{ marginBottom: 16 }}>
                  <FieldLabel>Υποτύπος</FieldLabel>
                  <select className="panel-input" value={homeType} onChange={e => setHomeType(e.target.value)} aria-label="Επιλογή υποτύπου" style={{ width: '100%' }}>
                    {HOME_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              )}

              {/* Customer info */}
              <SectionDivider
                icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#a78bfa" strokeWidth="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"/></svg>}
                title="Στοιχεία πελάτη"
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <FieldLabel>Ονοματεπώνυμο</FieldLabel>
                  <input className="panel-input" placeholder="π.χ. Γεώργιος Παπαδόπουλος" value={customerName} onChange={e => setCustomerName(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <FieldLabel>ΑΦΜ <span style={{ fontWeight: 400, opacity: 0.6 }}>(προαιρετικό)</span></FieldLabel>
                  <input className="panel-input" placeholder="π.χ. 123456789" value={afm} onChange={e => setAfm(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <FieldLabel>Κινητό <span style={{ fontWeight: 400, opacity: 0.6 }}>(προαιρετικό)</span></FieldLabel>
                  <input className="panel-input" placeholder="69xxxxxxxx" value={mobilePhone} onChange={e => setMobilePhone(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <FieldLabel>Σταθερό <span style={{ fontWeight: 400, opacity: 0.6 }}>(προαιρετικό)</span></FieldLabel>
                  <input className="panel-input" placeholder="210xxxxxxx" value={landlinePhone} onChange={e => setLandlinePhone(e.target.value)} style={{ width: '100%' }} />
                </div>
              </div>

              {/* Order info */}
              <SectionDivider
                icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="#a78bfa" strokeWidth="2"/><rect x="9" y="3" width="6" height="4" rx="1" stroke="#a78bfa" strokeWidth="2"/></svg>}
                title="Στοιχεία παραγγελίας"
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <FieldLabel>Αρ. παραγγελίας</FieldLabel>
                  <input className="panel-input" placeholder="π.χ. 2025-000123" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <FieldLabel>Μονάδες / Σημεία</FieldLabel>
                  <input
                    className="panel-input"
                    type="number"
                    step="0.1"
                    value={points}
                    onChange={e => setPoints(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    aria-label="Μονάδες"
                    readOnly={categoryUpper === 'ΡΑΝΤΕΒΟΥ'}
                    style={{ width: '100%', ...(categoryUpper === 'ΡΑΝΤΕΒΟΥ' ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                  />
                  {categoryUpper === 'ΡΑΝΤΕΒΟΥ' && (
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Υπολογίζεται αυτόματα</div>
                  )}
                </div>
              </div>

              {/* ΡΑΝΤΕΒΟΥ section */}
              {categoryUpper === 'ΡΑΝΤΕΒΟΥ' && (
                <div style={{ marginBottom: 16 }}>
                  <FieldLabel>Ποσά ραντεβού</FieldLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                    {APPOINTMENT_AMOUNTS.map(amount => {
                      const count = appointmentCounts[amount] || 0
                      return (
                        <div key={amount} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#c4b5fd' }}>{formatNumber(amount, 2)} €</span>
                            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{formatNumber(count * amount, 2)} €</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button type="button" className="btn-ghost" onClick={() => adjustAppointmentCount(amount, -1)} disabled={count === 0} style={{ minWidth: 30, padding: '4px 8px', textAlign: 'center' }} aria-label="-">−</button>
                            <input type="number" min={0} step={1} value={count} onChange={e => setAppointmentCount(amount, Math.floor(Number(e.target.value) || 0))} className="panel-input" style={{ width: 52, textAlign: 'center', padding: '4px 6px' }} aria-label={`Πλήθος ${amount}€`} />
                            <button type="button" className="btn" onClick={() => adjustAppointmentCount(amount, 1)} style={{ minWidth: 30, padding: '4px 8px', textAlign: 'center' }} aria-label="+">+</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>Άθροισμα: {formatNumber(APPOINTMENT_AMOUNTS.reduce((s, a) => s + (appointmentCounts[a] || 0) * a, 0), 2)} €</div>
                </div>
              )}

              {errors.length > 0 && (
                <div role="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  {errors.map((er, i) => <div key={i} style={{ color: '#fca5a5', fontSize: '0.85rem' }}>{er}</div>)}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
                <button className="btn" type="submit" disabled={saving} style={{ minWidth: 160, padding: '10px 20px', fontWeight: 700, background: 'linear-gradient(90deg,#7c3aed,#5b21b6)', border: 'none' }}>
                  {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
                </button>
                <button className="btn-ghost" type="button" onClick={() => navigate(-1)} style={{ padding: '10px 18px' }}>Ακύρωση</button>
              </div>
            </form>
          </div>

          {/* ── Sidebar: recent entries ── */}
          <div style={{ position: 'sticky', top: 100 }}>
            <div className="panel-card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#ff6b8a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 3v18h18" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M7 14v-3M12 18v-8M17 10V7" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>Πρόσφατες</div>
              </div>

              {recent.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.25)', fontSize: '0.82rem' }}>Δεν υπάρχουν εγγραφές</div>
              ) : (
                <div>
                  {recent.map(r => (
                    <div key={r.id} style={{ padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'rgba(255,255,255,0.82)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.category}{r.homeType ? ` · ${r.homeType}` : ''}
                        </div>
                        {r.customerName && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{r.customerName}</div>}
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                          {new Date(r.date).toLocaleDateString('el-GR', { day: '2-digit', month: 'short' })}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#c4b5fd', flexShrink: 0 }}>{formatNumber(r.points || 0, 2)}</div>
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
