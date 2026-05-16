"use client"
import { useCallback, useEffect, useState } from "react"

function useCountUp(end: number, duration = 2000) {
  const [count, setCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    if (!hasStarted) return

    let startTime: number
    let animationFrame: number

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)

      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setCount(easeOutQuart * end)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [end, duration, hasStarted])

  const start = useCallback(() => setHasStarted(true), [])

  return { count, start, hasStarted }
}

export function StatsSection() {
  const [isVisible, setIsVisible] = useState(false)

  const { count: missedCount, start: startMissed } = useCountUp(62, 2000)
  const { count: lostCount, start: startLost } = useCountUp(126, 2200)
  const { count: lepCount, start: startLep } = useCountUp(25, 2000)
  const { count: purchaseCount, start: startPurchase } = useCountUp(1.2, 2400)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
          startMissed()
          startLost()
          startLep()
          startPurchase()
        }
      },
      { threshold: 0.3 },
    )

    const section = document.getElementById("stats-section")
    if (section) observer.observe(section)

    return () => observer.disconnect()
  }, [isVisible, startMissed, startLost, startLep, startPurchase])

  const stats = [
    {
      value: `${Math.round(missedCount)}%`,
      label: "of SMB calls go unanswered",
      source: "Industry studies, 2025-26",
    },
    {
      value: `$${Math.round(lostCount)}K`,
      label: "avg annual revenue lost per SMB",
      source: "Industry aggregate",
    },
    {
      value: `${Math.round(lepCount)}M+`,
      label: "Americans with limited English",
      source: "US Census",
    },
    {
      value: `$${purchaseCount.toFixed(1)}T`,
      label: "purchasing power from LEP households",
      source: "Frederick Interpreting",
    },
  ]

  return (
    <section id="stats-section" className="py-24 px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mb-3">The broken interface</p>
          <h2
            className="text-3xl md:text-5xl font-normal text-foreground max-w-3xl mx-auto text-balance"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            The numbers your business probably doesn&apos;t talk about.
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`text-left transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${200 + i * 100}ms` }}
            >
              <p className="font-light text-foreground mb-2 text-5xl md:text-6xl leading-none">{stat.value}</p>
              <p className="text-sm text-foreground/80 mt-3">{stat.label}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-2">{stat.source}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
