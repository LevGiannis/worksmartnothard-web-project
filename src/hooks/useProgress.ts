import { useEffect, useState } from 'react'
import { getProgressForMonth, loadEntriesForMonth } from '../services/storage'
import type { CategoryProgress } from '../services/storage'

export default function useProgress(year?:number, month?:number){
  const now = new Date()
  const y = year || now.getFullYear()
  const m = month || (now.getMonth()+1)
  const [progress, setProgress] = useState<CategoryProgress[]>([])
  // monthBonus removed — bonus calculation has been deleted
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    let mounted = true
    setLoading(true)
    Promise.all([getProgressForMonth(y,m), loadEntriesForMonth(y,m)])
      .then(([p, entries]) => {
        if(!mounted) return
        setProgress(p)
      }).finally(()=>{ if(mounted) setLoading(false) })
    return ()=>{ mounted = false }
  }, [y,m])

  return { progress, loading, year: y, month: m }
}
