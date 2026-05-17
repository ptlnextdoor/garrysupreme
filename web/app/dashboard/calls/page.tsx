"use client"

import { useEffect, useState } from "react"
import { Phone, CaretRight, ChatsCircle } from "@phosphor-icons/react/dist/ssr"
import { ArrowsClockwise, Sparkle } from "@phosphor-icons/react/dist/ssr"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CallWorkflowPanel } from "@/components/dashboard/call-workflow-panel"
import { PulseMemoryGraph } from "@/components/dashboard/pulse-memory-graph"
import { DashboardTopbar } from "@/components/dashboard/topbar"
import { calls } from "@/lib/mock/calls"
import { cn } from "@/lib/utils"
import type { Call } from "@/lib/mock/types"
import { type PulseCall } from "@/lib/pulse-api"
import { usePulseDashboardLive } from "@/lib/use-pulse-dashboard-live"

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function callName(call: Call | PulseCall) {
  return "customerNameSnapshot" in call ? call.customerNameSnapshot : call.customerName
}

function callOutcome(call: Call | PulseCall) {
  return "outcome" in call ? call.outcome : call.intent
}

function callDuration(call: Call | PulseCall) {
  return "durationSec" in call ? fmtDuration(call.durationSec) : call.status
}

function isLiveStatus(status: Call["status"] | PulseCall["status"]) {
  return status === "active" || status === "ringing" || status === "context loaded" || status === "ordering"
}

function callTranscript(call: Call | PulseCall): Array<{ speaker: "customer" | "agent"; text: string }> {
  if (!("transcript" in call)) return []
  if (call.transcript.length && typeof call.transcript[0] === "string") {
    return call.transcript.map((text, index) => ({
      speaker: index % 2 === 0 ? "agent" as const : "customer" as const,
      text: String(text)
    }))
  }
  return call.transcript as Array<{ speaker: "customer" | "agent"; text: string }>
}

export default function CallsPage() {
  const [selectedId, setSelectedId] = useState<string>(calls[0]?.id ?? "")
  const { pulse, connectionStatus, lastEventType } = usePulseDashboardLive()
  const callRows = pulse ? (pulse.allActiveCalls?.length ? pulse.allActiveCalls : pulse.activeCalls) : calls
  const selected = callRows.find((c) => c.id === selectedId) ?? callRows[0] ?? null
  const selectedLiveCall = pulse
    ? pulse.allActiveCalls?.find((call) => call.id === selected?.id)
      ?? pulse.activeCalls.find((call) => call.id === selected?.id)
      ?? pulse.allActiveCalls?.[0]
      ?? pulse.activeCalls[0]
      ?? null
    : null

  useEffect(() => {
    if (selected && selected.id === selectedId) return
    setSelectedId(selected?.id ?? "")
  }, [selected, selectedId])

  return (
    <>
      <DashboardTopbar
        title="Live Calls"
        subtitle={
          pulse
            ? connectionStatus === "live"
              ? "Live Railway call state with websocket updates."
              : "Railway call state with polling fallback."
            : "Every call answered, every transcript saved."
        }
      />
      <div className="p-6 lg:px-12 lg:py-10">
        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
          {/* List */}
          <Card className="self-start">
            <CardContent className="p-0 divide-y divide-border">
              {callRows.map((c) => {
                const active = c.id === selectedId
                const name = callName(c)
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      "w-full text-left p-4 transition-colors flex items-center gap-4",
                      active ? "bg-muted/60" : "hover:bg-muted/40",
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium shrink-0">
                      {name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{name}</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "shrink-0",
                            isLiveStatus(c.status)
                              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/10"
                              : c.status === "escalated"
                                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/10"
                                : "",
                          )}
                        >
                          {c.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{callOutcome(c)}</div>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="text-xs text-muted-foreground">{timeAgo(c.startedAt)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{"durationSec" in c ? fmtDuration(c.durationSec) : c.status}</div>
                    </div>
                    <CaretRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                )
              })}
            </CardContent>
          </Card>

          <div className="space-y-6 self-start min-w-0">
            <Card>
              {selected ? (
                <>
                  <div className="px-6 pt-6 pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <Phone className="w-4 h-4" weight="duotone" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-medium truncate">{callName(selected)}</div>
                        <div className="text-xs text-muted-foreground">
                          {timeAgo(selected.startedAt)} · {callDuration(selected)}
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          isLiveStatus(selected.status)
                            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/10"
                            : selected.status === "escalated"
                              ? "bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/10"
                              : "",
                        )}
                      >
                        {selected.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="px-6 py-5 border-b border-border">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Outcome</div>
                    <div className="text-sm">{callOutcome(selected)}</div>
                  </div>

                  <div className="px-6 py-5 space-y-3 max-h-[52vh] overflow-y-auto">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Transcript</div>
                    {callTranscript(selected).map((turn, i) => (
                      <div key={i} className={cn("flex", turn.speaker === "agent" && "justify-end")}>
                        <div
                          className={cn(
                            "max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words",
                            turn.speaker === "agent"
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted text-foreground rounded-bl-sm",
                          )}
                        >
                          <div
                            className={cn(
                              "text-[10px] uppercase tracking-wider mb-1",
                              turn.speaker === "agent" ? "opacity-80" : "text-muted-foreground",
                            )}
                          >
                            {turn.speaker === "agent" ? "hey, G!" : "customer"}
                          </div>
                          {turn.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <CardContent className="py-20 text-center text-muted-foreground">
                  <ChatsCircle className="w-8 h-8 mx-auto mb-3 opacity-60" weight="duotone" />
                  <div className="text-sm">Select a call to view its transcript.</div>
                </CardContent>
              )}
            </Card>

            <CallWorkflowPanel
              call={selectedLiveCall}
              pulse={pulse}
              connectionStatus={connectionStatus}
              lastEventType={lastEventType}
            />

            {pulse && selectedLiveCall && (
              <Card>
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">Live Memory Graph</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Live graph for the selected demo call. New memory nodes glow first, then persist.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="border border-border bg-muted/30">
                        <ArrowsClockwise className="mr-1 h-3.5 w-3.5" weight="duotone" />
                        {connectionStatus}
                      </Badge>
                      {pulse.graph.previewNodeIds.length > 0 && (
                        <Badge variant="secondary" className="border border-amber-500/20 bg-amber-500/10 text-amber-300">
                          <Sparkle className="mr-1 h-3.5 w-3.5" weight="duotone" />
                          {pulse.graph.previewNodeIds.length} previewing
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <PulseMemoryGraph
                    graph={pulse.graph}
                    companyId={selectedLiveCall.companyId}
                    callId={selectedLiveCall.id}
                    compact
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
