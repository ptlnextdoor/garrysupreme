"use client"

import type { ReactNode, CSSProperties } from "react"
import { useGrainientPalette } from "@/lib/use-grainient-palette"

/**
 * Wraps the dashboard tree and rewrites the `--primary` / `--ring` /
 * `--sidebar-primary` CSS variables based on the active grainient palette so
 * the dashboard's accent color always matches the background.
 */
export function DashboardThemeScope({ children }: { children: ReactNode }) {
  const { palette } = useGrainientPalette()

  const style = {
    "--primary": palette.accent,
    "--ring": palette.accent,
    "--sidebar-primary": palette.accent,
    "--sidebar-ring": palette.accent,
  } as CSSProperties

  return (
    <div style={style} className="contents">
      {children}
    </div>
  )
}
