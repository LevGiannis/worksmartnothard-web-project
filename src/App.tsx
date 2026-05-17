import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import MainPage from './pages/MainPage'
import TasksPage from './pages/TasksPage'
import HistoryPage from './pages/HistoryPage'
import AddEntryPage from './pages/AddEntryPage'
import AddGoalPage from './pages/AddGoalPage'
import StatsPage from './pages/StatsPage'
import ProfilePage from './pages/ProfilePage'
import PendingPage from './pages/PendingPage'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  const location = useLocation()

  return (
    <div className="page-shell font-sans text-slate-100">
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
        </Routes>
      </main>
    </div>
  )
}
