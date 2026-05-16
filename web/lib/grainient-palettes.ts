export type GrainientPalette = {
  id: string
  name: string
  /** Swatch gradient — used for the preview chip in settings. */
  color1: string
  color2: string
  color3: string
  /** Base RGB color (each channel 0..1) for the iridescence shader. */
  iridescent: [number, number, number]
}

export const palettes: GrainientPalette[] = [
  {
    id: "midnight",
    name: "Midnight",
    color1: "#1E2A4A",
    color2: "#3D2F6B",
    color3: "#0B0F1E",
    iridescent: [0.0784, 0.1647, 0.3294],
  },
  {
    id: "ember",
    name: "Ember",
    color1: "#3A1208",
    color2: "#7A2E0E",
    color3: "#1A0604",
    iridescent: [0.38, 0.16, 0.08],
  },
  {
    id: "forest",
    name: "Forest",
    color1: "#0E2A1F",
    color2: "#1F4D3A",
    color3: "#06120B",
    iridescent: [0.08, 0.22, 0.16],
  },
  {
    id: "abyss",
    name: "Abyss",
    color1: "#08233A",
    color2: "#0F4263",
    color3: "#020A14",
    iridescent: [0.05, 0.18, 0.32],
  },
  {
    id: "espresso",
    name: "Espresso",
    color1: "#2A1A0E",
    color2: "#5A381E",
    color3: "#100804",
    iridescent: [0.22, 0.13, 0.07],
  },
  {
    id: "wine",
    name: "Wine",
    color1: "#2C0A18",
    color2: "#5A1330",
    color3: "#120208",
    iridescent: [0.26, 0.08, 0.16],
  },
  {
    id: "graphite",
    name: "Graphite",
    color1: "#161616",
    color2: "#2C2C2C",
    color3: "#080808",
    iridescent: [0.18, 0.18, 0.2],
  },
  {
    id: "amber",
    name: "hey, G! amber",
    color1: "#2A1A05",
    color2: "#5C3608",
    color3: "#0E0703",
    iridescent: [0.32, 0.18, 0.05],
  },
]

export const DEFAULT_PALETTE_ID = "midnight"
export const STORAGE_KEY = "heyg.grainient.palette"
