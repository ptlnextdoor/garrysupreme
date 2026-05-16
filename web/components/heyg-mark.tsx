import Image from "next/image"
import type { CSSProperties } from "react"

/**
 * hey, G! logo mark. Renders the wordmark image. Size is driven by the
 * parent's font-size (1em square), so existing call sites that used
 * `text-xl` etc. still work without code changes.
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
        display: "inline-flex",
        alignItems: "center",
        lineHeight: 1,
        ...style,
      }}
    >
      <Image
        src="/heyg-logo.png"
        alt="hey, G!"
        width={64}
        height={64}
        priority
        style={{
          height: "1.6em",
          width: "1.6em",
          objectFit: "contain",
          display: "block",
        }}
      />
    </span>
  )
}
