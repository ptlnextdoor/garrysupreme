export function DashboardTopbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-border/60 bg-background/40 backdrop-blur-xl sticky top-0 z-20 pl-16 md:pl-6 lg:pl-12 pr-6 lg:pr-12 py-4">
      <h1 className="text-xl font-medium" style={{ fontFamily: "var(--font-playfair)" }}>
        {title}
      </h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  )
}
