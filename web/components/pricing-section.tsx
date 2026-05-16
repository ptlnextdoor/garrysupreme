"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

const tiers = [
  {
    name: "Starter",
    price: "$99",
    cadence: "/mo",
    calls: "300 calls included",
    overage: "$0.35 per call over",
    bullets: [
      "Persistent customer profiles",
      "Multilingual voice",
      "Weekly insights",
      "Email support",
    ],
    highlighted: false,
    cta: "Start free trial",
  },
  {
    name: "Growth",
    price: "$249",
    cadence: "/mo",
    calls: "1,000 calls included",
    overage: "$0.25 per call over",
    bullets: [
      "Everything in Starter",
      "Advanced cross-sell recommendations",
      "Churn-risk alerts",
      "Priority support",
    ],
    highlighted: true,
    cta: "Start free trial",
  },
  {
    name: "Pro",
    price: "$499",
    cadence: "/mo",
    calls: "3,000 calls included",
    overage: "$0.15 per call over",
    bullets: [
      "Everything in Growth",
      "Multi-location support",
      "POS / website ingestion",
      "Dedicated onboarding",
    ],
    highlighted: false,
    cta: "Start free trial",
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    calls: "Unlimited calls",
    overage: "Custom per-call rate",
    bullets: [
      "Everything in Pro",
      "Custom voice + branding",
      "SLAs & data residency",
      "Dedicated account team",
    ],
    highlighted: false,
    cta: "Talk to sales",
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="py-32 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mb-3">Pricing</p>
          <h2
            className="text-4xl md:text-6xl font-normal mb-5 text-balance"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            5–10% of a part-time receptionist. 24/7.
          </h2>
          <p className="text-muted-foreground leading-relaxed text-lg max-w-2xl mx-auto">
            Setup takes 1–2 hours. No technical knowledge required. Cancel anytime.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              viewport={{ once: true }}
              className={`relative rounded-3xl border p-7 flex flex-col ${
                tier.highlighted
                  ? "border-primary bg-primary text-primary-foreground shadow-xl shadow-primary/10"
                  : "border-border bg-card"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.2em] bg-foreground text-background px-3 py-1 rounded-full">
                  Most popular
                </div>
              )}
              <div className="mb-1 text-sm uppercase tracking-wider opacity-80">{tier.name}</div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-medium">{tier.price}</span>
                <span className="text-sm opacity-70">{tier.cadence}</span>
              </div>
              <div className="text-sm font-medium mb-1">{tier.calls}</div>
              <div className="text-xs opacity-70 mb-6">{tier.overage}</div>
              <ul className="space-y-3 text-sm mb-8 flex-1">
                {tier.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        tier.highlighted ? "text-primary-foreground" : "text-primary"
                      }`}
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={tier.highlighted ? "secondary" : "default"}
                className={`w-full ${
                  tier.highlighted ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : ""
                }`}
              >
                {tier.cta}
              </Button>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          Underlying voice cost ≈ $0.15–$0.30 per call. Gross margin 70–85%.
        </p>
      </div>
    </section>
  )
}
