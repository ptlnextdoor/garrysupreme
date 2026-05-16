"use client"

import { usePathname } from "next/navigation"
import { SquaresFour, PhoneCall, Users, Sparkle, Graph, ArrowLeft, Gear } from "@phosphor-icons/react/dist/ssr"
import { cn } from "@/lib/utils"
import { HeyGMark } from "@/components/heyg-mark"
import { TransitionLink } from "@/components/transition-link"

const nav = [
  { href: "/dashboard", label: "Overview", icon: SquaresFour },
  { href: "/dashboard/calls", label: "Live Calls", icon: PhoneCall },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/insights", label: "Insights", icon: Sparkle },
  { href: "/dashboard/gbrain", label: "GBrain", icon: Graph },
  { href: "/dashboard/settings", label: "Settings", icon: Gear },
]

export function SidebarContents({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <>
      <div className="px-5 py-6 border-b border-border/60 flex items-center justify-center">
        <TransitionLink href="/" className="flex items-center justify-center" onClick={onNavigate}>
          <HeyGMark className="text-5xl text-foreground heyg-logo-shared" />
        </TransitionLink>
      </div>

      <div className="px-3 pt-4 pb-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground px-2 mb-2">
          Workspace
        </div>
        <div className="px-2 py-2 rounded-lg bg-muted/60">
          <div className="text-sm font-medium">Sarah's Bakery</div>
          <div className="text-xs text-muted-foreground">Mission, San Francisco</div>
        </div>
      </div>

      <nav className="flex-1 px-3 pt-3 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const Icon = item.icon
          const active =
            pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href))
          return (
            <TransitionLink
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/80 hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" weight={active ? "fill" : "regular"} />
              <span>{item.label}</span>
            </TransitionLink>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border/60">
        <TransitionLink
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to site
        </TransitionLink>
      </div>
    </>
  )
}

export function DashboardSidebar() {
  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-border/60 bg-background/20 backdrop-blur-2xl h-screen sticky top-0">
      <SidebarContents />
    </aside>
  )
}
