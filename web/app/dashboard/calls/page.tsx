"use client"

import { useState } from "react"
import { Phone, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { DashboardTopbar } from "@/components/dashboard/topbar"
import { calls } from "@/lib/mock/calls"
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
  const [selected, setSelected] = useState<Call | null>(null)

  return (
    <>
      <DashboardTopbar title="Live Calls" subtitle="Every call answered, every transcript saved." />
      <div className="p-6 lg:p-10 space-y-4 max-w-5xl">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 1 active
          </span>
          <span>·</span>
          <span>{calls.filter((c) => c.status === "completed").length} completed today</span>
          <span>·</span>
          <span>{calls.filter((c) => c.status === "escalated").length} escalated</span>
        </div>

        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {calls.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="w-full text-left p-4 hover:bg-muted/40 transition-colors flex items-center gap-4"
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
                    <span className="text-sm font-medium">{c.customerNameSnapshot}</span>
                    <Badge
                      variant="secondary"
                      className={
                        c.status === "active"
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                          : c.status === "escalated"
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                            : ""
                      }
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
            ))}
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0">
          {selected && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <SheetTitle className="text-base font-medium">{selected.customerNameSnapshot}</SheetTitle>
                    <SheetDescription className="text-xs">
                      {timeAgo(selected.startedAt)} · {fmtDuration(selected.durationSec)}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="px-6 py-5 space-y-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Outcome</div>
                <div className="text-sm">{selected.outcome}</div>
              </div>

              <div className="border-t border-border px-6 py-5 space-y-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Transcript</div>
                {selected.transcript.map((turn, i) => (
                  <div key={i} className={`flex ${turn.speaker === "agent" ? "justify-end" : ""}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        turn.speaker === "agent"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      <div
                        className={`text-[10px] uppercase tracking-wider mb-1 ${
                          turn.speaker === "agent" ? "opacity-80" : "text-muted-foreground"
                        }`}
                      >
                        {turn.speaker === "agent" ? "hey, G!" : "customer"}
                      </div>
                      {turn.text}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
