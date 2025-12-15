import React from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import MainPage from './pages/MainPage'
import TasksPage from './pages/TasksPage'
import HistoryPage from './pages/HistoryPage'
import AddEntryPage from './pages/AddEntryPage'
import AddGoalPage from './pages/AddGoalPage'
import StatsPage from './pages/StatsPage'
import ProfilePage from './pages/ProfilePage'
import PendingPage from './pages/PendingPage'

export default function App() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="page-shell font-sans text-slate-100">
      {/* Header removed as requested */}

      <main className="container-wide">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/add-entry" element={<AddEntryPage />} />
          <Route path="/add-goal" element={<AddGoalPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/pending" element={<PendingPage />} />
        </Routes>
      </main>
    </div>
  )
}
