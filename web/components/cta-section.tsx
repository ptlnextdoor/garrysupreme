import { ArrowUpRight, ArrowRight } from "lucide-react"
import { TransitionLink } from "./transition-link"

export function CTASection() {
  return (
    <section className="py-32 px-6 relative overflow-hidden bg-background">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span
          className="text-[20vw] font-bold tracking-tighter leading-none text-zinc-100 whitespace-nowrap"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          ANSWER
        </span>
      </div>

      <div className="max-w-5xl mx-auto relative z-10 text-center">
        <h2
          className="text-4xl md:text-6xl font-normal leading-tight max-w-4xl mx-auto mb-6 text-balance"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          36 million small businesses miss 62% of their calls. We answer every single one.
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-10">
          14-day free trial. See ROI in week one. No credit card to start.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="relative flex items-center justify-center gap-0 bg-foreground text-background rounded-full pl-6 pr-1.5 py-1.5 transition-all duration-300 group overflow-hidden">
            <span className="text-sm pr-4">Start free trial</span>
            <span className="w-10 h-10 bg-background rounded-full flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-foreground" />
            </span>
          </button>

          <TransitionLink
            href="/dashboard"
            className="relative flex items-center justify-center gap-0 border border-border rounded-full pl-6 pr-1.5 py-1.5 transition-all duration-300 group overflow-hidden"
          >
            <span className="absolute inset-0 bg-foreground rounded-full scale-x-0 origin-right group-hover:scale-x-100 transition-transform duration-300" />
            <span className="text-sm text-foreground group-hover:text-background pr-4 relative z-10 transition-colors duration-300">
              See the live demo
            </span>
            <span className="w-10 h-10 rounded-full flex items-center justify-center relative z-10">
              <ArrowRight className="w-4 h-4 text-foreground group-hover:opacity-0 absolute transition-opacity duration-300" />
              <ArrowUpRight className="w-4 h-4 text-foreground group-hover:text-background opacity-0 group-hover:opacity-100 transition-all duration-300" />
            </span>
          </TransitionLink>
        </div>
      </div>
    </section>
  )
}
