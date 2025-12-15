import React, {useEffect, useState} from 'react'

export default function DarkToggle(){
  const [dark, setDark] = useState<boolean>(() => {
    try{
      const v = localStorage.getItem('theme')
      if(v) return v === 'dark'
      // system preference
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    }catch(e){ return false }
  })

  useEffect(()=>{
    if(dark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    try{ localStorage.setItem('theme', dark ? 'dark' : 'light') }catch(e){}
  }, [dark])

  return (
    <button aria-pressed={dark} onClick={()=> setDark(d => !d)} className="btn-ghost">
      {dark ? (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor"/></svg>
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      )}
    </button>
  )
}
