export function DashboardTopbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-border bg-background sticky top-0 z-20 px-6 lg:px-10 py-4">
      <h1 className="text-xl font-medium" style={{ fontFamily: "var(--font-playfair)" }}>
        {title}
      </h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  )
}
