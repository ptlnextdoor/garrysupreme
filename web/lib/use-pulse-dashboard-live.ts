"use client"

import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react"
import {
  fetchPulseDashboard,
  pulseWsUrl,
  type PulseDashboard,
  type PulseRealtimeEvent,
} from "@/lib/pulse-api"

export type PulseConnectionStatus = "connecting" | "live" | "polling" | "offline"

type PulseSocketMessage = {
  event: PulseRealtimeEvent
  payload: unknown
}

const RECONNECT_DELAY_MS = 3000
const POLL_INTERVAL_MS = 15000

const trackedEvents = new Set<PulseRealtimeEvent>([
  "dashboard_updated",
  "context_loaded",
  "catalog_searched",
  "order_saved",
  "vapi_webhook",
  "memory_learned",
  "memory_approved",
  "memory_rejected",
  "demo_call_started",
  "demo_call_ended",
  "demo_reset",
])

export function usePulseDashboardLive() {
  const [pulse, setPulse] = useState<PulseDashboard | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<PulseConnectionStatus>("connecting")
  const [lastEventType, setLastEventType] = useState<PulseRealtimeEvent | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  const applyDashboard = useEffectEvent((dashboard: PulseDashboard | null) => {
    if (!dashboard) return
    startTransition(() => {
      setPulse(dashboard)
    })
  })

  const refreshDashboard = useEffectEvent(async () => {
    const dashboard = await fetchPulseDashboard()
    applyDashboard(dashboard)
    return dashboard
  })

  useEffect(() => {
    let disposed = false
    const wsUrl = pulseWsUrl()

    const clearReconnect = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }

    const scheduleReconnect = () => {
      if (disposed || !wsUrl || reconnectTimerRef.current !== null) return
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null
        connect()
      }, RECONNECT_DELAY_MS)
    }

    const connect = () => {
      if (disposed || !wsUrl) {
        setConnectionStatus("offline")
        return
      }

      try {
        setConnectionStatus((current) => (current === "live" ? current : "connecting"))
        const socket = new WebSocket(wsUrl)
        socketRef.current = socket

        socket.onopen = () => {
          if (disposed) return
          clearReconnect()
          setConnectionStatus("live")
        }

        socket.onmessage = (message) => {
          if (disposed) return

          try {
            const parsed = JSON.parse(String(message.data)) as PulseSocketMessage
            if (!trackedEvents.has(parsed.event)) return
            setLastEventType(parsed.event)
            if (parsed.event === "dashboard_updated") {
              applyDashboard(parsed.payload as PulseDashboard)
            }
          } catch {
            setConnectionStatus("polling")
          }
        }

        socket.onerror = () => {
          if (disposed) return
          setConnectionStatus("polling")
        }

        socket.onclose = () => {
          if (disposed) return
          setConnectionStatus("polling")
          scheduleReconnect()
        }
      } catch {
        setConnectionStatus("polling")
        scheduleReconnect()
      }
    }

    void refreshDashboard().then((dashboard) => {
      if (!dashboard && !wsUrl) {
        setConnectionStatus("offline")
      }
    })

    connect()

    const pollId = window.setInterval(() => {
      void refreshDashboard()
    }, POLL_INTERVAL_MS)

    return () => {
      disposed = true
      clearReconnect()
      window.clearInterval(pollId)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [applyDashboard, refreshDashboard])

  return {
    pulse,
    connectionStatus,
    lastEventType,
  }
}
