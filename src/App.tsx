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
import DataLoadPrompt from './components/DataLoadPrompt'

const THEME_KEY = 'ws_app_theme'
type ThemeKey = 'midnight' | 'amethyst' | 'emerald' | 'slate' | 'ocean' | 'sunset' | 'forest' | 'coral' | 'lightgrey' | 'rosegold'

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
    bg: '#2a2a2a',
    text: '#e8e8e8',
    panelBg: 'linear-gradient(180deg, rgba(50,50,50,0.85), rgba(40,40,40,0.8))',
    panelBorder: 'rgba(200,200,200,0.25)',
  },
  slate: {
    bg: '#111820',
    text: '#e5e7eb',
    panelBg: 'linear-gradient(180deg, rgba(30,40,55,0.6), rgba(20,30,45,0.5))',
    panelBorder: 'rgba(156,163,175,0.12)',
  },
  ocean: {
    bg: '#0a1628',
    text: '#e0f2ff',
    panelBg: 'linear-gradient(180deg, rgba(10,35,70,0.6), rgba(5,25,50,0.5))',
    panelBorder: 'rgba(34,211,238,0.15)',
  },
  sunset: {
    bg: '#1f1410',
    text: '#ffefd5',
    panelBg: 'linear-gradient(180deg, rgba(80,35,10,0.5), rgba(60,25,5,0.4))',
    panelBorder: 'rgba(251,146,60,0.15)',
  },
  forest: {
    bg: '#1a0a0a',
    text: '#fff0f0',
    panelBg: 'linear-gradient(180deg, rgba(200,0,0,0.15), rgba(150,0,0,0.12))',
    panelBorder: 'rgba(230,0,0,0.3)',
  },
  coral: {
    bg: '#1f0f18',
    text: '#fdd7e4',
    panelBg: 'linear-gradient(180deg, rgba(80,20,40,0.5), rgba(60,10,30,0.4))',
    panelBorder: 'rgba(244,114,182,0.15)',
  },
  lightgrey: {
    bg: '#374151',
    text: '#f3f4f6',
    panelBg: 'linear-gradient(180deg, rgba(75,85,99,0.7), rgba(55,65,81,0.6))',
    panelBorder: 'rgba(156,163,175,0.15)',
  },
  rosegold: {
    bg: '#2d1a1e',
    text: '#fce8ec',
    panelBg: 'linear-gradient(180deg, rgba(181,131,141,0.2), rgba(140,90,100,0.15))',
    panelBorder: 'rgba(181,131,141,0.25)',
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
        <DataLoadPrompt />
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
