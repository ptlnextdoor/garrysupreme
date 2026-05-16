"use client"

import dynamic from "next/dynamic"
import { useGrainientPalette } from "@/lib/use-grainient-palette"

const Grainient = dynamic(() => import("@/components/grainient"), { ssr: false })

export function GrainientBackground() {
  const { palette } = useGrainientPalette()

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <Grainient
        color1={palette.color1}
        color2={palette.color2}
        color3={palette.color3}
        timeSpeed={0.2}
        grainAmount={0.08}
        grainScale={2.4}
        contrast={1.1}
        saturation={0.9}
        zoom={1.0}
        warpStrength={0.9}
      />
    </div>
  )
}
