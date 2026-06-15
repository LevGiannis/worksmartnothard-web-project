import React, { useEffect, useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import useProgress from '../hooks/useProgress'
import PageHeader from '../components/PageHeader'
import { safeLocalStorageGet } from '../utils/safeLocalStorage'
import { formatNumber } from '../utils/formatNumber'
import { ThemeContext } from '../App'

type ThemeKey = 'midnight' | 'amethyst' | 'emerald' | 'slate' | 'ocean' | 'sunset' | 'forest' | 'coral'

const THEME_NAMES: Record<ThemeKey, string> = {
  midnight: 'Midnight Navy',
  amethyst: 'Deep Amethyst',
  emerald: 'Light Grey',
  slate: 'Slate Charcoal',
  ocean: 'Ocean Blue',
  sunset: 'Sunset Orange',
  forest: 'Forest Green',
  coral: 'Coral Pink',
}

const THEME_ICONS: Record<ThemeKey, string> = {
  midnight: '🌙',
  amethyst: '💜',
  emerald: '☁️',
  slate: '🩶',
  ocean: '🌊',
  sunset: '🌅',
  forest: '🌲',
  coral: '🪸',
}

const MONTH_NAMES_GR = ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος','Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος']
const ACCENT_COLORS = ['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316','#6366f1']

const quickLinks = [
  {
    to: '/add-goal',
    label: 'Προσθήκη Στόχου',
    hint: 'Ρύθμισε τους στόχους της ομάδας',
    gradient: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
    ),
  },
  {
    to: '/add-entry',
    label: 'Καταχώρηση',
    hint: 'Πρόσθεσε νέα εγγραφή παραγωγής',
    gradient: 'linear-gradient(135deg,#10b981,#059669)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
    ),
  },
  {
    to: '/stats',
    label: 'Στατιστικά',
    hint: 'Αναλυτικές αναφορές & εξαγωγή',
    gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 3v18h18" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M7 14v-4M12 18v-8M17 10V6" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
    ),
  },
  {
    to: '/pending',
    label: 'Εκκρεμότητες',
    hint: 'Παρακολούθηση εκκρεμών ενεργειών',
    gradient: 'linear-gradient(135deg,#f59e0b,#d97706)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 8v4l3 3" stroke="white" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2"/></svg>
    ),
  },
  {
    to: '/profile',
    label: 'Προφίλ',
    hint: 'Στοιχεία χρήστη και ρυθμίσεις',
    gradient: 'linear-gradient(135deg,#6366f1,#4338ca)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
    ),
  },
  {
    to: '/manager',
    label: 'Manager',
    hint: 'Διαχείριση ομάδας και αναφορές',
    gradient: 'linear-gradient(135deg,#0891b2,#0e7490)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" stroke="white" strokeWidth="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M12 12v4M10 14h4" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
    ),
  },
]

export default function MainPage() {
  const { progress: stats, loading, month: currentMonth, year: currentYear } = useProgress()
  const { theme, setTheme } = useContext(ThemeContext)
  const [showThemeMenu, setShowThemeMenu] = useState(false)

  const totalPct = (() => {
    const items = stats || []
    if (items.length === 0) return 0
    const sumPct = items.reduce((s, c) => {
      const pct = c.target > 0 ? (c.achieved / c.target) * 100 : 0
      return s + pct
    }, 0)
    return Math.max(0, Math.min(100, Math.round(sumPct / items.length)))
  })()

  const displayedMonth = (typeof currentMonth === 'number' && currentMonth >= 1 && currentMonth <= 12)
    ? MONTH_NAMES_GR[currentMonth - 1]
    : MONTH_NAMES_GR[new Date().getMonth()]

  const storeLabel = safeLocalStorageGet('ws_user_store') || '—'
  const userFirstName = safeLocalStorageGet('ws_user_first') || ''
  const userLastName = safeLocalStorageGet('ws_user_last') || ''
  const userFullName = `${userFirstName} ${userLastName}`.trim()
  const userRole = safeLocalStorageGet('ws_user_role') || ''
  const initials = `${userFirstName.charAt(0)}${userLastName.charAt(0)}`.toUpperCase()

  const totalAchieved = (stats || []).reduce((s, c) => s + c.achieved, 0)
  const totalTarget = (stats || []).reduce((s, c) => s + c.target, 0)

  return (
    <div className="page-content">
      <PageHeader
        title="Αρχική"
        subtitle="Συνοπτική σελίδα — γρήγορη πρόσβαση σε βασικές ενέργειες"
        backTo={null}
      />

      <div className="page-inner">

        {/* Theme Selector */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, position: 'relative' }}>
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.7)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          >
            <span>{THEME_ICONS[theme]}</span>
            <span>{THEME_NAMES[theme]}</span>
          </button>
          {showThemeMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 6,
              background: 'rgba(15, 17, 32, 0.95)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              padding: '12px',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 6,
              zIndex: 100,
              backdropFilter: 'blur(8px)',
              width: 280,
            }}>
              {(Object.entries(THEME_NAMES) as [ThemeKey, string][]).map(([tKey, tName]) => (
                <button
                  key={tKey}
                  onClick={() => {
                    setTheme(tKey)
                    setShowThemeMenu(false)
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: theme === tKey ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    background: theme === tKey ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
                    color: theme === tKey ? '#fff' : 'rgba(255,255,255,0.6)',
                    fontWeight: theme === tKey ? 600 : 500,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 150ms',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                    e.currentTarget.style.color = '#fff'
                  }}
                  onMouseLeave={(e) => {
                    if (theme === tKey) {
                      e.currentTarget.style.background = 'rgba(124,58,237,0.15)'
                      e.currentTarget.style.color = '#fff'
                    } else {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                      e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
                    }
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{THEME_ICONS[tKey]}</span>
                  <span>{tName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Hero banner ── */}
        <div className="panel-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20, background: 'linear-gradient(135deg, #0b0520 0%, #1a0a38 50%, #0d1a3a 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 160, position: 'relative' }}>
            {/* Decorative blob */}
            <div style={{ position: 'absolute', top: -40, right: 80, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} aria-hidden />
            <div style={{ position: 'absolute', bottom: -30, right: 200, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,107,138,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} aria-hidden />

            {/* Left: user info */}
            <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#ff6b8a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', color: '#fff', flexShrink: 0, letterSpacing: 1 }}>
                  {initials || '?'}
                </div>
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                    {userFullName || 'WorkSmart'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                    {userRole || 'Χωρίς ρόλο'}{storeLabel !== '—' ? ` · ${storeLabel}` : ''}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>WORK SMART · NOT HARD</div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', lineHeight: 1.15, margin: 0 }}>Θέσε στόχους.<br />Παρακολούθησε πρόοδο.</h1>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <Link to="/add-goal" style={{ padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(90deg,#7c3aed,#5b21b6)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', boxShadow: '0 6px 20px rgba(124,58,237,0.3)' }}>Προσθήκη στόχου</Link>
                  <Link to="/stats" style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>Στατιστικά</Link>
                </div>
              </div>
            </div>

            {/* Right: KPI card */}
            <div style={{ width: 240, padding: '28px 24px', background: 'rgba(255,255,255,0.025)', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, zIndex: 1, flexShrink: 0 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>Τρέχων μήνας</div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>{displayedMonth} {currentYear}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 54, height: 54, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#ff6b8a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', color: '#fff', flexShrink: 0 }}>
                  {totalPct}%
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>Συνολική πρόοδος</div>
                  <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                    {formatNumber(totalAchieved, 2)} / {formatNumber(totalTarget, 2)}
                  </div>
                </div>
              </div>

              <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${totalPct}%`, background: 'linear-gradient(90deg,#7c3aed,#ff6b8a)', borderRadius: 999 }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Monthly stats per category ── */}
        {stats && stats.length > 0 && (
          <div className="panel-card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 3v18h18" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M7 14v-4M12 18v-8M17 10V7" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)' }}>Στατιστικά — {displayedMonth}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(stats || []).map((s, idx) => {
                const pct = s.target > 0 ? Math.round((s.achieved / s.target) * 100) : 0
                const pctClamped = Math.max(0, Math.min(100, pct))
                const color = s.color || ACCENT_COLORS[idx % ACCENT_COLORS.length]
                return (
                  <div key={s.category} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Donut */}
                    <svg width="44" height="44" viewBox="0 0 36 36" aria-hidden style={{ flexShrink: 0 }}>
                      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9155" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={`${pctClamped} ${100 - pctClamped}`} transform="rotate(-90 18 18)" />
                      <text x="18" y="21" textAnchor="middle" fontSize="6" fill={color} fontWeight="bold">{pctClamped}%</text>
                    </svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>{s.category}</div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>{formatNumber(s.achieved, 2)} / {formatNumber(s.target, 2)}</div>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pctClamped}%`, background: color, borderRadius: 999, transition: 'width 500ms ease' }} />
                      </div>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '0.95rem', color, flexShrink: 0, minWidth: 38, textAlign: 'right' }}>{pctClamped}%</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Φόρτωση...</div>
        )}

        {/* ── Quick links ── */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14 }}>Γρήγορη πρόσβαση</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {quickLinks.map(item => (
              <Link
                key={item.to}
                to={item.to}
                aria-label={item.label}
                style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 20px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, transition: 'transform 150ms, box-shadow 150ms, background 150ms' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 30px rgba(0,0,0,0.35)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)'; (e.currentTarget as HTMLElement).style.boxShadow = '' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: item.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(0,0,0,0.3)', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'rgba(255,255,255,0.88)' }}>{item.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', marginTop: 4, lineHeight: 1.5 }}>{item.hint}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
