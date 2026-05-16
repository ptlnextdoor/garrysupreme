"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PhoneCall, DollarSign, Star, AlertTriangle, ArrowUpRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardTopbar } from "@/components/dashboard/topbar"
import { calls } from "@/lib/mock/calls"
import { customers } from "@/lib/mock/customers"
import { insights } from "@/lib/mock/insights"

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
  const todaysCalls = calls.length
  const recoveredRevenue = 267
  const topItem = "Lavender Latte"
  const churnRiskCount = customers.filter((c) => c.churnRisk === "high").length

  const cTodays = Math.round(useCountUp(todaysCalls))
  const cRevenue = Math.round(useCountUp(recoveredRevenue))
  const cChurn = Math.round(useCountUp(churnRiskCount))

  const recent = calls.slice(0, 6)

  return (
    <>
      <DashboardTopbar
        title="Overview"
        subtitle="Today at Sarah's Bakery — Saturday, May 16, 2026"
      />
      <div className="p-6 lg:p-10 space-y-8 max-w-6xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5" /> Calls today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium">{cTodays}</div>
              <div className="text-xs text-emerald-700 mt-1">100% answered</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5" /> Recovered revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium">${cRevenue}</div>
              <div className="text-xs text-muted-foreground mt-1">vs. baseline (8 answered/day)</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Star className="w-3.5 h-3.5" /> Top recommended
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-medium leading-tight">{topItem}</div>
              <div className="text-xs text-muted-foreground mt-1">14 orders this week (from 2)</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Churn risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium">{cChurn}</div>
              <div className="text-xs text-muted-foreground mt-1">customers to win back</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Recent calls
                <Link
                  href="/dashboard/calls"
                  className="text-xs font-normal text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  View all <ArrowUpRight className="w-3 h-3" />
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {recent.map((c) => (
                  <div key={c.id} className="py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                      {c.customerNameSnapshot
                        .split(" ")
                        .map((w) => w[0])
                        .join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.customerNameSnapshot}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.outcome}</div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        c.status === "active"
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                          : c.status === "escalated"
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">This week's wins</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {insights.slice(0, 3).map((i) => (
                <div key={i.id}>
                  <div className="font-medium">{i.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{i.metric}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
