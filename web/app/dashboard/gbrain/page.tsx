"use client"

import { Badge } from "@/components/ui/badge"
import { DashboardTopbar } from "@/components/dashboard/topbar"
import { GBrainGraph } from "@/components/dashboard/gbrain-graph"
import { PulseMemoryGraph } from "@/components/dashboard/pulse-memory-graph"
import { usePulseDashboardLive } from "@/lib/use-pulse-dashboard-live"

export default function GBrainPage() {
  const { pulse, connectionStatus, lastEventType } = usePulseDashboardLive()

  return (
    <>
      <DashboardTopbar
        title="GBrain"
        subtitle={pulse ? `${pulse.company.name} brain · ${pulse.company.catalogCount.toLocaleString()} catalog rows` : "Your business as a knowledge graph. Markdown-first, human-auditable, no vendor lock-in."}
      />
      <div className="p-6 lg:px-12 lg:py-10 w-full">
        {pulse && (
          <div className="mb-6 grid md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-foreground font-medium mb-1">Company brain</div>
              <div className="text-muted-foreground">{pulse.company.catalogLabel}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-foreground font-medium mb-1">Customer brains</div>
              <div className="text-muted-foreground">{pulse.customers.length} profiles loaded from Railway</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-foreground font-medium mb-1">Memory queue</div>
              <div className="text-muted-foreground">{pulse.memoryCandidates.length} review candidates</div>
            </div>
          </div>
        )}

        {pulse ? (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="border border-border bg-muted/30">
                  {connectionStatus}
                </Badge>
                {lastEventType && (
                  <Badge variant="secondary" className="border border-border bg-muted/30">
                    Event: {lastEventType}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="border border-border bg-muted/30">
                  {pulse.graph.nodes.filter((node) => node.companyId === pulse.selectedCompanyId).length} nodes
                </Badge>
                <Badge variant="secondary" className="border border-border bg-muted/30">
                  {pulse.graph.previewNodeIds.length} previewing
                </Badge>
              </div>
            </div>

            <PulseMemoryGraph
              graph={pulse.graph}
              companyId={pulse.selectedCompanyId}
            />
          </>
        ) : (
          <GBrainGraph />
        )}

        <div className="mt-6 grid sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-foreground font-medium mb-1">Click any node</div>
            View the live structured memory behind any company, product, call, or customer node.
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-foreground font-medium mb-1">Drag to explore</div>
            The left cluster is business context, the right cluster is customer memory, and the middle bridge is the live call.
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-foreground font-medium mb-1">Compounds over time</div>
            The seeded demo fakes the graph-growth moment: preview first, then persistent memory when the call lands.
          </div>
        </div>
      </div>
    </>
  )
}
