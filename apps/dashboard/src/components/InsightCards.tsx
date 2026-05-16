'use client'

import { useEffect, useRef, useState } from 'react'
import type { Stats } from '../lib/types'

const MOCK_STATS: Stats = {
  activeCalls: 1,
  ordersToday: 7,
  revenueRecovered: 86,
  factsLearned: 12,
}

function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(target)
  const prev = useRef(target)

  useEffect(() => {
    if (target === prev.current) return
    const start = prev.current
    const delta = target - start
    const startTime = Date.now()

    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      setValue(Math.round(start + delta * progress))
      if (progress < 1) requestAnimationFrame(tick)
      else prev.current = target
    }
    requestAnimationFrame(tick)
  }, [target, duration])

  return value
}

type InsightCardProps = { label: string; value: number; prefix?: string; suffix?: string; accent?: boolean }

function InsightCard({ label, value, prefix = '', suffix = '', accent }: InsightCardProps) {
  const animated = useCountUp(value)
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-5 py-4 flex flex-col gap-1">
      <span className="text-xs text-gray-500 uppercase tracking-widest">{label}</span>
      <span className={`text-2xl font-bold ${accent ? 'text-[#F97316]' : 'text-white'}`}>
        {prefix}{animated}{suffix}
      </span>
    </div>
  )
}

export default function InsightCards({ stats = MOCK_STATS }: { stats?: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <InsightCard label="Revenue Recovered" value={stats.revenueRecovered} prefix="$" accent />
      <InsightCard label="Calls Handled" value={stats.ordersToday} />
      <InsightCard label="Customer Satisfaction" value={94} suffix="%" />
      <InsightCard label="Memories Learned" value={stats.factsLearned} accent />
    </div>
  )
}
