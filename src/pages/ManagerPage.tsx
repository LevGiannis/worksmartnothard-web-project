import React from 'react'
import PageHeader from '../components/PageHeader'

export default function ManagerPage() {
  return (
    <div className="page-content">
      <PageHeader
        title="Manager"
        subtitle="Διαχείριση ομάδας και αναφορές"
        backTo="/"
      />
      <div className="page-inner">
        <div className="panel-card" style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.95rem' }}>
          Σύντομα διαθέσιμο
        </div>
      </div>
    </div>
  )
}
