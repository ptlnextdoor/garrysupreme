'use client'

import type { Stats } from '../lib/types'

const MOCK_STATS: Stats = {
  activeCalls: 1,
  ordersToday: 7,
  revenueRecovered: 86,
  factsLearned: 12,
}

type StatCardProps = { label: string; value: string | number; accent?: boolean }

function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-6 py-4 flex flex-col gap-1 flex-1">
      <span className="text-xs text-gray-500 uppercase tracking-widest">{label}</span>
      <span className={`text-3xl font-bold ${accent ? 'text-[#F97316]' : 'text-white'}`}>
        {value}
      </span>
    </div>
  )
}

export default function StatsBar({ stats = MOCK_STATS }: { stats?: Stats }) {
  return (
    <div className="flex gap-4 w-full">
      <StatCard label="Active Calls" value={stats.activeCalls} accent={stats.activeCalls > 0} />
      <StatCard label="Orders Today" value={stats.ordersToday} />
      <StatCard label="Revenue Recovered" value={`$${stats.revenueRecovered.toFixed(0)}`} accent />
      <StatCard label="Memories Learned" value={stats.factsLearned} />
    </div>
  )
}
