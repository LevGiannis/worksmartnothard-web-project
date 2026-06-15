import React, { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import MainPage from './pages/MainPage'
import TasksPage from './pages/TasksPage'
import HistoryPage from './pages/HistoryPage'
import AddEntryPage from './pages/AddEntryPage'
import AddGoalPage from './pages/AddGoalPage'
import StatsPage from './pages/StatsPage'
import ProfilePage from './pages/ProfilePage'
import PendingPage from './pages/PendingPage'
import ManagerPage from './pages/ManagerPage'
import ErrorBoundary from './components/ErrorBoundary'
import { useScheduledBackup } from './hooks/useScheduledBackup'
import BackupCountdown from './components/BackupCountdown'

const THEME_KEY = 'ws_app_theme'
type ThemeKey = 'midnight' | 'amethyst' | 'emerald' | 'slate'

const THEME_CONFIGS: Record<ThemeKey, { bg: string; text: string; panelBg: string; panelBorder: string }> = {
  midnight: {
    bg: '#0f1419',
    text: '#e8eef7',
    panelBg: 'linear-gradient(180deg, rgba(15,30,60,0.6), rgba(10,20,40,0.5))',
    panelBorder: 'rgba(100,200,255,0.1)',
  },
  amethyst: {
    bg: '#1a0f2e',
    text: '#f0e8ff',
    panelBg: 'linear-gradient(180deg, rgba(55,20,100,0.5), rgba(40,10,80,0.4))',
    panelBorder: 'rgba(186,85,255,0.12)',
  },
  emerald: {
    bg: '#e8eef5',
    text: '#2d3e50',
    panelBg: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(240,245,250,0.6))',
    panelBorder: 'rgba(100,120,140,0.15)',
  },
  slate: {
    bg: '#111820',
    text: '#e5e7eb',
    panelBg: 'linear-gradient(180deg, rgba(30,40,55,0.6), rgba(20,30,45,0.5))',
    panelBorder: 'rgba(156,163,175,0.12)',
  },
}

export const ThemeContext = React.createContext<{
  theme: ThemeKey
  setTheme: (t: ThemeKey) => void
}>({ theme: 'midnight', setTheme: () => {} })

export default function App() {
  useScheduledBackup()
  const [theme, setThemeState] = useState<ThemeKey>(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY)
      return (stored as ThemeKey) || 'midnight'
    } catch {
      return 'midnight'
    }
  })

  const setTheme = (t: ThemeKey) => {
    setThemeState(t)
    localStorage.setItem(THEME_KEY, t)
  }

  useEffect(() => {
    const cfg = THEME_CONFIGS[theme]
    document.documentElement.style.background = cfg.bg
    document.documentElement.style.color = cfg.text

    const styleId = 'ws-global-theme'
    let style = document.getElementById(styleId) as HTMLStyleElement
    if (!style) {
      style = document.createElement('style')
      style.id = styleId
      document.head.appendChild(style)
    }

    style.textContent = `
      body { background: ${cfg.bg} !important; color: ${cfg.text} !important; }
      .page-content { background: ${cfg.bg} !important; color: ${cfg.text} !important; }
      .page-shell { background: ${cfg.bg} !important; }
      .panel-card { background: ${cfg.panelBg} !important; border-color: ${cfg.panelBorder} !important; }
      .panel-card:hover { box-shadow: 0 12px 32px rgba(0,0,0,0.4) !important; }
    `
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className="page-shell font-sans text-slate-100">
        <BackupCountdown />
        <main className="container-wide">
          <Routes>
            <Route path="/" element={<ErrorBoundary><MainPage /></ErrorBoundary>} />
            <Route path="/tasks" element={<ErrorBoundary><TasksPage /></ErrorBoundary>} />
            <Route path="/history" element={<ErrorBoundary><HistoryPage /></ErrorBoundary>} />
            <Route path="/add-entry" element={<ErrorBoundary><AddEntryPage /></ErrorBoundary>} />
            <Route path="/add-goal" element={<ErrorBoundary><AddGoalPage /></ErrorBoundary>} />
            <Route path="/stats" element={<ErrorBoundary><StatsPage /></ErrorBoundary>} />
            <Route path="/profile" element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />
            <Route path="/pending" element={<ErrorBoundary><PendingPage /></ErrorBoundary>} />
            <Route path="/manager" element={<ErrorBoundary><ManagerPage /></ErrorBoundary>} />
          </Routes>
        </main>
      </div>
    </ThemeContext.Provider>
  )
}
