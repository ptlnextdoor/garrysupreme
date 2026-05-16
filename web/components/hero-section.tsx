"use client"
import { useEffect, useState } from "react"
import { Phone } from "lucide-react"
import { AnimatedText } from "./animated-text"

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    let rafId: number
    let currentProgress = 0

    const handleScroll = () => {
      const scrollY = window.scrollY
      const maxScroll = 400
      const targetProgress = Math.min(scrollY / maxScroll, 1)

      const smoothUpdate = () => {
        currentProgress += (targetProgress - currentProgress) * 0.1

        if (Math.abs(targetProgress - currentProgress) > 0.001) {
          setScrollProgress(currentProgress)
          rafId = requestAnimationFrame(smoothUpdate)
        } else {
          setScrollProgress(targetProgress)
        }
      }

      cancelAnimationFrame(rafId)
      smoothUpdate()
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      cancelAnimationFrame(rafId)
    }
  }, [])

  const easeOutQuad = (t: number) => t * (2 - t)
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

  const scale = 1 - easeOutQuad(scrollProgress) * 0.15
  const borderRadius = easeOutCubic(scrollProgress) * 48
  const heightVh = 100 - easeOutQuad(scrollProgress) * 37.5

  return (
    <section className="pt-32 pb-12 px-6 min-h-screen flex items-center relative overflow-hidden">
      <div className="absolute inset-0 top-0">
        <div
          className="w-full will-change-transform overflow-hidden bg-gradient-to-br from-amber-900 via-orange-800 to-rose-900"
          style={{
            transform: `scale(${scale})`,
            borderRadius: `${borderRadius}px`,
            height: `${heightVh}vh`,
          }}
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-80"
            src="https://videos.pexels.com/video-files/4434242/4434242-uhd_2560_1440_30fps.mp4"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 w-full overflow-hidden pointer-events-none z-[5] flex items-end justify-center"
        style={{
          transform: `translateY(${scrollProgress * 150}px)`,
          opacity: 1 - scrollProgress * 0.8,
          height: "100%",
        }}
      >
        <span
          className="block text-white font-bold text-[24vw] sm:text-[22vw] md:text-[20vw] lg:text-[18vw] tracking-tighter select-none text-center leading-none"
          style={{ marginBottom: "0", fontFamily: "var(--font-playfair)" }}
        >
          hey, G!
        </span>
      </div>

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="text-center mb-12">
          <div
            className={`transition-all duration-1000 delay-[800ms] ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
            }`}
          >
            <h1
              className="text-[2.5rem] sm:text-[3.25rem] md:text-[4rem] lg:text-[4.75rem] xl:text-[5.5rem] font-normal leading-tight mb-6 w-full px-4 max-w-5xl mx-auto text-balance text-white"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              <AnimatedText
                text="An AI voice concierge that knows your business — and every customer who calls."
                delay={0.3}
              />
            </h1>
            <p
              className={`max-w-2xl mx-auto text-white/85 text-base md:text-lg px-6 transition-opacity duration-1000 delay-[1400ms] ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              Every business could talk to every customer — simultaneously, in their language, remembering everything.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-8">
          <div
            className={`relative w-full max-w-[420px] will-change-transform transition-all duration-[1500ms] ease-out delay-500 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[400px]"
            }`}
          >
            <div className="rounded-3xl bg-white/95 backdrop-blur border border-white/40 shadow-2xl p-6 text-left">
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-200">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-zinc-500">Live call · Sarah's Bakery</div>
                  <div className="text-sm font-medium text-zinc-900">Maria · returning customer</div>
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  on call
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex">
                  <div className="rounded-2xl rounded-bl-sm bg-zinc-100 px-3 py-2 text-zinc-800 max-w-[85%]">
                    I want something sweet, like chai, but cold.
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3 py-2 max-w-[90%]">
                    You'd love the Iced Chai Latte — like your usual hot chai but cold and refreshing. Want me to add
                    that cardamom you love?
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-200 text-[11px] text-zinc-500 leading-relaxed">
                Pulled from <span className="font-medium text-zinc-700">Company Brain</span> (menu, ingredients) +{" "}
                <span className="font-medium text-zinc-700">Customer Brain</span> (Maria prefers cardamom, oat milk).
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
