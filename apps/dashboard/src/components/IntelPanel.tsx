'use client'

import { useEffect, useState } from 'react'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'

type Intel = {
  source: string
  business: string
  project_id: string | null
  captured: string | null
  content: string
  insights_available: number
}

type InsightHit = {
  matched: string[] | null
  insight: string | null
  all_triggers: number
}

type DeepDive = {
  source: string
  report_type: string
  target: string | null
  generated_at: string | null
  actions_used: number
  chat_id: string | null
  slug: string
  content: string
  length: number
  error?: string
}

export default function IntelPanel() {
  const [intel, setIntel] = useState<Intel | null>(null)
  const [request, setRequest] = useState('')
  const [hit, setHit] = useState<InsightHit | null>(null)
  const [loading, setLoading] = useState(false)
  const [deepDive, setDeepDive] = useState<DeepDive | null>(null)
  const [showFullReport, setShowFullReport] = useState(false)

  useEffect(() => {
    fetch(`${BACKEND}/api/intel`)
      .then((r) => r.json())
      .then(setIntel)
      .catch(() => {})
    fetch(`${BACKEND}/api/intel/deep-dive`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setDeepDive(d) })
      .catch(() => {})
  }, [])

  const tryInsight = async () => {
    if (!request.trim()) return
    setLoading(true)
    setHit(null)
    try {
      const r = await fetch(`${BACKEND}/api/intel/insight`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ request }),
      })
      setHit(await r.json())
    } catch (err) {
      setHit({ matched: null, insight: `error: ${String(err)}`, all_triggers: 0 })
    } finally {
      setLoading(false)
    }
  }

  // Parse competitor table out of the markdown content
  const competitors = (intel?.content ?? '')
    .split('\n')
    .filter((l) => /^\|\s+[A-Z]/.test(l) && !/Brand\s+\|\s+Domain/.test(l) && !/^---/.test(l))
    .map((l) => {
      const cells = l.split('|').map((c) => c.trim()).filter(Boolean)
      return { name: cells[0], domain: cells[1] }
    })
    .filter((c) => c.name && c.domain)
    .slice(0, 10)

  // Parse keywords (numbered list)
  const keywords = (intel?.content ?? '')
    .split('\n')
    .filter((l) => /^\d+\.\s+/.test(l))
    .map((l) => l.replace(/^\d+\.\s+/, '').trim())
    .filter(Boolean)
    .slice(0, 15)

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Market Intel</h2>
        <span className="text-[10px] font-mono uppercase border rounded px-2 py-0.5 text-purple-400 bg-purple-400/10 border-purple-400/30">
          🐗 The Hog
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-2 py-2">
          <div className="text-xl font-bold text-white">{competitors.length || '—'}</div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Competitors</div>
        </div>
        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-2 py-2">
          <div className="text-xl font-bold text-white">{keywords.length || '—'}</div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Keywords</div>
        </div>
        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-2 py-2">
          <div className="text-xl font-bold text-[#F97316]">{intel?.insights_available ?? 0}</div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Talking Points</div>
        </div>
      </div>

      {competitors.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Competitors</span>
          <div className="flex flex-wrap gap-1">
            {competitors.map((c) => (
              <span key={c.domain} className="text-[10px] font-mono bg-[#0F0F0F] border border-[#2A2A2A] rounded px-2 py-0.5 text-gray-300">
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {keywords.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Tracked Keywords</span>
          <div className="flex flex-wrap gap-1">
            {keywords.slice(0, 6).map((k) => (
              <span key={k} className="text-[10px] bg-purple-400/10 border border-purple-400/20 rounded-full px-2 py-0.5 text-purple-300">
                {k}
              </span>
            ))}
            {keywords.length > 6 && (
              <span className="text-[10px] text-gray-600">+{keywords.length - 6} more</span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5 border-t border-[#2A2A2A] pt-3">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Try a customer request</span>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') tryInsight() }}
            placeholder="how does Costco compare to Sam's Club?"
            className="flex-1 text-xs bg-[#0F0F0F] border border-[#2A2A2A] rounded px-2 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-400"
          />
          <button
            onClick={tryInsight}
            disabled={loading || !request.trim()}
            className="text-xs bg-purple-500 hover:bg-purple-500/80 disabled:bg-gray-700 text-white rounded px-3 py-1.5 font-medium"
          >
            {loading ? '...' : 'Match'}
          </button>
        </div>
        {hit && (
          <div className="text-[11px] bg-[#0F0F0F] border border-[#2A2A2A] rounded p-2 mt-1">
            {hit.matched ? (
              <>
                <div className="text-[9px] text-purple-400 mb-1 uppercase tracking-wider">
                  Matched: {hit.matched.join(', ')}
                </div>
                <div className="text-gray-300">{hit.insight}</div>
              </>
            ) : (
              <div className="text-gray-500 italic">No keyword match — agent speaks freely.</div>
            )}
          </div>
        )}
      </div>

      {deepDive && (
        <div className="flex flex-col gap-2 border-t border-[#2A2A2A] pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">
              🔬 Deep Research
            </span>
            <span className="text-[9px] font-mono uppercase border rounded px-1.5 py-0.5 text-purple-300 bg-purple-400/10 border-purple-400/30">
              Hog Agent · {deepDive.actions_used} actions
            </span>
          </div>
          <div className="bg-[#0F0F0F] border border-purple-400/20 rounded-lg p-3">
            <div className="text-[11px] text-white font-semibold mb-1">
              {deepDive.report_type === 'competitor_deep_dive' ? 'Competitor Deep Dive: ' : ''}
              {deepDive.target ?? 'Report'}
            </div>
            <div className="text-[10px] text-gray-500 font-mono mb-2">
              {deepDive.generated_at && new Date(deepDive.generated_at).toLocaleString()}
              {' · '}
              {(deepDive.length / 1024).toFixed(1)} KB · SpyFu SEO + PPC + LinkedIn + news
            </div>
            <button
              onClick={() => setShowFullReport(!showFullReport)}
              className="text-[10px] text-purple-300 hover:text-purple-200 underline"
            >
              {showFullReport ? '— Hide full report' : '+ Show full report'}
            </button>
            {showFullReport && (
              <pre className="text-[10px] text-gray-300 mt-2 max-h-80 overflow-auto font-mono whitespace-pre-wrap">
                {deepDive.content}
              </pre>
            )}
          </div>
        </div>
      )}

      {intel?.source && (
        <div className="text-[10px] text-gray-600 font-mono border-t border-[#2A2A2A] pt-2">
          {intel.source} {intel.captured && `· captured ${intel.captured}`}
        </div>
      )}
    </div>
  )
}
