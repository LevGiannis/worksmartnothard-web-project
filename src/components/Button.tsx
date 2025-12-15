import React from 'react'
// lightweight class merging without external deps

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
}

export default function Button({ variant = 'primary', className, children, ...rest }: ButtonProps){
  const base = 'inline-flex items-center justify-center rounded-md font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
  const variants: Record<string,string> = {
    primary: 'bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 shadow-sm focus-visible:ring-violet-300',
    ghost: 'bg-transparent border border-violet-700 text-violet-200 px-3 py-1 hover:bg-white/3 focus-visible:ring-violet-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white px-3 py-1 focus-visible:ring-red-300'
  }
  const classes = [base, variants[variant], className].filter(Boolean).join(' ')
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}
