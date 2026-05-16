import { TrendUp, Warning, ArrowsClockwise, ChefHat } from "@phosphor-icons/react/dist/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardTopbar } from "@/components/dashboard/topbar"
import { insights } from "@/lib/mock/insights"

const iconFor = (kind: string) => {
  if (kind === "trend") return TrendUp
  if (kind === "churn") return Warning
  if (kind === "cross-sell") return ArrowsClockwise
  return ChefHat
}

const colorFor = (kind: string) => {
  if (kind === "trend") return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
  if (kind === "churn") return "bg-rose-500/10 text-rose-300 border border-rose-500/20"
  if (kind === "cross-sell") return "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
  return "bg-amber-500/10 text-amber-300 border border-amber-500/20"
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
                      <Icon className="w-5 h-5" weight="duotone" />
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
            Insights regenerate every night during the GBrain &ldquo;dream cycle&rdquo; — patterns are surfaced from the past 7
            days of call transcripts.
          </CardContent>
        </Card>
      </div>
    </>
  )
}
