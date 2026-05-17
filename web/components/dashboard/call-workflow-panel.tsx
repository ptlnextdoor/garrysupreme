"use client"

import type { ComponentType } from "react"
import {
  Brain,
  Checks,
  Database,
  FlowArrow,
  GlobeHemisphereWest,
  Lightning,
  PhoneCall,
  Sparkle,
  User,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type {
  PulseCall,
  PulseCallFlow,
  PulseDashboard,
  PulseRealtimeEvent,
  PulseWorkflowEvent,
  PulseWorkflowNode,
} from "@/lib/pulse-api"
import type { PulseConnectionStatus } from "@/lib/use-pulse-dashboard-live"

const workflowNodeOrder: PulseWorkflowNode[] = [
  "Call",
  "Company Brain",
  "Customer Brain",
  "Catalog Matcher",
  "Review Gate",
  "Order/Memory Write",
]

const nodeIcons: Record<PulseWorkflowNode, ComponentType<{ className?: string; weight?: "duotone" | "fill" }>> = {
  Call: PhoneCall,
  "Company Brain": Brain,
  "Customer Brain": User,
  "Catalog Matcher": FlowArrow,
  "Review Gate": WarningCircle,
  "Order/Memory Write": Database,
}

const statusTone: Record<PulseWorkflowEvent["status"], string> = {
  idle: "bg-muted text-muted-foreground border-border",
  active: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  done: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  review: "bg-amber-500/10 text-amber-300 border-amber-500/20",
}

const decisionTone: Record<NonNullable<PulseDashboard["lastSearch"]>["decision"], string> = {
  "ready-to-order": "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  review: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  clarify: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  "no-match": "bg-rose-500/10 text-rose-300 border-rose-500/20",
}

const confidenceTone: Record<"high" | "medium" | "low", string> = {
  high: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  low: "bg-rose-500/10 text-rose-300 border-rose-500/20",
}

type Props = {
  call: PulseCall | null
  pulse: PulseDashboard | null
  connectionStatus: PulseConnectionStatus
  lastEventType: PulseRealtimeEvent | null
}

function titleForStatus(status: PulseConnectionStatus) {
  if (status === "live") return "Live websocket stream"
  if (status === "connecting") return "Connecting to live stream"
  if (status === "polling") return "Polling fallback"
  return "Offline snapshot"
}

function latestEventsByNode(events: PulseWorkflowEvent[]) {
  const latest = new Map<PulseWorkflowNode, PulseWorkflowEvent>()
  for (const event of events) {
    if (!latest.has(event.node)) latest.set(event.node, event)
  }
  return latest
}

function flowNodes(call: PulseCall, flow: PulseCallFlow, companyName: string): PulseWorkflowEvent[] {
  return [
    {
      id: `${call.id}-flow-call`,
      node: "Call",
      label: "Caller input",
      status: "done",
      detail: flow.request,
      created_at: call.startedAt,
    },
    {
      id: `${call.id}-flow-company`,
      node: "Company Brain",
      label: `${companyName} context`,
      status: "done",
      detail: flow.companySignals.join(" · "),
      created_at: call.startedAt,
    },
    {
      id: `${call.id}-flow-customer`,
      node: "Customer Brain",
      label: `${call.customerName} memory`,
      status: "done",
      detail: flow.customerSignals.join(" · "),
      created_at: call.startedAt,
    },
    {
      id: `${call.id}-flow-match`,
      node: "Catalog Matcher",
      label: `${flow.matchedItems.length} recommendation${flow.matchedItems.length === 1 ? "" : "s"}`,
      status: flow.matchedItems.length ? "done" : "review",
      detail: flow.matchedItems[0]?.name ?? "No safe match yet.",
      created_at: call.startedAt,
    },
    {
      id: `${call.id}-flow-review`,
      node: "Review Gate",
      label: flow.decision,
      status: flow.decision === "ready-to-order" ? "done" : flow.decision === "no-match" ? "review" : "review",
      detail: flow.clarifyingQuestion ?? flow.nextAction,
      created_at: call.startedAt,
    },
    {
      id: `${call.id}-flow-write`,
      node: "Order/Memory Write",
      label: call.currentOrder.length ? "Order prepared" : "Awaiting confirmation",
      status: call.currentOrder.length ? "done" : flow.decision === "ready-to-order" ? "active" : "idle",
      detail: call.currentOrder.length ? call.currentOrder.join(", ") : flow.nextAction,
      created_at: call.startedAt,
    },
  ]
}

export function CallWorkflowPanel({ call, pulse, connectionStatus, lastEventType }: Props) {
  if (!pulse) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workflow Trace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Live workflow tracing needs the Railway API configured in `NEXT_PUBLIC_API_URL`.</p>
          <p>The mock calls list still renders, but the n8n-style execution graph only appears when the dashboard is connected to live Pulse state.</p>
        </CardContent>
      </Card>
    )
  }

  if (!call) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workflow Trace</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No active call is selected for the current company.
        </CardContent>
      </Card>
    )
  }

  const selectedCompany = pulse.companies?.find((company) => company.id === call.companyId) ?? pulse.company
  const flow = call.flow
  const derivedFlowNodes = flow ? flowNodes(call, flow, selectedCompany.name) : null
  const latestByNode = latestEventsByNode(derivedFlowNodes ?? pulse.workflowEvents)
  const nodes = workflowNodeOrder.map((node) => latestByNode.get(node) ?? {
    id: `seed-${node}`,
    node,
    label: "Waiting",
    status: "idle" as const,
    detail: "No event received yet.",
    created_at: call.startedAt,
  })
  const search = flow ? {
    query: flow.request,
    decision: flow.decision,
      meta: {
      catalog_count: selectedCompany.catalogCount,
      latency_ms: pulse.lastSearch?.meta.latency_ms ?? 0,
      low_confidence_overall: false,
      ambiguous_query: flow.decision !== "ready-to-order" && flow.matchedItems.length > 1,
      review_required: flow.decision !== "ready-to-order",
      clarifying_question: flow.clarifyingQuestion ?? null,
    },
    results: flow.matchedItems.map((match, index) => ({
      rank: index + 1,
      sku: `${call.id}-${index + 1}`,
      catalog_id: `${call.id}-${index + 1}`,
      name: match.name,
      description: match.why,
      category: "Live recommendation",
      score: match.confidence ?? 0,
      confidence: match.confidence ?? 0,
      confidence_label: match.confidence_label ?? "medium",
      personalized: index === 0,
      personalization_note: index === 0 && flow.customerSignals.length ? flow.customerSignals[0] : null,
      match_evidence: [match.why],
      review_reasons: match.review_reasons ?? [],
      can_auto_order: flow.decision === "ready-to-order",
      stock_seed: (match.stock?.includes("out") ? "out_of_stock" : match.stock?.includes("low") ? "low_stock" : match.stock?.includes("location") || match.stock?.includes("check") ? "location_required" : "in_stock") as "in_stock" | "low_stock" | "out_of_stock" | "location_required",
      price_band_seed: "demo",
    })),
  } : pulse.lastSearch

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Workflow Trace</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Real backend steps for the selected Vapi call. Structured reasoning only.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={cn("border", connectionStatus === "live" ? statusTone.done : connectionStatus === "polling" ? statusTone.review : statusTone.active)}>
              {titleForStatus(connectionStatus)}
            </Badge>
            {lastEventType && (
              <Badge variant="secondary" className="border border-border bg-muted/70 text-muted-foreground">
                Event: {lastEventType}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Company</div>
            <div className="mt-1 text-sm font-medium">{selectedCompany.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">{selectedCompany.catalogLabel}</div>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Selected call</div>
            <div className="mt-1 text-sm font-medium">{call.customerName}</div>
            <div className="mt-1 text-xs text-muted-foreground">{call.phone} · {call.status}</div>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Latest query</div>
            <div className="mt-1 text-sm font-medium line-clamp-2">{search?.query || "Waiting for context/search tool call"}</div>
            <div className="mt-1 text-xs text-muted-foreground">{search ? `${search.results.length} matches${search.meta.latency_ms ? ` · ${search.meta.latency_ms}ms` : ""}` : "No matcher run yet"}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {flow && (
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
            <div className="rounded-2xl border border-border bg-card/60 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <PhoneCall className="h-4 w-4 text-primary" weight="duotone" />
                Caller Input
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{flow.request}</div>
              <div className="mt-3 inline-flex rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                Language: {flow.language}
              </div>
            </div>
            <div className="hidden items-center 2xl:flex">
              <FlowArrow className="h-5 w-5 text-muted-foreground" weight="duotone" />
            </div>
            <div className="rounded-2xl border border-border bg-card/60 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <GlobeHemisphereWest className="h-4 w-4 text-primary" weight="duotone" />
                Context Merge
              </div>
              <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                <div>{flow.companySignals[0]}</div>
                <div>{flow.customerSignals[0]}</div>
              </div>
            </div>
            <div className="hidden items-center 2xl:flex">
              <FlowArrow className="h-5 w-5 text-muted-foreground" weight="duotone" />
            </div>
            <div className="rounded-2xl border border-border bg-card/60 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkle className="h-4 w-4 text-primary" weight="duotone" />
                Match + Reason
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {flow.matchedItems[0]?.name ?? "No safe match"}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {flow.matchedItems[0]?.why ?? flow.nextAction}
              </div>
            </div>
            <div className="hidden items-center 2xl:flex">
              <FlowArrow className="h-5 w-5 text-muted-foreground" weight="duotone" />
            </div>
            <div className="rounded-2xl border border-border bg-card/60 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Lightning className="h-4 w-4 text-primary" weight="duotone" />
                Agent Output
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{flow.agentReply}</div>
              <div className="mt-2 text-xs text-muted-foreground">{flow.nextAction}</div>
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3 pb-2">
            {nodes.map((event, index) => {
              const Icon = nodeIcons[event.node]
              const isActive = event.status !== "idle"

              return (
                <div key={event.node} className="min-w-0">
                  <div
                    className={cn(
                      "h-full min-w-0 rounded-2xl border p-4 transition-colors",
                      isActive ? "border-primary/30 bg-primary/5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]" : "border-border bg-card/60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", isActive ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground")}>
                          <Icon className="h-5 w-5" weight="duotone" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{event.node}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{event.label}</div>
                        </div>
                      </div>
                      <Badge variant="secondary" className={cn("border capitalize", statusTone[event.status])}>
                        {event.status}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground break-words">{event.detail}</p>
                  </div>
                </div>
              )
            })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-2xl border border-border bg-card/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Decision</div>
                <div className="mt-1 text-xs text-muted-foreground">Current catalog matcher outcome for this company stream.</div>
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  "border capitalize",
                  search ? decisionTone[search.decision] : "border-border bg-muted text-muted-foreground",
                )}
              >
                {search?.decision ?? "waiting"}
              </Badge>
            </div>

            {search ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Query</div>
                  <div className="mt-1 text-sm">{search.query}</div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-muted/20 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Catalog</div>
                    <div className="mt-1 text-sm font-medium">{search.meta.catalog_count.toLocaleString()} rows</div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Latency</div>
                    <div className="mt-1 text-sm font-medium">{search.meta.latency_ms}ms</div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Ambiguous</div>
                    <div className="mt-1 text-sm font-medium">{search.meta.ambiguous_query ? "Yes" : "No"}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Clarifying question</div>
                  <div className="mt-1 text-sm">{search.meta.clarifying_question ?? "None required."}</div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                Waiting for `get_context` or `search_catalog` to run on the selected call.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Top Matches</div>
                <div className="mt-1 text-xs text-muted-foreground">Ranked candidates, confidence, review reasons, and auto-order readiness.</div>
              </div>
              {search && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checks className="h-4 w-4" weight="duotone" />
                  {search.results.length} shown
                </div>
              )}
            </div>

            {search?.results.length ? (
              <div className="mt-4 space-y-3">
                {search.results.map((match) => (
                  <div key={match.catalog_id} className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">#{match.rank}</span>
                          <div className="truncate text-sm font-medium">{match.name}</div>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{match.category}</div>
                        <p className="mt-2 text-sm text-muted-foreground">{match.description}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Badge variant="secondary" className={cn("border capitalize", confidenceTone[match.confidence_label])}>
                          {match.confidence_label} {Math.round(match.confidence * 100)}%
                        </Badge>
                        <Badge variant="secondary" className={cn("border", match.can_auto_order ? statusTone.done : statusTone.review)}>
                          {match.can_auto_order ? "Auto-order ready" : "Needs review"}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Match evidence</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {match.match_evidence.slice(0, 4).map((evidence) => (
                            <span key={evidence} className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                              {evidence}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Review reasons</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {match.review_reasons.length ? match.review_reasons.map((reason) => (
                            <span key={reason} className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                              {reason}
                            </span>
                          )) : (
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
                              No review reasons
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {match.personalization_note && (
                      <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary/90">
                        Personalized: {match.personalization_note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No ranked matches yet.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
