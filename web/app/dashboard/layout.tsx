import type { ReactNode } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
