import React, {useEffect, useState} from 'react'
import { loadAllTasks, toggleTaskDone, saveTask } from '../services/storage'
import PageHeader from '../components/PageHeader'

export default function TasksPage(){
  const [tasks, setTasks] = useState<any[]>([])
  useEffect(()=>{
    loadAllTasks().then(t=> setTasks(t))
  }, [])

  const toggle = async (id:string)=>{
    await toggleTaskDone(id)
    setTasks(await loadAllTasks())
  }

  return (
    <div style={{padding:'28px 16px', paddingTop:'220px'}}>
      <PageHeader
        title="Tasks"
        subtitle="Διαχείριση καθημερινών εργασιών"
        breadcrumb="Tasks"
      />

      <div style={{maxWidth:1400, margin:'0 auto', width:'100%'}}>
        <div className="panel-card" style={{marginBottom:20}}>
          <div className="flex items-center justify-between" style={{gap:16, flexWrap:'wrap'}}>
            <div>
              <h2 className="heading-xl font-extrabold" style={{fontSize:'1.3rem', margin:0}}>Λίστα εργασιών</h2>
              <div className="muted" style={{marginTop:4}}>Παρακολούθησε και ενημέρωσε τις εργασίες της ομάδας.</div>
            </div>
            <button className="btn flex items-center gap-2" onClick={async ()=>{ await saveTask({title: 'New Task'}); setTasks(await loadAllTasks()) }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Add sample
            </button>
          </div>
        </div>

        <div className="grid gap-2">
          {tasks.map(t=> (
            <div key={t.id} className="panel-card flex items-center justify-between" style={{padding:'16px 18px'}}>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={t.done} onChange={()=>toggle(t.id)} className="h-4 w-4 accent-primary-600" />
                <span className={t.done ? 'line-through text-gray-500' : ''}>{t.title}</span>
              </label>
              <div className="text-sm text-gray-400">{t.dueDate || ''}</div>
            </div>
          ))}
          {tasks.length === 0 && <div className="panel-card muted">Δεν υπάρχουν εργασίες ακόμα.</div>}
        </div>
      </div>
    </div>
  )
}
