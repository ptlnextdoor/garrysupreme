"use client"
import { useEffect, useRef } from "react"
import { animate, onScroll, utils } from "animejs"
import { BlurText } from "./blur-text"

export function HeroSection() {
  const videoBoxRef = useRef<HTMLDivElement | null>(null)
  const heroRef = useRef<HTMLDivElement | null>(null)

  // Scroll-driven: video container rounds its corners; hero content floats up + fades.
  useEffect(() => {
    if (!videoBoxRef.current || !heroRef.current) return

    const videoAnim = animate(videoBoxRef.current, {
      borderRadius: ["0px", "48px"],
      ease: "linear",
      autoplay: onScroll({
        target: videoBoxRef.current,
        enter: "top top",
        leave: "bottom-=200 top",
        sync: true,
      }),
    })

    const heroAnim = animate(heroRef.current, {
      translateY: [0, -160],
      opacity: [1, 0],
      ease: "linear",
      autoplay: onScroll({
        target: videoBoxRef.current,
        enter: "top top",
        leave: "bottom-=200 top",
        sync: true,
      }),
    })

    return () => {
      utils.remove(videoAnim)
      utils.remove(heroAnim)
    }
  }, [])

  return (
    <section className="pt-28 min-h-screen relative">
      <div className="absolute inset-0 top-0 pointer-events-none">
        <div ref={videoBoxRef} className="w-full h-full overflow-hidden will-change-transform">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/af7687fd-f2ad-4f2a-96f0-b56fa7d3769c-08wERpo5U1sktxs1vcRsJW9ueslNZv.mp4"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/55" />
        </div>
      </div>

      <div
        ref={heroRef}
        className="relative z-10 min-h-[calc(100vh-7rem)] flex items-center justify-center px-6 will-change-transform"
      >
        <BlurText
          text="Answer every call. Remember every customer. In their language, at their pace."
          animateBy="words"
          delay={140}
          stepDuration={0.45}
          direction="top"
          className="max-w-5xl text-center text-white font-normal justify-center"
          style={{
            fontFamily: "var(--font-playfair)",
            fontStyle: "italic",
            fontWeight: 500,
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
            fontSize: "clamp(2.5rem, 6.5vw, 6rem)",
            textShadow: "0 6px 28px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.4)",
          }}
        />
      </div>
    </section>
  )
}
