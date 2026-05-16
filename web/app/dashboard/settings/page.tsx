import { DashboardTopbar } from "@/components/dashboard/topbar"

export default function SettingsPage() {
  return (
    <>
      <DashboardTopbar title="Settings" subtitle="Tune your dashboard to taste." />
      <div className="p-6 lg:px-12 lg:py-10 w-full">
        <p className="text-sm text-muted-foreground">No settings to configure yet.</p>
      </div>
    </>
  )
}
