"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, PhoneCall, Users, Sparkles, Network, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/calls", label: "Live Calls", icon: PhoneCall },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/insights", label: "Insights", icon: Sparkles },
  { href: "/dashboard/gbrain", label: "GBrain", icon: Network },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-border bg-card h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-border">
        <Link href="/" className="flex items-center">
          <img src="/logo.svg" alt="hey, G!" className="h-9 w-auto" />
        </Link>
      </div>

      <div className="px-3 pt-4 pb-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground px-2 mb-2">Workspace</div>
        <div className="px-2 py-2 rounded-lg bg-muted/60">
          <div className="text-sm font-medium">Sarah's Bakery</div>
          <div className="text-xs text-muted-foreground">Mission, San Francisco</div>
        </div>
      </div>

      <nav className="flex-1 px-3 pt-3 space-y-1">
        {nav.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/80 hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to site
        </Link>
      </div>
    </aside>
  )
}
