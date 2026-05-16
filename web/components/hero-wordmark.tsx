"use client"

import { useEffect, useRef } from "react"
import { animate, stagger } from "animejs"

const HEY_CHARS = ["h", "e", "y", ","]

export function HeroWordmark({ className }: { className?: string } = {}) {
  const rootRef = useRef<HTMLHeadingElement | null>(null)

  useEffect(() => {
    if (!rootRef.current) return
    const chars = rootRef.current.querySelectorAll<HTMLElement>("[data-ch]")
    if (chars.length === 0) return

    chars.forEach((c) => {
      c.style.opacity = "0"
      c.style.willChange = "transform, opacity, filter"
    })

    const anim = animate(chars, {
      opacity: [0, 1],
      translateY: [70, 0],
      rotateX: [-55, 0],
      filter: ["blur(12px)", "blur(0px)"],
      duration: 1100,
      delay: stagger(80, { start: 200 }),
      ease: "outExpo",
    })

    return () => {
      anim.pause()
    }
  }, [])

  return (
    <h1
      ref={rootRef}
      className={className}
      style={{
        // Sized to fit on any viewport — uses min(...) on the vw clause so
        // even at small windows the wordmark can never exceed the viewport.
        fontSize: "min(clamp(3.5rem, 18vw, 16rem), 30vh)",
        fontFamily: "var(--font-playfair)",
        fontStyle: "italic",
        fontWeight: 500,
        letterSpacing: "-0.04em",
        lineHeight: 0.95,
        color: "white",
        textShadow: "0 6px 28px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.35)",
        perspective: "900px",
        whiteSpace: "nowrap",
        // Generous padding for the "!" dot drop + italic flourishes
        padding: "0.08em 0.18em 0.2em 0.12em",
        // Use intrinsic width and never get clipped by ancestor flex sizing
        width: "max-content",
        maxWidth: "100vw",
        overflow: "visible",
        boxSizing: "border-box",
        display: "inline-block",
      }}
    >
      {/* "hey," at ~72% scale */}
      <span style={{ fontSize: "0.72em", verticalAlign: "baseline", marginRight: "0.04em" }}>
        {HEY_CHARS.map((ch, i) => (
          <span key={i} data-ch style={{ display: "inline-block" }}>
            {ch}
          </span>
        ))}
      </span>

      {/* "G" at full size */}
      <span data-ch style={{ display: "inline-block", marginLeft: "0.02em" }}>
        G
      </span>

      {/* "!" uses one real text glyph. A text-clipped gradient colors the
          stem and dot without creating a visible rectangular mask layer. */}
      <span
        data-ch
        style={{
          display: "inline-block",
          marginLeft: "0.02em",
          backgroundImage: "linear-gradient(to bottom, white 0%, white 74%, #fd9d0f 74%, #fd9d0f 100%)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.35)) drop-shadow(0 2px 6px rgba(0,0,0,0.3))",
        }}
      >
        !
      </span>
    </h1>
  )
}
