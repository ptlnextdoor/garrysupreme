"use client"

import { useEffect } from "react"
import { MobileNav } from "@/components/dashboard/mobile-nav"

export function DashboardTopbar({ title, subtitle }: { title: string; subtitle?: string }) {
  useEffect(() => {
    document.title = `${title} · hey, G!`
  }, [title])

  return (
    <div className="border-b border-border/60 bg-background/20 backdrop-blur-2xl sticky top-0 z-20 px-4 sm:px-6 lg:px-12 py-4">
      <div className="flex items-center gap-3">
        <MobileNav />
        <div className="min-w-0">
          <h1 className="text-xl font-medium truncate" style={{ fontFamily: "var(--font-playfair)" }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}
