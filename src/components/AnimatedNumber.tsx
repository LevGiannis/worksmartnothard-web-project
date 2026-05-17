import React, { useEffect, useState } from 'react'
import { formatNumber, roundNumber } from '../utils/formatNumber'

export default function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const from = v
    const dur = 600
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const nextRaw = from + (value - from) * p
      const next = decimals > 0 ? roundNumber(nextRaw, decimals) : Math.round(nextRaw)
      setV(next)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals])
  return <span className="kpi-value">{formatNumber(v, decimals > 0 ? decimals : 0)}</span>
}
