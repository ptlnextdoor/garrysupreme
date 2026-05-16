'use client'

import { useEffect, useState } from 'react'
import type { ActiveCall } from '../lib/types'

const MOCK_CALLS: ActiveCall[] = [
  {
    callId: 'demo-001',
    phone: '+11234567890',
    customerName: 'Aarya',
    startedAt: Date.now() - 45000,
    status: 'Recommending...',
  },
]

function CallDuration({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - startedAt) / 1000))

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => clearInterval(id)
  }, [startedAt])

  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return <span className="text-xs text-gray-400 font-mono">{m}:{String(s).padStart(2, '0')}</span>
}

export default function ActiveCalls({ calls = MOCK_CALLS }: { calls?: ActiveCall[] }) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Active Calls</h2>
      {calls.length === 0 ? (
        <p className="text-sm text-gray-600 text-center py-6">No active calls</p>
      ) : (
        calls.map((call) => (
          <div
            key={call.callId}
            className="flex items-center justify-between bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-4 py-3"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-white">{call.customerName}</span>
              <span className="text-xs text-gray-500">···{call.phone.slice(-4)}</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xs text-[#F97316]">{call.status}</span>
              <CallDuration startedAt={call.startedAt} />
            </div>
          </div>
        ))
      )}
    </div>
  )
}
