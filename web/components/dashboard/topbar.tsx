import { Badge } from "@/components/ui/badge"

export function DashboardTopbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-border bg-background sticky top-0 z-20 px-6 lg:px-10 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-medium" style={{ fontFamily: "var(--font-playfair)" }}>
          {title}
        </h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          hey, G! online
        </Badge>
      </div>
    </div>
  )
}
