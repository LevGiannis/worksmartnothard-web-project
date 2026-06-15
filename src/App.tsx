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
    const THEME_CONFIGS: Record<ThemeKey, { bg: string }> = {
      midnight: { bg: '#0f1419' },
      amethyst: { bg: '#1a0f2e' },
      emerald: { bg: '#0f1f19' },
      slate: { bg: '#111820' },
    }
    document.documentElement.style.background = THEME_CONFIGS[theme].bg
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
