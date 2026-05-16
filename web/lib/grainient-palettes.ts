export type GrainientPalette = {
  id: string
  name: string
  color1: string
  color2: string
  color3: string
  /** Accent color used for the dashboard's primary UI (active nav, buttons). */
  accent: string
}

export const palettes: GrainientPalette[] = [
  { id: "lavender", name: "Lavender", color1: "#F4E4FF", color2: "#C9A7E8", color3: "#8D6FB8", accent: "#7B5BB0" },
  { id: "peach", name: "Peach", color1: "#FFE4D6", color2: "#FFB892", color3: "#E78B5F", accent: "#D26A3A" },
  { id: "sage", name: "Sage", color1: "#E8F2EA", color2: "#BCD7C3", color3: "#7DAA8E", accent: "#4F8A6B" },
  { id: "ocean", name: "Ocean", color1: "#D6EFFB", color2: "#9ECBE6", color3: "#5C8BB2", accent: "#356C97" },
  { id: "mocha", name: "Mocha", color1: "#F1E2CC", color2: "#D2A877", color3: "#7A5435", accent: "#6B4828" },
  { id: "rose", name: "Rose", color1: "#FBE0EA", color2: "#F1A9C2", color3: "#B16E8C", accent: "#9E4F70" },
  { id: "graphite", name: "Graphite", color1: "#EAEAEA", color2: "#B8B8B8", color3: "#5B5B5B", accent: "#3B3B3B" },
  { id: "amber", name: "hey, G! amber", color1: "#FBE0B8", color2: "#FD9D0F", color3: "#7A4A0A", accent: "#C57A0A" },
]

export const DEFAULT_PALETTE_ID = "lavender"
export const STORAGE_KEY = "heyg.grainient.palette"
