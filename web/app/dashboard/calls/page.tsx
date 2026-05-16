"use client"

import { useState } from "react"
import { Phone, ChevronRight, MessagesSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DashboardTopbar } from "@/components/dashboard/topbar"
import { calls } from "@/lib/mock/calls"
import { cn } from "@/lib/utils"
import type { Call } from "@/lib/mock/types"

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

export default function CallsPage() {
  const [selectedId, setSelectedId] = useState<string>(calls[0]?.id ?? "")
  const selected: Call | undefined = calls.find((c) => c.id === selectedId)

  return (
    <>
      <DashboardTopbar title="Live Calls" subtitle="Every call answered, every transcript saved." />
      <div className="p-6 lg:p-10 mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6">
          {/* List */}
          <Card className="self-start">
            <CardContent className="p-0 divide-y divide-border">
              {calls.map((c) => {
                const active = c.id === selectedId
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
                      {c.customerNameSnapshot
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{c.customerNameSnapshot}</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "shrink-0",
                            c.status === "active"
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                              : c.status === "escalated"
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                                : "",
                          )}
                        >
                          {c.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{c.outcome}</div>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="text-xs text-muted-foreground">{timeAgo(c.startedAt)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{fmtDuration(c.durationSec)}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {/* Detail panel — sits inline on desktop instead of in a Sheet */}
          <Card className="self-start lg:sticky lg:top-24">
            {selected ? (
              <>
                <div className="px-6 pt-6 pb-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-medium truncate">{selected.customerNameSnapshot}</div>
                      <div className="text-xs text-muted-foreground">
                        {timeAgo(selected.startedAt)} · {fmtDuration(selected.durationSec)}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        selected.status === "active"
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                          : selected.status === "escalated"
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                            : "",
                      )}
                    >
                      {selected.status}
                    </Badge>
                  </div>
                </div>

                <div className="px-6 py-5 border-b border-border">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Outcome</div>
                  <div className="text-sm">{selected.outcome}</div>
                </div>

                <div className="px-6 py-5 space-y-3 max-h-[60vh] overflow-y-auto">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Transcript</div>
                  {selected.transcript.map((turn, i) => (
                    <div key={i} className={cn("flex", turn.speaker === "agent" && "justify-end")}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
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
                <MessagesSquare className="w-8 h-8 mx-auto mb-3 opacity-60" />
                <div className="text-sm">Select a call to view its transcript.</div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
