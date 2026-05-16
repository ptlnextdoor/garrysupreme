"use client"

import dynamic from "next/dynamic"
import { useGrainientPalette } from "@/lib/use-grainient-palette"

const Iridescence = dynamic(() => import("@/components/iridescence"), { ssr: false })

export function IridescenceBackground() {
  const { palette } = useGrainientPalette()

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <Iridescence
        key={palette.id}
        color={palette.iridescent}
        mouseReact={false}
        amplitude={0.1}
        speed={0.2}
      />
    </div>
  )
}
