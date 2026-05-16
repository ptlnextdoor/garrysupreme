'use client'

import { useState } from 'react'
import type { PendingFact } from '../lib/types'
import { approveFact, rejectFact } from '../lib/api'

const MOCK_FACTS: PendingFact[] = [
  {
    id: 'fact-001',
    phone: '+11234567890',
    callId: 'demo-001',
    fact: 'Prefers oat milk in all drinks',
    evidence: '"Can I get oat milk instead? I never do dairy."',
    confidence: 0.94,
    category: 'dietary',
  },
  {
    id: 'fact-002',
    phone: '+11234567890',
    callId: 'demo-001',
    fact: 'Orders for her mom regularly — chai with extra spice',
    evidence: '"And can I add a chai latte for my mom, she likes it extra spiced."',
    confidence: 0.78,
    category: 'household',
  },
]

const CATEGORY_COLORS: Record<PendingFact['category'], string> = {
  dietary: 'text-blue-400 bg-blue-900/20 border-blue-800/30',
  preference: 'text-purple-400 bg-purple-900/20 border-purple-800/30',
  household: 'text-emerald-400 bg-emerald-900/20 border-emerald-800/30',
  behavioral: 'text-yellow-400 bg-yellow-900/20 border-yellow-800/30',
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = value >= 0.85 ? 'bg-emerald-400' : value >= 0.6 ? 'bg-yellow-400' : 'bg-red-400'
  const label = value >= 0.85 ? 'text-emerald-400' : value >= 0.6 ? 'text-yellow-400' : 'text-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-mono ${label}`}>{pct}%</span>
    </div>
  )
}

export default function MemoryReview({ facts = MOCK_FACTS }: { facts?: PendingFact[] }) {
  const [local, setLocal] = useState<PendingFact[]>(facts)
  const [dismissing, setDismissing] = useState<Set<string>>(new Set())

  // sync with SSE prop changes (new facts arriving)
  const combined = [
    ...local.filter((f) => !facts.find((x) => x.id === f.id)),
    ...facts,
  ]

  async function handle(factId: string, action: 'approve' | 'reject') {
    setDismissing((prev) => new Set([...Array.from(prev), factId]))
    try {
      if (action === 'approve') {
        await approveFact(factId)
      } else {
        await rejectFact(factId)
      }
      setLocal((prev) => prev.filter((f) => f.id !== factId))
    } catch {
      setDismissing((prev) => {
        const next = new Set(prev)
        next.delete(factId)
        return next
      })
    }
  }

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-3 overflow-y-auto max-h-[70vh]">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 sticky top-0 bg-[#1A1A1A] pb-2">
        Memory Review{combined.length > 0 && (
          <span className="ml-2 bg-[#F97316] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
            {combined.length}
          </span>
        )}
      </h2>

      {combined.length === 0 ? (
        <div className="text-center py-10 flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#2A2A2A] flex items-center justify-center text-gray-600">
            ✓
          </div>
          <p className="text-sm text-gray-600">No pending memories</p>
        </div>
      ) : (
        combined.map((fact) => (
          <div
            key={fact.id}
            className={`bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-4 py-3 flex flex-col gap-2.5 ${
              dismissing.has(fact.id) ? 'opacity-40 pointer-events-none' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-white leading-snug">{fact.fact}</p>
              <span
                className={`text-[10px] border rounded-full px-2 py-0.5 flex-shrink-0 ${
                  CATEGORY_COLORS[fact.category]
                }`}
              >
                {fact.category}
              </span>
            </div>

            <p className="text-xs text-gray-500 italic border-l-2 border-[#2A2A2A] pl-2">
              {fact.evidence}
            </p>

            <ConfidenceBar value={fact.confidence} />

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handle(fact.id, 'approve')}
                className="flex-1 text-xs font-semibold bg-emerald-900/30 hover:bg-emerald-800/40 text-emerald-400 border border-emerald-800/40 rounded-lg py-1.5 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => handle(fact.id, 'reject')}
                className="flex-1 text-xs font-semibold bg-red-900/20 hover:bg-red-800/30 text-red-400 border border-red-800/30 rounded-lg py-1.5 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
