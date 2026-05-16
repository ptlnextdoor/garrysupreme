"use client"

import { motion } from "framer-motion"
import { Brain, History, Languages, PhoneCall, Sparkles, LineChart } from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "Two Brains",
    body: "Company Brain knows every menu item, ingredient, allergen and policy. Customer Brain knows the caller's order history, taste, dietary needs and language. Both stored as plain markdown — human-auditable, no vendor lock-in.",
  },
  {
    icon: History,
    title: "Persistent memory",
    body: "Every call updates the customer's profile automatically. The 50th call is dramatically better than the 1st — the memory compounds.",
  },
  {
    icon: Languages,
    title: "Multilingual",
    body: "Speaks any language the caller does. 25M+ Americans have limited English proficiency — that's $1.2T in purchasing power most businesses can't reach.",
  },
  {
    icon: PhoneCall,
    title: "Unlimited parallel calls",
    body: "5 people calling at once during your lunch rush? hey, G! answers all of them, instantly, 24/7. No more voicemail.",
  },
  {
    icon: Sparkles,
    title: "Personalized recommendations",
    body: "Merges Company Brain and Customer Brain in real time. Personalized businesses generate 10–30% more revenue (McKinsey).",
  },
  {
    icon: LineChart,
    title: "Weekly business intelligence",
    body: "Insights like “40% of customers who asked for recommendations chose red velvet” and churn alerts the moment a regular goes quiet.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-32 px-6 relative overflow-hidden bg-background">
      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-center pointer-events-none z-0">
        <span className="font-bold text-center text-[20vw] sm:text-[18vw] md:text-[16vw] lg:text-[14vw] leading-none tracking-tighter text-zinc-100 whitespace-nowrap">
          MEMORY
        </span>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mb-3">How it works</p>
          <h2
            className="text-4xl md:text-6xl font-normal mb-5 text-balance"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Two brains, one conversation.
          </h2>
          <p className="text-muted-foreground leading-relaxed text-lg max-w-2xl mx-auto">
            Most AI voice bots forget you the moment the call ends. hey, G! remembers — and gets sharper with every
            interaction.
          </p>
        </motion.div>

        <div id="how-it-works" className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-border bg-card p-7"
          >
            <div className="text-xs uppercase tracking-[0.18em] text-primary mb-2">Company Brain</div>
            <h3 className="text-xl font-medium mb-3">Everything the business knows</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Menu items, ingredients, allergens, pricing, policies, seasonal specials, what's in stock, popular
              combinations, operating hours. Stored as markdown files the owner can read and edit.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-1 truncate">companies/sarahs/menu.md</span>
              <span className="rounded-md bg-muted px-2 py-1 truncate">companies/sarahs/policies.md</span>
              <span className="rounded-md bg-muted px-2 py-1 truncate">companies/sarahs/specials.md</span>
              <span className="rounded-md bg-muted px-2 py-1 truncate">companies/sarahs/hours.md</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-border bg-card p-7"
          >
            <div className="text-xs uppercase tracking-[0.18em] text-primary mb-2">Customer Brain</div>
            <h3 className="text-xl font-medium mb-3">Everything we've learned about this caller</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Order history, taste preferences, dietary needs, communication style, language, family context. Updated
              automatically after every interaction. Compounds over time.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-1 truncate">customers/maria.md</span>
              <span className="rounded-md bg-muted px-2 py-1 truncate">customers/tom.md</span>
              <span className="rounded-md bg-muted px-2 py-1 truncate">insights/weekly.md</span>
              <span className="rounded-md bg-muted px-2 py-1 truncate">customers/+15+others.md</span>
            </div>
          </motion.div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.body}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
