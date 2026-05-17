"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PhoneCall, CurrencyDollar, Star, Warning, ArrowUpRight, Sparkle } from "@phosphor-icons/react/dist/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardTopbar } from "@/components/dashboard/topbar"
import { calls } from "@/lib/mock/calls"
import { customers } from "@/lib/mock/customers"
import { insights } from "@/lib/mock/insights"
import { fetchPulseDashboard, type PulseDashboard } from "@/lib/pulse-api"

function useCountUp(end: number, duration = 1400) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let raf: number
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min((t - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 4)
      setCount(eased * end)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [end, duration])
  return count
}

export default function DashboardOverviewPage() {
  const [pulse, setPulse] = useState<PulseDashboard | null>(null)

  useEffect(() => {
    fetchPulseDashboard().then(setPulse).catch(() => setPulse(null))
  }, [])

  const todaysCalls = pulse?.metrics.activeCalls ?? calls.length
  const recoveredRevenue = pulse?.metrics.recoveredRevenueToday ?? 267
  const topItem = pulse?.company.sampleItems[0]?.name ?? "Lavender Latte"
  const churnRiskCount = pulse?.memoryCandidates.filter((memory) => memory.status === "pending").length ?? customers.filter((c) => c.churnRisk === "high").length
  const recentCalls = pulse?.activeCalls ?? calls
  const heading = pulse ? `${pulse.company.name} catalog concierge` : "Today at Sarah's Bakery"
  const subtitle = pulse ? `${pulse.company.catalogCount.toLocaleString()} rows · ${pulse.company.catalogLabel}` : "Today at Sarah's Bakery — Saturday, May 16, 2026"

  const cTodays = Math.round(useCountUp(todaysCalls))
  const cRevenue = Math.round(useCountUp(recoveredRevenue))
  const cChurn = Math.round(useCountUp(churnRiskCount))

  return (
    <>
      <DashboardTopbar title="Overview" subtitle={subtitle} />
      <div className="p-6 lg:px-12 lg:py-10 space-y-8 w-full">
        <div className="rounded-2xl border border-border bg-card/70 px-5 py-4">
          <div className="text-sm uppercase tracking-wider text-muted-foreground">Live source</div>
          <div className="mt-1 text-2xl font-medium">{heading}</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {pulse ? "Connected to Railway API via NEXT_PUBLIC_API_URL." : "Using mock fallback until Railway API is configured."}
          </p>
        </div>
        {/* Stat cards — way bigger numbers + roomier cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="p-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <PhoneCall className="w-4 h-4" weight="duotone" /> Calls today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-6xl lg:text-7xl font-medium leading-none">{cTodays}</div>
              <div className="text-sm text-emerald-400/90">100% answered</div>
            </CardContent>
          </Card>

          <Card className="p-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CurrencyDollar className="w-4 h-4" weight="duotone" /> Recovered revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-6xl lg:text-7xl font-medium leading-none">${cRevenue}</div>
              <div className="text-sm text-muted-foreground">vs. baseline (8 answered/day)</div>
            </CardContent>
          </Card>

          <Card className="p-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Star className="w-4 h-4" weight="duotone" /> Top recommended
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl lg:text-4xl font-medium leading-tight">{topItem}</div>
              <div className="text-sm text-muted-foreground">14 orders this week (from 2)</div>
            </CardContent>
          </Card>

          <Card className="p-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Warning className="w-4 h-4" weight="duotone" /> Churn risk
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-6xl lg:text-7xl font-medium leading-none">{cChurn}</div>
              <div className="text-sm text-muted-foreground">customers to win back</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent calls (full list) + wins panel — both grow to fill vertical space */}
        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2 p-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                Recent calls
                <Link
                  href="/dashboard/calls"
                  className="text-sm font-normal text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  View all <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {recentCalls.map((c) => (
                  <div key={c.id} className="py-4 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium shrink-0">
                      {("customerNameSnapshot" in c ? c.customerNameSnapshot : c.customerName)
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-medium truncate">{"customerNameSnapshot" in c ? c.customerNameSnapshot : c.customerName}</div>
                      <div className="text-sm text-muted-foreground truncate">{"outcome" in c ? c.outcome : c.intent}</div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        (c.status === "active" || c.status === "ringing" || c.status === "context loaded" || c.status === "ordering")
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/10"
                          : c.status === "escalated"
                            ? "bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/10"
                            : ""
                      }
                    >
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="p-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkle className="w-4 h-4 text-primary" weight="fill" /> This week&apos;s wins
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {insights.map((i) => (
                <div key={i.id} className="space-y-1.5">
                  <div className="text-base font-medium leading-snug">{i.title}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{i.body}</p>
                  {i.metric && (
                    <div className="inline-block text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
                      {i.metric}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
