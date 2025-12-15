import React, {useEffect, useState} from 'react'
import { loadAllEntries } from '../services/storage'
import PageHeader from '../components/PageHeader'

export default function HistoryPage(){
  const [entries, setEntries] = useState<any[]>([])
  useEffect(()=>{
    loadAllEntries().then(e=> setEntries(e))
  }, [])

  return (
    <div style={{padding:'28px 16px', paddingTop:'220px'}}>
      <PageHeader
        title="History"
        subtitle="Χρονολογική λίστα καταχωρήσεων"
        breadcrumb="History"
      />

      <div style={{maxWidth:1400, margin:'0 auto', width:'100%'}}>
        <div className="panel-card" style={{marginBottom:20}}>
          <h2 className="heading-xl font-extrabold" style={{fontSize:'1.3rem', margin:0}}>Καταχωρήσεις</h2>
          <div className="muted" style={{marginTop:4}}>Δες τις πρόσφατες ενέργειες με σειρά αναστροφής.</div>
        </div>

        <div className="grid gap-2">
          {entries.slice().reverse().map(e=> (
            <div key={e.id} className="panel-card flex items-center justify-between" style={{padding:'16px 18px'}}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-primary-50 flex items-center justify-center text-sm font-medium text-primary-700">{(e.category||'E').charAt(0)}</div>
                <div>
                  <div className="font-medium">{e.category || 'Entry'}</div>
                  <div className="text-sm text-gray-500">{new Date(e.date).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="text-sm">{e.points} {e.category === 'Ραντεβού' ? '€' : 'pts'}</div>
            </div>
          ))}
          {entries.length === 0 && <div className="panel-card muted">Δεν υπάρχουν καταχωρήσεις.</div>}
        </div>
      </div>
    </div>
  )
}
