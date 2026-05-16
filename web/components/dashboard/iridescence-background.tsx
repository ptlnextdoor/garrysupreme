"use client"

import dynamic from "next/dynamic"
import { useGrainientPalette } from "@/lib/use-grainient-palette"

const Iridescence = dynamic(() => import("@/components/iridescence"), { ssr: false })

const DIM = 0.45

export function IridescenceBackground() {
  const { palette } = useGrainientPalette()
  const [r, g, b] = palette.iridescent
  const dimmed: [number, number, number] = [r * DIM, g * DIM, b * DIM]

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <Iridescence
        key={palette.id}
        color={dimmed}
        mouseReact={false}
        amplitude={0.1}
        speed={0.2}
      />
    </div>
  )
}
