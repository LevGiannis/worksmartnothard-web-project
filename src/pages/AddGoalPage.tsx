import React, { useEffect, useMemo, useState } from 'react'
import { saveGoal, loadAllGoals, loadEntriesForMonth, Goal, DailyEntry } from '../services/storage'
import { useNavigate } from 'react-router-dom'
import { showNotification } from '../utils/notifications'
import PageHeader from '../components/PageHeader'
import { safeJsonParse, safeLocalStorageGet, safeLocalStorageSet } from '../utils/safeLocalStorage'
import { formatNumber } from '../utils/formatNumber'
import { STATIC_CATEGORIES } from '../constants'

const MONTH_NAMES = ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος','Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος']

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: 0.3 }}>{title}</div>
    </div>
  )
}

export default function AddGoalPage() {
  const navigate = useNavigate()
  const now = new Date()
  const [category, setCategory] = useState('')
  const [target, setTarget] = useState<number | ''>('')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [notes, setNotes] = useState('')
  const [color, setColor] = useState('#7c3aed')
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [toastMsg, setToastMsg] = useState('')

  useEffect(() => {
    loadAllGoals().then((goals: Goal[]) => {
      const past = Array.from(new Set(goals.map((g: Goal) => String(g.category || g.title || '').toUpperCase()).filter(Boolean))) as string[]
      const merged = Array.from(new Set([...STATIC_CATEGORIES, ...past]))
      setSuggestions(merged)
      if (!category && merged.length) setCategory(merged[0])
    })
  }, [])

  const persistCategorySuggestion = (value: string) => {
    if (!value) return
    try {
      const key = 'ws_suggestions_goal_category'
      const raw = safeJsonParse<any[]>(safeLocalStorageGet(key), [])
      const arr = Array.isArray(raw) ? raw : []
      const upper = value.toUpperCase()
      const filtered = arr.filter((x: string) => x.toUpperCase() !== upper)
      const next = [upper, ...filtered].slice(0, 30)
      safeLocalStorageSet(key, JSON.stringify(next))
    } catch (e) {
      console.warn('persist category suggestion', e)
    }
  }

  const validate = () => {
    const errs: string[] = []
    if (!String(category || '').trim()) errs.push('Η κατηγορία είναι απαραίτητη')
    const tnum = typeof target === 'number' ? target : parseFloat(String(target || '0'))
    if (!tnum || tnum <= 0) errs.push('Ο στόχος πρέπει να είναι μεγαλύτερος του 0')
    setErrors(errs)
    return errs.length === 0
  }

  const [achieved, setAchieved] = useState(0)
  useEffect(() => {
    let mounted = true
    loadEntriesForMonth(year, month).then((allEntries: DailyEntry[]) => {
      if (!mounted) return
      const key = String(category || '').toUpperCase()
      const filtered = allEntries.filter((e: DailyEntry) => String(e.category || '').toUpperCase() === key)
      const sum = filtered.reduce((s: number, e: DailyEntry) => s + (e.points || 0), 0)
      setAchieved(sum)
      setEntries(filtered.slice().sort((a, b) => (b.date || '').localeCompare(a.date)))
    })
    return () => { mounted = false }
  }, [category, year, month])

  const years = useMemo(() => {
    const y = now.getFullYear()
    return [y, y + 1]
  }, [now])

  const safeTarget = (typeof target === 'number' && target > 0) ? target : (parseFloat(String(target || '0')) || 0)
  const percent = safeTarget > 0 ? Math.round((achieved / safeTarget) * 100) : 0
  const percentClamped = Math.max(0, Math.min(100, percent))

  const onSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const parsedTarget = typeof target === 'number' ? target : parseFloat(String(target))
      const normalizedCategory = String(category || '').toUpperCase()
      persistCategorySuggestion(normalizedCategory)
      await saveGoal({ category: normalizedCategory, title: '', target: parsedTarget, year, month, notes, color })
      setToastMsg('Ο στόχος αποθηκεύτηκε')
      showNotification('Στόχος αποθηκεύτηκε', { body: `${normalizedCategory} — στόχος ${parsedTarget}` })
      setTimeout(() => navigate('/'), 600)
    } catch (e) {
      console.error(e)
      setErrors(['Σφάλμα αποθήκευσης'])
    } finally { setSaving(false) }
  }

  const isValid = String(category || '').trim().length > 0 && (typeof target === 'number' ? target > 0 : parseFloat(String(target || '0')) > 0)

  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(''), 1800)
    return () => clearTimeout(t)
  }, [toastMsg])

  return (
    <div className="page-content">
      <PageHeader
        title="Προσθήκη Στόχου"
        subtitle="Δημιούργησε νέο μηνιαίο στόχο για την ομάδα"
        breadcrumb="Στόχοι"
      />
      <div className="page-inner">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

          {/* ── Form card ── */}
          <div className="panel-card" style={{ padding: 28 }}>
            <SectionHeader
              title="Στοιχεία στόχου"
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
            />

            {/* Category */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Κατηγορία</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <select
                  className="panel-input"
                  value={category}
                  onChange={e => setCategory(e.target.value ? e.target.value.toUpperCase() : '')}
                  style={{ flex: 1 }}
                  aria-label="Επιλογή κατηγορίας"
                >
                  {suggestions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                  className="panel-input"
                  placeholder="ή νέα κατηγορία"
                  value={category}
                  onChange={e => setCategory(e.target.value ? e.target.value.toUpperCase() : '')}
                  style={{ flex: 1 }}
                  aria-label="Νέα κατηγορία"
                />
              </div>
              {errors.some(er => er.includes('κατηγορ')) && (
                <div role="alert" style={{ color: '#fca5a5', fontSize: '0.8rem', marginTop: 6 }}>Η κατηγορία είναι απαραίτητη.</div>
              )}
            </div>

            {/* Target */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Στόχος (μονάδες)</label>
              <input
                className="panel-input"
                inputMode="decimal"
                step="0.01"
                type="number"
                min={0}
                value={target}
                onChange={e => setTarget(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="π.χ. 150.5"
                aria-label="Στόχος"
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.38)', marginTop: 5 }}>Συνολικές μονάδες — δεκαδικό επιτρέπεται</div>
              {errors.some(er => er.includes('στόχος')) && (
                <div role="alert" style={{ color: '#fca5a5', fontSize: '0.8rem', marginTop: 6 }}>Ο στόχος πρέπει να είναι αριθμός μεγαλύτερος του 0.</div>
              )}
            </div>

            {/* Month / Year */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Περίοδος</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <select className="panel-input" value={month} onChange={e => setMonth(parseInt(e.target.value))} aria-label="Μήνας" style={{ flex: 1 }}>
                  {MONTH_NAMES.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
                </select>
                <select className="panel-input" value={year} onChange={e => setYear(parseInt(e.target.value))} aria-label="Έτος" style={{ width: 110 }}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Σημειώσεις <span style={{ fontWeight: 400, opacity: 0.6 }}>(προαιρετικά)</span></label>
              <textarea
                className="panel-input"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Πρόσθεσε οδηγίες ή υπενθύμιση..."
                style={{ width: '100%', resize: 'vertical', minHeight: 72 }}
              />
            </div>

            {/* Color */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Χρώμα κάρτας</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="color" value={color} onChange={e => setColor(e.target.value)} aria-label="Επιλογή χρώματος" style={{ width: 44, height: 36, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none' }} />
                <div style={{ width: 36, height: 36, borderRadius: 10, background: color, boxShadow: `0 4px 14px ${color}55` }} />
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>Εμφάνιση στην κάρτα στόχου</div>
              </div>
            </div>

            {errors.length > 0 && (
              <div role="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                {errors.map((er, i) => <div key={i} style={{ color: '#fca5a5', fontSize: '0.85rem' }}>{er}</div>)}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                className="btn"
                onClick={onSave}
                disabled={saving || !isValid}
                style={{ minWidth: 160, padding: '10px 20px', fontWeight: 700, background: 'linear-gradient(90deg,#7c3aed,#5b21b6)', border: 'none' }}
              >
                {saving ? 'Αποθήκευση...' : 'Αποθήκευση στόχου'}
              </button>
              <button className="btn-ghost" onClick={() => navigate(-1)} style={{ padding: '10px 18px' }}>Ακύρωση</button>
            </div>
          </div>

          {/* ── Preview card ── */}
          <div style={{ position: 'sticky', top: 100 }}>
            <div className="panel-card" style={{ padding: 24 }}>
              <SectionHeader
                title="Προεπισκόπηση"
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" stroke="white" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="white" strokeWidth="2"/></svg>}
              />

              {/* Category swatch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: color, boxShadow: `0 6px 20px ${color}55`, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{category || 'Κατηγορία'}</div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{MONTH_NAMES[month - 1]} {year}</div>
                </div>
              </div>

              {/* Progress */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>Πρόοδος μήνα</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{safeTarget > 0 ? `${percentClamped}%` : '—'}</div>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${percentClamped}%`, background: `linear-gradient(90deg, ${color}, #ff6b8a)`, borderRadius: 999, transition: 'width 400ms ease' }} />
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
                  {formatNumber(achieved || 0, 2)} / {safeTarget > 0 ? formatNumber(safeTarget, 2) : '—'} μον.
                </div>
              </div>

              {/* Recent entries */}
              {entries.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 14 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Πρόσφατες καταχωρήσεις</div>
                  {entries.slice(0, 4).map(en => (
                    <div key={en.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }}>{new Date(en.date).toLocaleDateString('el-GR', { day: '2-digit', month: 'short' })}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#c4b5fd' }}>{formatNumber(en.points || 0, 2)}</div>
                    </div>
                  ))}
                </div>
              )}

              {!category && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.25)', fontSize: '0.82rem' }}>
                  Συμπλήρωσε τη φόρμα για προεπισκόπηση
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div style={{ position: 'fixed', right: 20, bottom: 20, background: 'linear-gradient(90deg,#7c3aed,#5b21b6)', color: '#fff', padding: '12px 18px', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.4)', zIndex: 300, fontSize: '0.9rem', fontWeight: 600 }} role="status">
          {toastMsg}
        </div>
      )}
    </div>
  )
}
