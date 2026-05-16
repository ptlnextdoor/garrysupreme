import { TrendingUp, AlertTriangle, Repeat, ChefHat } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardTopbar } from "@/components/dashboard/topbar"
import { insights } from "@/lib/mock/insights"

const iconFor = (kind: string) => {
  if (kind === "trend") return TrendingUp
  if (kind === "churn") return AlertTriangle
  if (kind === "cross-sell") return Repeat
  return ChefHat
}

const colorFor = (kind: string) => {
  if (kind === "trend") return "bg-emerald-100 text-emerald-800"
  if (kind === "churn") return "bg-rose-100 text-rose-800"
  if (kind === "cross-sell") return "bg-indigo-100 text-indigo-800"
  return "bg-amber-100 text-amber-800"
}

export default function InsightsPage() {
  return (
    <>
      <DashboardTopbar title="Insights" subtitle="What hey, G! learned about your business this week." />
      <div className="p-6 lg:p-10 max-w-5xl space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          {insights.map((i) => {
            const Icon = iconFor(i.kind)
            return (
              <Card key={i.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorFor(i.kind)}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {i.kind}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-medium mt-3">{i.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{i.body}</p>
                  {i.metric && (
                    <div className="mt-3 text-xs font-medium text-foreground/80">{i.metric}</div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card className="bg-muted/40 border-dashed">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Insights regenerate every night during the GBrain "dream cycle" — patterns are surfaced from the past 7
            days of call transcripts.
          </CardContent>
        </Card>
      </div>
    </>
  )
}
