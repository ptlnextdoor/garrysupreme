import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
  {
    question: "Do I have to let anyone go?",
    answer:
      "No. Absolutely not. hey, G! is additive, not a replacement. You didn't hire your baker to answer phones — hey, G! answers the phone so your baker can bake. It handles the calls your team is already missing.",
  },
  {
    question: "How is this different from Bland.ai, Vapi, or Goodcall?",
    answer:
      "Every other voice AI treats each call as a blank slate. hey, G! doesn't. By the 50th call it knows your customer's name, usual order, dietary restrictions, language preference and family context — built on a persistent knowledge graph (GBrain). Bland and Vapi are developer platforms with no customer memory. Goodcall answers calls but doesn't learn over time. We're the only one whose value compounds.",
  },
  {
    question: "How much more will I actually make?",
    answer:
      "A bakery owner with 20 calls/day currently answering ~8 of them recovers an additional $267/day with hey, G! (more calls answered + personalized upsell). That's $8,010/month gross, $7,761/month net of the $249 plan — a 31× annual ROI. Even at half those numbers it's still 15×.",
  },
  {
    question: "How long does setup take?",
    answer:
      "1–2 hours. Upload your menu (or we'll do it for you during onboarding for the first 100 customers), connect your phone number, and customer profiles build automatically from calls. No technical knowledge required.",
  },
  {
    question: "Is my customer data private?",
    answer:
      "Yes. Customers call us, we don't cold-call them — every interaction is opt-in. Data is stored locally as markdown files you can read, edit, or delete. We're transparent about what's remembered, and the customer brain is yours, not a third-party silo.",
  },
  {
    question: "What happens if hey, G! can't handle a call?",
    answer:
      "Graceful fallback. If a request is too complex or nuanced, hey, G! says \"Let me connect you with Sarah directly\" and forwards the caller. Quality keeps improving — voice AI hit good-enough quality in 2025 and is still climbing.",
  },
]

export function FAQSection() {
  return (
    <section id="faq" className="py-32 px-6 pb-40 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mb-3">FAQ</p>
          <h2
            className="text-4xl md:text-5xl font-normal mb-6 text-balance"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Things every small business owner asks.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Straight answers, no fluff.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-3 py-0 my-0">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-foreground/30"
            >
              <AccordionTrigger className="text-left text-base font-medium text-foreground hover:no-underline py-5">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5 leading-relaxed text-sm">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
