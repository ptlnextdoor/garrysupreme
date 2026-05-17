'use client'

import { useEffect, useState } from 'react'

type Stats = {
  mode: 'file' | 'api' | 'hybrid'
  base_url: string | null
  project: string
  identity: { version?: string; engine?: string; page_count?: number; chunk_count?: number; error?: string }
  brain_stats: { page_count?: number; chunk_count?: number; embedded_count?: number; pages_by_type?: Record<string, number>; error?: string }
  backend_calls: { byTool: Record<string, number>; total: number }
}

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'

export default function GBrainPanel() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [searchResult, setSearchResult] = useState<unknown>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const tick = () => {
      fetch(`${BACKEND}/api/gbrain/stats`)
        .then((r) => r.json())
        .then(setStats)
        .catch(() => {})
    }
    tick()
    const iv = setInterval(tick, 3000)
    return () => clearInterval(iv)
  }, [])

  const runSearch = async () => {
    if (!searchQ.trim()) return
    setSearching(true)
    setSearchResult(null)
    try {
      const r = await fetch(`${BACKEND}/api/gbrain/search`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: searchQ, hybrid: true }),
      })
      setSearchResult(await r.json())
    } catch (err) {
      setSearchResult({ error: String(err) })
    } finally {
      setSearching(false)
    }
  }

  const modeColor =
    stats?.mode === 'hybrid' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' :
    stats?.mode === 'api' ? 'text-blue-400 bg-blue-400/10 border-blue-400/30' :
    'text-gray-500 bg-gray-500/10 border-gray-500/30'

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">GBrain</h2>
        <span className={`text-[10px] font-mono uppercase border rounded px-2 py-0.5 ${modeColor}`}>
          mode: {stats?.mode ?? '...'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-2 py-2">
          <div className="text-xl font-bold text-white">{stats?.brain_stats?.page_count ?? '—'}</div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Pages</div>
        </div>
        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-2 py-2">
          <div className="text-xl font-bold text-white">{stats?.brain_stats?.chunk_count ?? '—'}</div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Chunks</div>
        </div>
        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-2 py-2">
          <div className="text-xl font-bold text-[#F97316]">{stats?.backend_calls?.total ?? 0}</div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500">MCP Calls</div>
        </div>
      </div>

      {stats?.backend_calls && stats.backend_calls.total > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Tool Calls</span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(stats.backend_calls.byTool)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([tool, n]) => (
                <span key={tool} className="text-[10px] font-mono bg-[#0F0F0F] border border-[#2A2A2A] rounded px-2 py-0.5 text-gray-300">
                  {tool}: <span className="text-[#F97316]">{n}</span>
                </span>
              ))}
          </div>
        </div>
      )}

      {stats?.identity?.version && (
        <div className="text-[10px] text-gray-600 font-mono border-t border-[#2A2A2A] pt-2">
          GBrain v{stats.identity.version} · {stats.identity.engine} · project: {stats.project}
        </div>
      )}

      <div className="flex flex-col gap-1.5 border-t border-[#2A2A2A] pt-3">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Hybrid RAG Query</span>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') runSearch() }}
            placeholder="organic coffee under $20"
            className="flex-1 text-xs bg-[#0F0F0F] border border-[#2A2A2A] rounded px-2 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#F97316]"
          />
          <button
            onClick={runSearch}
            disabled={searching || !searchQ.trim()}
            className="text-xs bg-[#F97316] hover:bg-[#F97316]/80 disabled:bg-gray-700 text-white rounded px-3 py-1.5 font-medium"
          >
            {searching ? '...' : 'Ask'}
          </button>
        </div>
        {searchResult !== null && (
          <pre className="text-[10px] text-gray-400 bg-[#0F0F0F] border border-[#2A2A2A] rounded p-2 max-h-32 overflow-auto font-mono">
            {JSON.stringify(searchResult, null, 2).slice(0, 800)}
          </pre>
        )}
      </div>
    </div>
  )
}
