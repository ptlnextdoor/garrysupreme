"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef, useState } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Badge } from "@/components/ui/badge"
import { gbrain } from "@/lib/mock/gbrain"
import type { GBrainNode, GBrainNodeType } from "@/lib/mock/types"

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false })

const nodeColors: Record<GBrainNodeType, string> = {
  customer: "#a855f7", // purple
  menu: "#f59e0b", // amber
  preference: "#fbcfa0", // cream/light
  insight: "#10b981", // green
}

const nodeRadius: Record<GBrainNodeType, number> = {
  customer: 8,
  menu: 6,
  preference: 4,
  insight: 7,
}

const typeLabels: Record<GBrainNodeType, string> = {
  customer: "Customer",
  menu: "Menu item",
  preference: "Preference",
  insight: "Insight",
}

type Filter = "all" | GBrainNodeType

export function GBrainGraph() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [filter, setFilter] = useState<Filter>("all")
  const [selected, setSelected] = useState<GBrainNode | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const el = entries[0]
      if (el) {
        setSize({ w: el.contentRect.width, h: Math.max(560, el.contentRect.height) })
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const data = useMemo(() => {
    if (filter === "all") return gbrain
    const ids = new Set(gbrain.nodes.filter((n) => n.type === filter).map((n) => n.id))
    return {
      nodes: gbrain.nodes.filter((n) => ids.has(n.id)),
      links: gbrain.links.filter((l) => {
        const s = typeof l.source === "string" ? l.source : (l.source as { id: string }).id
        const t = typeof l.target === "string" ? l.target : (l.target as { id: string }).id
        return ids.has(s) && ids.has(t)
      }),
    }
  }, [filter])

  const counts = useMemo(() => {
    const c = { customer: 0, menu: 0, preference: 0, insight: 0 } as Record<GBrainNodeType, number>
    for (const n of gbrain.nodes) c[n.type]++
    return c
  }, [])

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(v) => v && setFilter(v as Filter)}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="all" className="px-3">All · {gbrain.nodes.length}</ToggleGroupItem>
          <ToggleGroupItem value="customer" className="px-3">Customers · {counts.customer}</ToggleGroupItem>
          <ToggleGroupItem value="menu" className="px-3">Menu · {counts.menu}</ToggleGroupItem>
          <ToggleGroupItem value="preference" className="px-3">Preferences · {counts.preference}</ToggleGroupItem>
          <ToggleGroupItem value="insight" className="px-3">Insights · {counts.insight}</ToggleGroupItem>
        </ToggleGroup>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {(Object.keys(nodeColors) as GBrainNodeType[]).map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: nodeColors[t] }} />
              {typeLabels[t]}
            </span>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full h-[640px] rounded-2xl border border-border bg-card overflow-hidden relative"
      >
        <ForceGraph2D
          width={size.w}
          height={size.h}
          graphData={data}
          backgroundColor="transparent"
          linkColor={() => "rgba(120, 113, 108, 0.35)"}
          linkWidth={1}
          cooldownTicks={120}
          nodeRelSize={1}
          nodeLabel={(n) => `${typeLabels[n.type as GBrainNodeType]} · ${n.label}`}
          onNodeClick={(n) => setSelected(n as GBrainNode)}
          nodeCanvasObject={(n, ctx, globalScale) => {
            const nodeType = n.type as GBrainNodeType
            const x = n.x ?? 0
            const y = n.y ?? 0
            const r = nodeRadius[nodeType]
            ctx.beginPath()
            ctx.arc(x, y, r, 0, 2 * Math.PI, false)
            ctx.fillStyle = nodeColors[nodeType]
            ctx.fill()
            ctx.lineWidth = 1.5 / globalScale
            ctx.strokeStyle = "rgba(255,255,255,0.9)"
            ctx.stroke()

            if (globalScale > 1.4 || nodeType === "customer" || nodeType === "insight") {
              const fontSize = Math.max(11 / globalScale, 4)
              ctx.font = `${fontSize}px Inter, sans-serif`
              ctx.fillStyle = "rgba(240, 240, 245, 0.9)"
              ctx.textAlign = "center"
              ctx.textBaseline = "top"
              const label = n.label.length > 22 ? n.label.slice(0, 21) + "…" : n.label
              ctx.fillText(label, x, y + r + 2)
            }
          }}
          nodePointerAreaPaint={(n, color, ctx) => {
            const r = nodeRadius[n.type as GBrainNodeType] + 3
            ctx.beginPath()
            ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, 2 * Math.PI, false)
            ctx.fillStyle = color
            ctx.fill()
          }}
        />
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0">
          {selected && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ background: nodeColors[selected.type] }}
                  />
                  <div>
                    <SheetTitle className="text-base font-medium">{selected.label}</SheetTitle>
                    <SheetDescription className="text-xs">{typeLabels[selected.type]}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="px-6 py-5">
                <Badge variant="secondary" className="mb-3 font-mono text-[10px]">
                  {selected.id}.md
                </Badge>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/85">
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
