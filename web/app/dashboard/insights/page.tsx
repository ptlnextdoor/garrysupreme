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
      <div className="p-6 lg:px-12 lg:py-10 w-full space-y-6">
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {insights.map((i) => {
            const Icon = iconFor(i.kind)
            return (
              <Card key={i.id} className="p-3">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorFor(i.kind)}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <Badge variant="secondary" className="capitalize text-xs">
                      {i.kind}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-medium mt-4 leading-snug">{i.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-base text-muted-foreground leading-relaxed">{i.body}</p>
                  {i.metric && (
                    <div className="inline-block text-sm font-medium text-primary bg-primary/10 rounded-full px-3 py-1">
                      {i.metric}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card className="bg-muted/40 border-dashed">
          <CardContent className="p-6 text-base text-muted-foreground">
            Insights regenerate every night during the GBrain "dream cycle" — patterns are surfaced from the past 7
            days of call transcripts.
          </CardContent>
        </Card>
      </div>
    </>
  )
}
