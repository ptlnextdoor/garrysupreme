'use client'

import { useSSE } from '../hooks/useSSE'
import StatsBar from '../components/StatsBar'
import ActiveCalls from '../components/ActiveCalls'
import OrderFeed from '../components/OrderFeed'
import CustomerPanel from '../components/CustomerPanel'
import MemoryReview from '../components/MemoryReview'
import InsightCards from '../components/InsightCards'
import GBrainPanel from '../components/GBrainPanel'
import IntelPanel from '../components/IntelPanel'

export default function Dashboard() {
  const { activeCalls, recentOrders, pendingFacts, stats } = useSSE()

  return (
    <div className="min-h-screen bg-[#0F0F0F] p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Pulse <span className="text-[#F97316]">·</span> Costco Wholesale
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">AI Voice Concierge — Live Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>

      {/* Stats top bar */}
      <StatsBar stats={stats} />

      {/* Main 3-column grid */}
      <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">

        {/* Left col: Active Calls + Customer Profile + Intel */}
        <div className="flex flex-col gap-4">
          <ActiveCalls calls={activeCalls} />
          <CustomerPanel />
          <IntelPanel />
        </div>

        {/* Center col: Order Feed */}
        <OrderFeed orders={recentOrders} />

        {/* Right col: GBrain status + Memory Review + Insight Cards */}
        <div className="flex flex-col gap-4">
          <GBrainPanel />
          <MemoryReview facts={pendingFacts} />
          <InsightCards stats={stats} />
        </div>

      </div>
    </div>
  )
}
