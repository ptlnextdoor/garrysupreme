"use client"

import { Check } from "lucide-react"
import { DashboardTopbar } from "@/components/dashboard/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { palettes } from "@/lib/grainient-palettes"
import { useGrainientPalette } from "@/lib/use-grainient-palette"

export default function SettingsPage() {
  const { palette, setPalette } = useGrainientPalette()

  return (
    <>
      <DashboardTopbar title="Settings" subtitle="Tune your dashboard to taste." />
      <div className="p-6 lg:p-10 mx-auto max-w-5xl w-full space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Background palette</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              The grainient that sits behind the dashboard. Saved locally — no account required.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {palettes.map((p) => {
                const active = p.id === palette.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPalette(p.id)}
                    className={`relative rounded-xl overflow-hidden border p-3 text-left transition-all ${
                      active
                        ? "border-foreground/60 ring-2 ring-foreground/20"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <div
                      className="h-20 rounded-lg mb-3"
                      style={{
                        background: `linear-gradient(135deg, ${p.color1} 0%, ${p.color2} 55%, ${p.color3} 100%)`,
                      }}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{p.name}</span>
                      {active && (
                        <span className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
