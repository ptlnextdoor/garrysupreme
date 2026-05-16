'use client'

import { useEffect, useRef, useState } from 'react'
import type { SSEState, ActiveCall, RecentOrder, PendingFact, Stats } from '../lib/types'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'

const initialStats: Stats = {
  activeCalls: 0,
  ordersToday: 0,
  revenueRecovered: 0,
  factsLearned: 0,
}

export function useSSE(): SSEState {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [pendingFacts, setPendingFacts] = useState<PendingFact[]>([])
  const [stats, setStats] = useState<Stats>(initialStats)

  const esRef = useRef<EventSource | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Seed active calls on mount from REST endpoint (covers calls in progress before connect)
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/calls/active`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { calls?: ActiveCall[] } | null) => {
        if (data?.calls?.length) {
          setActiveCalls(data.calls)
          setStats((s) => ({ ...s, activeCalls: data.calls!.length }))
        }
      })
      .catch(() => { /* backend may not be up yet — SSE will catch new calls */ })
  }, [])

  useEffect(() => {
    function connect() {
      const es = new EventSource(`${BACKEND_URL}/api/events`)
      esRef.current = es

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)
          handleEvent(event)
        } catch {
          // malformed event — ignore
        }
      }

      es.onerror = () => {
        es.close()
        reconnectTimer.current = setTimeout(connect, 2000)
      }
    }

    function handleEvent(event: Record<string, unknown>) {
      switch (event.type) {
        case 'call_started':
          setActiveCalls((prev) => [
            ...prev,
            {
              callId: event.callId as string,
              phone: event.phone as string,
              customerName: event.customerName as string,
              startedAt: Date.now(),
              status: 'Connected',
            },
          ])
          setStats((s) => ({ ...s, activeCalls: s.activeCalls + 1 }))
          break

        case 'call_status':
          setActiveCalls((prev) =>
            prev.map((c) =>
              c.callId === event.callId ? { ...c, status: event.status as string } : c
            )
          )
          break

        case 'call_ended':
          setActiveCalls((prev) => prev.filter((c) => c.callId !== event.callId))
          setStats((s) => ({ ...s, activeCalls: Math.max(0, s.activeCalls - 1) }))
          break

        case 'order_saved':
          setRecentOrders((prev) => [
            {
              callId: event.callId as string,
              phone: event.phone as string,
              customerName: event.customerName as string,
              items: event.items as string[],
              total: event.total as number,
              timestamp: event.timestamp as string,
            },
            ...prev.slice(0, 49),
          ])
          setStats((s) => ({
            ...s,
            ordersToday: s.ordersToday + 1,
            revenueRecovered: s.revenueRecovered + ((event.total as number) ?? 0),
          }))
          break

        case 'fact_pending':
          setPendingFacts((prev) => [...prev, event.fact as PendingFact])
          setStats((s) => ({ ...s, factsLearned: s.factsLearned + 1 }))
          break

        case 'fact_reviewed':
          setPendingFacts((prev) =>
            prev.filter((f) => f.id !== (event.factId as string))
          )
          break
      }
    }

    connect()

    return () => {
      esRef.current?.close()
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }
  }, [])

  return { activeCalls, recentOrders, pendingFacts, stats }
}
