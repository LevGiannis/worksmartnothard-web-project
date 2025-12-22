import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useProgress from '../hooks/useProgress'
import { loadEntriesForMonth } from '../services/storage'
// bonus calculation removed — no imports
import { DailyEntry } from '../services/storage'
import PageHeader from '../components/PageHeader'
import { safeLocalStorageGet } from '../utils/safeLocalStorage'

export default function MainPage(){
  // default to the shipped standout hero so the change is visible immediately
  const baseUrl = (import.meta as any).env?.BASE_URL || '/'
  const basePrefix = String(baseUrl).endsWith('/') ? String(baseUrl) : String(baseUrl) + '/'
  const withBase = (p: string) => (p.startsWith('/') ? basePrefix + p.slice(1) : basePrefix + p)

  const [heroUrl, setHeroUrl] = useState<string | null>(() => withBase('hero4.svg'))
  const { progress: stats, loading, month: currentMonth, year: currentYear } = useProgress()

  const MONTH_NAMES_GR = ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος','Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος']
  const displayedMonth = (typeof currentMonth === 'number' && currentMonth >=1 && currentMonth <=12) ? MONTH_NAMES_GR[currentMonth - 1] : MONTH_NAMES_GR[new Date().getMonth()]

  const totalPct = (() => {
    const items = stats || []
    if (items.length === 0) return 0
    const sumPct = items.reduce((s, c) => {
      const pct = c.target > 0 ? (c.achieved / c.target) * 100 : 0
      return s + pct
    }, 0)
    const avg = sumPct / items.length
    const rounded = Math.round(avg)
    return Math.max(0, Math.min(100, rounded))
  })()
  useEffect(() => {
    let mounted = true
  const candidates = [
    withBase('hero.jpg'),
    withBase('hero1.jpg'),
    withBase('hero2.jpg'),
    withBase('hero3.jpg'),
    withBase('hero4.svg'),
    withBase('hero1.svg'),
    withBase('hero2.svg'),
    withBase('hero3.svg'),
  ]

    ;(async function pickFirstAvailable(){
      for (const url of candidates){
        // try to load image
        // resolve true when loaded, false on error
        const ok = await new Promise<boolean>(res => {
          const img = new Image()
          img.onload = () => res(true)
          img.onerror = () => res(false)
          img.src = url
        })
        if (ok && mounted){
          setHeroUrl(url)
          break
        }
      }
    })()

    return () => { mounted = false }
  }, [])

  // bonus calculation removed — no runtime logic here

  // stats are provided by useProgress() for the current month

  const quickLinks = [
    {
      to: '/add-goal',
      label: 'Προσθήκη στόχου',
      hint: 'Ρύθμισε τους στόχους της ομάδας',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v20M2 12h20" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      )
    },
    {
      to: '/add-entry',
      label: 'Καταχώρηση Παραγωγής',
      hint: 'Πρόσθεσε νέα εγγραφή παραγωγής',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7h18M7 3v4M17 3v4M5 11h14v8H5z" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
      )
    },
    {
      to: '/stats',
      label: 'Στατιστικά',
      hint: 'Γραφήματα και τάσεις προόδου',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3v18h18" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 14v-4M12 18v-8M17 10V6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      )
    },
    {
      to: '/profile',
      label: 'Προφίλ',
      hint: 'Στοιχεία χρήστη και ρυθμίσεις',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="3" stroke="white" strokeWidth="1.4"/><path d="M4 21c1.5-4 6-6 8-6s6.5 2 8 6" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      )
    },
    {
      to: '/pending',
      label: 'Εκρεμότητες',
      hint: 'Παρακολούθηση εκκρεμών ενεργειών',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 8v4l3 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.2"/></svg>
      )
    }
  ]

  const storeLabel = safeLocalStorageGet('ws_user_store') || '—'
  const userFullName = `${safeLocalStorageGet('ws_user_first') || ''} ${safeLocalStorageGet('ws_user_last') || ''}`.trim()

  return (
    <div className="py-12 page-shell" style={{paddingTop: '220px'}}>
      <PageHeader
        title="Αρχική"
        subtitle="Συνοπτική σελίδα — γρήγορη πρόσβαση σε βασικές ενέργειες"
        backTo={null}
      />

  <div className="container-wide" style={{width:'100%'}}>

        {/* Top header card: store info + overall percentage for current month */}
        <div className="panel-card mb-6 header-card" role="region" aria-label="Σύνοψη καταστήματος" style={{padding:'20px 22px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:18,flexWrap:'wrap'}}>
            <div style={{flex:'1 1 260px',minWidth:160}}>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.55)',fontWeight:600,letterSpacing:1.6,textTransform:'uppercase'}}>Κατάστημα</div>
              <div style={{display:'flex',alignItems:'baseline',gap:12,marginTop:8}}>
                <div style={{fontSize:22,fontWeight:900,color:'#ffffff',lineHeight:1}}>{storeLabel}</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.70)',fontWeight:600,letterSpacing:0.6,textTransform:'uppercase'}}>{userFullName}</div>
              </div>
            </div>

            <div style={{flex:'0 1 auto',display:'flex',alignItems:'center',justifyContent:'center',minWidth:220}}>
              <div style={{display:'inline-flex',alignItems:'center',gap:14,padding:'8px 22px',borderRadius:999,background:'linear-gradient(90deg,#5f3ee8 0%, #ff5f7a 100%)',color:'#fff',fontWeight:700,letterSpacing:2,textTransform:'uppercase',boxShadow:'0 10px 30px rgba(95,62,232,0.14)'}}>WORK SMART <span style={{opacity:0.95,fontWeight:600,letterSpacing:0.8,fontSize:12}}>NOT HARD</span></div>
            </div>
          </div>
        </div>

        {/* Hero banner — will use the first existing image among /hero.jpg, /hero1.jpg, /hero2.jpg, /hero3.jpg */}
        <div
          className={`hero-banner panel-card mb-8`}
          role="region"
          aria-label="Η αποστολή της εφαρμογής"
          // use a clean gradient background instead of the shipped hero image to avoid watermark text
          style={{position:'relative', overflow:'hidden', background: 'linear-gradient(180deg, #0b0b1a 0%, #120524 100%)'}}
        >
          {/* deeper dark overlay to improve contrast / depth */}
          <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, rgba(6,6,14,0.62), rgba(6,6,18,0.82))',pointerEvents:'none'}} aria-hidden />

          <div className="hero-content" style={{display:'flex',gap:28,alignItems:'center',width:'100%',position:'relative',zIndex:2,padding:'36px'}}>
            <div style={{flex:1, zIndex:2,maxWidth:820}} className="hero-left">
              <h1 className="heading-xl font-extrabold" style={{fontSize: '2.2rem', lineHeight:1.06, marginBottom:10, color:'#fff', textShadow:'0 8px 30px rgba(0,0,0,0.62)'}}>Θέσε στόχους. Παρακολούθησε πρόοδο.</h1>
              <p className="mt-2 muted" style={{maxWidth:720,color:'rgba(255,255,255,0.88)',fontSize:14,marginTop:6}}>Μηνιαία παρακολούθηση της ομάδας σε ένα γρήγορο, καθαρό περιβάλλον.</p>

              <div style={{marginTop:22, display:'flex', gap:14, alignItems:'center'}}>
                <Link to="/add-goal" className="btn" aria-label="Προσθήκη στόχου" style={{padding:'12px 20px', borderRadius:12, background:'linear-gradient(90deg,#6b3aed,#8f5eff)', color:'#fff', boxShadow:'0 10px 30px rgba(99,66,237,0.18)', fontWeight:700}}>Προσθήκη στόχου</Link>
                <Link to="/stats" className="btn-ghost" aria-label="Προβολή στατιστικών" style={{padding:'10px 18px', borderRadius:12, border:'1px solid rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.9)'}}>Προβολή στατιστικών</Link>
              </div>
            </div>

            <div style={{width:360, flex:'0 0 360px', zIndex:2}} className="panel-card hero-cta" aria-hidden>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                <div style={{flex:1,minWidth:0}}>
                  <div className="uppercase-muted" style={{fontSize:12,color:'rgba(255,255,255,0.65)',fontWeight:600,letterSpacing:1.2}}>Τρέχων μήνας</div>
                  <div style={{fontWeight:800,fontSize:22,marginTop:8,color:'#fff'}}>{displayedMonth}</div>
                </div>

                <div aria-hidden style={{width:68,height:68,borderRadius:16,background:'linear-gradient(135deg,#7c3aed,#ff6b8a)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:900,fontSize:18,boxShadow:'0 20px 60px rgba(12,8,30,0.6)'}}>{totalPct}%</div>
              </div>

              <div style={{height:12,background:'rgba(255,255,255,0.04)',borderRadius:999,marginTop:16,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${totalPct}%`,background:'linear-gradient(90deg,#7c3aed,#ff6b8a)'}} />
              </div>
              <div style={{marginTop:12,fontSize:14,color:'rgba(255,255,255,0.82)'}}>Κάρτα προεπισκόπησης: τα βασικά σου metrics με μια ματιά.</div>
              {/* bonus display removed */}
            </div>

            {/* Decorative SVG - subtle floating shape to the top-right */}
            <svg width="220" height="220" viewBox="0 0 220 220" fill="none" style={{position:'absolute',right:24,top:-24,opacity:0.10,pointerEvents:'none',zIndex:1}} aria-hidden>
              <defs>
                <linearGradient id="g1" x1="0" x2="1">
                  <stop offset="0" stopColor="#7c3aed" stopOpacity="0.9" />
                  <stop offset="1" stopColor="#ff6b8a" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <path d="M10 110 C40 10, 180 10, 210 110 C180 210, 40 210, 10 110 Z" fill="url(#g1)" />
            </svg>
          </div>
        </div>

        {/* Monthly stats (per-category percentage bars) */}
        {stats && stats.length > 0 && (
          <section className="panel-card mb-6 stats-panel" aria-label="Στατιστικά μήνα">
            <h2 className="text-lg font-semibold mb-3">Στατιστικά (τρέχων μήνας)</h2>
            <div>
              {stats.map((s) => {
                const pct = s.target > 0 ? Math.round((s.achieved / s.target) * 100) : 0
                const pctClamped = Math.max(0, Math.min(100, pct))
                return (
                  <div key={s.category} className="stat-row">
                    <div className="stat-donut">
                      <svg width="56" height="56" viewBox="0 0 36 36" className="donut-shadow" aria-hidden>
                        <circle className="donut-bg" cx="18" cy="18" r="15.9155" fill="none" strokeWidth="3" />
                        <circle className="donut-fg" cx="18" cy="18" r="15.9155" fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${pctClamped} ${100 - pctClamped}`} transform="rotate(-90 18 18)" />
                        <text x="18" y="20" textAnchor="middle" fontSize="6.5" fill="#fff">{pctClamped}%</text>
                      </svg>
                    </div>

                    <div className="stat-content">
                      <div className="stat-label">{s.category}</div>
                      <div className="stat-sub">{s.achieved} / {s.target} ({pctClamped}%)</div>
                      <div className="stat-bar" role="progressbar" aria-valuenow={pctClamped} aria-valuemin={0} aria-valuemax={100}>
                        <div className="fill" style={{ width: `${pctClamped}%` }} />
                      </div>
                    </div>
                    <div className="stat-percent">{pctClamped}%</div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <div className="tile-grid" role="navigation" aria-label="Γρήγορες ενέργειες">
          {quickLinks.map(item => (
            <Link key={item.to} to={item.to} className="panel-tile" aria-label={item.label}>
              <div className="glass-icon" aria-hidden="true">
                {item.icon}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <div className="font-semibold">{item.label}</div>
                <div className="muted text-xs" style={{maxWidth:220}}>{item.hint}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
