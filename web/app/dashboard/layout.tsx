import type { ReactNode } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { IridescenceBackground } from "@/components/dashboard/iridescence-background"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative flex">
      <IridescenceBackground />
      <DashboardSidebar />
      <div className="flex-1 min-w-0 dashboard-content">{children}</div>
    </div>
  )
}
