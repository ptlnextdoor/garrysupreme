"use client"

import { useCallback, useEffect, useState } from "react"
import { DEFAULT_PALETTE_ID, STORAGE_KEY, palettes, type GrainientPalette } from "./grainient-palettes"

const findPalette = (id: string | null): GrainientPalette =>
  palettes.find((p) => p.id === id) ?? palettes.find((p) => p.id === DEFAULT_PALETTE_ID) ?? palettes[0]

const CHANGE_EVENT = "heyg-grainient-change"

export function useGrainientPalette() {
  const [palette, setPaletteState] = useState<GrainientPalette>(() => findPalette(DEFAULT_PALETTE_ID))

  useEffect(() => {
    const sync = () => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY)
        setPaletteState(findPalette(stored))
      } catch {
        // localStorage unavailable — keep default
      }
    }
    sync()

    const onCustom = () => sync()
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync()
    }
    window.addEventListener(CHANGE_EVENT, onCustom)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener(CHANGE_EVENT, onCustom)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  const setPalette = useCallback((id: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // ignore
    }
    setPaletteState(findPalette(id))
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  return { palette, setPalette }
}
