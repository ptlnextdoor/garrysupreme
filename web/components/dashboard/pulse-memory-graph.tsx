"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef, useState } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import type { PulseGraphLink, PulseGraphNode, PulseGraphSnapshot } from "@/lib/pulse-api"

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false })

type GraphFilter = "all" | PulseGraphNode["type"]

type Props = {
  graph: PulseGraphSnapshot
  companyId: "costco" | "starbucks"
  callId?: string | null
  compact?: boolean
  className?: string
}

type GraphNodeDatum = PulseGraphNode & { x?: number; y?: number }
type GraphLinkDatum = PulseGraphLink & { source: string | GraphNodeDatum; target: string | GraphNodeDatum }

const colors: Record<PulseGraphNode["type"], string> = {
  company: "#d97706",
  catalog_item: "#f59e0b",
  customer: "#0f766e",
  preference: "#ef4444",
  insight: "#84cc16",
  call: "#64748b",
}

const radii: Record<PulseGraphNode["type"], number> = {
  company: 11,
  catalog_item: 7,
  customer: 9,
  preference: 6,
  insight: 8,
  call: 8,
}

const labels: Record<PulseGraphNode["type"], string> = {
  company: "Company",
  catalog_item: "Catalog item",
  customer: "Customer",
  preference: "Memory",
  insight: "Insight",
  call: "Call",
}

function graphCallNodeId(callId: string) {
  return `graph_call_${callId}`
}

export function PulseMemoryGraph({ graph, companyId, callId = null, compact = false, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<any>(null)
  const [size, setSize] = useState({ w: 900, h: compact ? 320 : 640 })
  const [selected, setSelected] = useState<PulseGraphNode | null>(null)
  const [filter, setFilter] = useState<GraphFilter>("all")

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      setSize({
        w: rect.width,
        h: compact ? Math.max(280, rect.height) : Math.max(560, rect.height),
      })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [compact])

  const previewNodeIds = useMemo(() => new Set(graph.previewNodeIds), [graph.previewNodeIds])
  const previewLinkIds = useMemo(() => new Set(graph.previewLinkIds), [graph.previewLinkIds])
  const recentMutation = graph.lastMutationAt ? Date.now() - new Date(graph.lastMutationAt).getTime() < 5000 : false

  const visibleGraph = useMemo(() => {
    const companyNodes = graph.nodes.filter((node) => node.companyId === companyId)
    const companyLinks = graph.links.filter((link) => link.companyId === companyId)

    if (!compact || !callId) {
      const filteredNodes = filter === "all" ? companyNodes : companyNodes.filter((node) => node.type === filter)
      const nodeIds = new Set(filteredNodes.map((node) => node.id))
      return {
        nodes: filteredNodes.map((node) => ({ ...node })),
        links: companyLinks.filter((link) => nodeIds.has(readRefId(link.source)) && nodeIds.has(readRefId(link.target))).map((link) => ({ ...link })),
      }
    }

    const focusNodeId = graphCallNodeId(callId)
    const relevant = new Set<string>([focusNodeId])
    for (const link of companyLinks) {
      const source = readRefId(link.source)
      const target = readRefId(link.target)
      if (source === focusNodeId || target === focusNodeId) {
        relevant.add(source)
        relevant.add(target)
      }
    }
    for (const link of companyLinks) {
      const source = readRefId(link.source)
      const target = readRefId(link.target)
      if (relevant.has(source) || relevant.has(target) || previewLinkIds.has(link.id) || previewNodeIds.has(source) || previewNodeIds.has(target)) {
        relevant.add(source)
        relevant.add(target)
      }
    }

    return {
      nodes: companyNodes.filter((node) => relevant.has(node.id)).map((node) => ({ ...node })),
      links: companyLinks.filter((link) => relevant.has(readRefId(link.source)) && relevant.has(readRefId(link.target))).map((link) => ({ ...link })),
    }
  }, [callId, compact, companyId, filter, graph.links, graph.nodes, previewLinkIds, previewNodeIds])

  if (compact) {
    const businessNodes = visibleGraph.nodes.filter((node) => node.side === "business").slice(0, 5)
    const bridgeNodes = visibleGraph.nodes.filter((node) => node.side === "bridge").slice(0, 3)
    const customerNodes = visibleGraph.nodes.filter((node) => node.side === "customer").slice(0, 6)

    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_35%),rgba(15,23,42,0.55)] p-4",
          className,
        )}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="border border-border bg-background/70 backdrop-blur">Business graph</Badge>
          <Badge variant="secondary" className="border border-border bg-background/70 backdrop-blur">Live call bridge</Badge>
          <Badge variant="secondary" className="border border-border bg-background/70 backdrop-blur">Customer memory</Badge>
          {graph.previewNodeIds.length > 0 && (
            <Badge variant="secondary" className="border border-amber-500/20 bg-amber-500/10 text-amber-300">
              {graph.previewNodeIds.length} nodes previewing
            </Badge>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_80px_minmax(0,0.85fr)_80px_minmax(0,1fr)] items-start">
          <GraphStage title="Business" nodes={businessNodes} previewNodeIds={previewNodeIds} />
          <GraphConnector />
          <GraphStage title="Call" nodes={bridgeNodes} previewNodeIds={previewNodeIds} center />
          <GraphConnector />
          <GraphStage title="Memory" nodes={customerNodes} previewNodeIds={previewNodeIds} />
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (!graphRef.current) return
    const nodes = visibleGraph.nodes as Array<GraphNodeDatum>
    for (const node of nodes) {
      if (typeof node.x === "number" && typeof node.y === "number") continue
      const side = node.side
      const spread = compact ? 110 : 190
      const xBase = side === "business" ? -spread : side === "customer" ? spread : 0
      node.x = xBase + Math.random() * 40 - 20
      node.y = Math.random() * (compact ? 180 : 260) - (compact ? 90 : 130)
    }
  }, [compact, visibleGraph.nodes])

  return (
    <>
      {!compact && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={(value) => value && setFilter(value as GraphFilter)}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="all" className="px-3">All</ToggleGroupItem>
            <ToggleGroupItem value="company" className="px-3">Company</ToggleGroupItem>
            <ToggleGroupItem value="catalog_item" className="px-3">Catalog</ToggleGroupItem>
            <ToggleGroupItem value="customer" className="px-3">Customers</ToggleGroupItem>
            <ToggleGroupItem value="preference" className="px-3">Memory</ToggleGroupItem>
            <ToggleGroupItem value="insight" className="px-3">Insights</ToggleGroupItem>
            <ToggleGroupItem value="call" className="px-3">Calls</ToggleGroupItem>
          </ToggleGroup>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="border border-border bg-muted/30">{visibleGraph.nodes.length} nodes</Badge>
            <Badge variant="secondary" className="border border-border bg-muted/30">{visibleGraph.links.length} links</Badge>
            {graph.previewNodeIds.length > 0 && (
              <Badge variant="secondary" className="border border-amber-500/20 bg-amber-500/10 text-amber-300">
                {graph.previewNodeIds.length} previewing
              </Badge>
            )}
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className={cn(
          "relative w-full overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_35%),rgba(15,23,42,0.55)]",
          compact ? "h-[320px]" : "h-[640px]",
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="border border-border bg-background/70 backdrop-blur">
            Left: business graph
          </Badge>
          <Badge variant="secondary" className="border border-border bg-background/70 backdrop-blur">
            Right: customer graph
          </Badge>
          {compact && graph.previewNodeIds.length > 0 && (
            <Badge variant="secondary" className="border border-amber-500/20 bg-amber-500/10 text-amber-300 backdrop-blur">
              Preview nodes are glowing
            </Badge>
          )}
        </div>

        <ForceGraph2D
          ref={graphRef}
          width={size.w}
          height={size.h}
          graphData={visibleGraph}
          backgroundColor="transparent"
          cooldownTicks={80}
          d3VelocityDecay={0.28}
          nodeRelSize={1}
          linkColor={(link) => {
            const typedLink = link as GraphLinkDatum
            if (previewLinkIds.has(typedLink.id)) return "rgba(245, 158, 11, 0.78)"
            if (typedLink.active) return "rgba(20, 184, 166, 0.85)"
            return "rgba(148, 163, 184, 0.24)"
          }}
          linkWidth={(link) => {
            const typedLink = link as GraphLinkDatum
            if (previewLinkIds.has(typedLink.id)) return 2.8
            if (typedLink.active) return 2.2
            return compact ? 1.1 : 1.3
          }}
          linkDirectionalParticles={(link) => {
            const typedLink = link as GraphLinkDatum
            if (previewLinkIds.has(typedLink.id)) return 3
            if (typedLink.active && recentMutation) return 2
            return 0
          }}
          linkDirectionalParticleWidth={(link) => previewLinkIds.has((link as GraphLinkDatum).id) ? 2.4 : 1.8}
          nodeLabel={(node) => `${labels[(node as GraphNodeDatum).type]} · ${(node as GraphNodeDatum).label}`}
          onNodeClick={(node) => setSelected(node as PulseGraphNode)}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const typedNode = node as GraphNodeDatum
            const x = typedNode.x ?? 0
            const y = typedNode.y ?? 0
            const r = radii[typedNode.type]
            const preview = previewNodeIds.has(typedNode.id)
            const glow = preview || typedNode.active
            const glowRadius = preview ? r + 9 : typedNode.active ? r + 6 : 0

            if (glowRadius > 0) {
              const pulse = 0.75 + Math.sin(Date.now() / 220) * 0.14
              ctx.beginPath()
              ctx.arc(x, y, glowRadius * pulse, 0, 2 * Math.PI, false)
              ctx.fillStyle = preview ? "rgba(245, 158, 11, 0.16)" : "rgba(20, 184, 166, 0.14)"
              ctx.fill()
            }

            ctx.beginPath()
            ctx.arc(x, y, r, 0, 2 * Math.PI, false)
            ctx.fillStyle = colors[typedNode.type]
            ctx.fill()
            ctx.lineWidth = preview ? 2.4 / globalScale : 1.6 / globalScale
            ctx.strokeStyle = preview ? "rgba(255, 251, 235, 0.96)" : "rgba(255,255,255,0.88)"
            ctx.stroke()

            if (globalScale > 1.2 || typedNode.type === "company" || typedNode.type === "customer" || typedNode.type === "call") {
              const fontSize = Math.max(10 / globalScale, 4)
              ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`
              ctx.fillStyle = "rgba(248, 250, 252, 0.95)"
              ctx.textAlign = "center"
              ctx.textBaseline = "top"
              const label = typedNode.label.length > (compact ? 20 : 24) ? `${typedNode.label.slice(0, compact ? 19 : 23)}…` : typedNode.label
              ctx.fillText(label, x, y + r + 4)
            }
          }}
          nodePointerAreaPaint={(node, color, ctx) => {
            const typedNode = node as GraphNodeDatum
            const r = radii[typedNode.type] + 4
            ctx.beginPath()
            ctx.arc(typedNode.x ?? 0, typedNode.y ?? 0, r, 0, 2 * Math.PI, false)
            ctx.fillStyle = color
            ctx.fill()
          }}
        />

        {!compact && (
          <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {(Object.keys(colors) as Array<PulseGraphNode["type"]>).map((type) => (
              <span key={type} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-2.5 py-1 backdrop-blur">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[type] }} />
                {labels[type]}
              </span>
            ))}
          </div>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-md">
          {selected && (
            <>
              <SheetHeader className="border-b border-border px-6 pb-4 pt-6">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ background: colors[selected.type] }} />
                  <div>
                    <SheetTitle className="text-base font-medium">{selected.label}</SheetTitle>
                    <SheetDescription className="text-xs">{labels[selected.type]} · {selected.companyId}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <div className="space-y-4 px-6 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="border border-border bg-muted/30">{selected.type}</Badge>
                  <Badge variant="secondary" className="border border-border bg-muted/30">{selected.side}</Badge>
                  {selected.active && (
                    <Badge variant="secondary" className="border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                      live
                    </Badge>
                  )}
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                  {selected.detail}
                </div>
                <pre className="whitespace-pre-wrap rounded-xl border border-border bg-card/70 p-4 font-sans text-sm leading-relaxed text-foreground/90">
                  {selected.markdown}
                </pre>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

function readRefId(value: string | GraphNodeDatum) {
  return typeof value === "string" ? value : value.id
}

function GraphStage({
  title,
  nodes,
  previewNodeIds,
  center = false,
}: {
  title: string
  nodes: PulseGraphNode[]
  previewNodeIds: Set<string>
  center?: boolean
}) {
  return (
    <div className={cn("space-y-3 min-w-0", center && "lg:px-2")}>
      <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{title}</div>
      <div className="space-y-2">
        {nodes.map((node) => {
          const preview = previewNodeIds.has(node.id)
          return (
            <div
              key={node.id}
              className={cn(
                "rounded-xl border px-3 py-2.5 min-w-0",
                preview
                  ? "border-amber-500/30 bg-amber-500/10 shadow-[0_0_0_1px_rgba(245,158,11,0.08)]"
                  : node.active
                    ? "border-emerald-500/20 bg-emerald-500/10"
                    : "border-border bg-card/60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{node.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground break-words">{node.detail}</div>
                </div>
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: colors[node.type] }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GraphConnector() {
  return (
    <div className="hidden lg:flex h-full items-center justify-center">
      <div className="h-[2px] w-full rounded-full bg-gradient-to-r from-amber-500/40 via-cyan-400/50 to-emerald-500/40" />
    </div>
  )
}
