import { DashboardTopbar } from "@/components/dashboard/topbar"
import { GBrainGraph } from "@/components/dashboard/gbrain-graph"

export default function GBrainPage() {
  return (
    <>
      <DashboardTopbar
        title="GBrain"
        subtitle="Your business as a knowledge graph. Markdown-first, human-auditable, no vendor lock-in."
      />
      <div className="p-6 lg:px-12 lg:py-10 w-full">
        <GBrainGraph />

        <div className="mt-6 grid sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-foreground font-medium mb-1">Click any node</div>
            View the underlying markdown — the same file the AI reads at call-time.
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-foreground font-medium mb-1">Drag to explore</div>
            Force-directed layout — drag, zoom, pan. The graph re-stabilizes automatically.
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-foreground font-medium mb-1">Compounds over time</div>
            New calls → new preference nodes → richer recommendations. The 50th call is dramatically better than the 1st.
          </div>
        </div>
      </div>
    </>
  )
}
