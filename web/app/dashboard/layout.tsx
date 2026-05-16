import type { ReactNode } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { GrainientBackground } from "@/components/dashboard/grainient-background"
import { DashboardThemeScope } from "@/components/dashboard/theme-scope"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardThemeScope>
      <div className="min-h-screen relative flex">
        <GrainientBackground />
        <DashboardSidebar />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </DashboardThemeScope>
  )
}
