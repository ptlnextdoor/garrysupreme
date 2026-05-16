import type { CSSProperties } from "react"

/**
 * Plain typographic "hey, G!" wordmark. No SVG, no positioning tricks —
 * just styled text. Size is controlled by the parent's font-size via
 * className / style.
 */
export function HeyGMark({
  className,
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-playfair)",
        fontStyle: "italic",
        fontWeight: 600,
        letterSpacing: "-0.03em",
        lineHeight: 1,
        whiteSpace: "nowrap",
        display: "inline-block",
        ...style,
      }}
    >
      hey, G!
    </span>
  )
}
