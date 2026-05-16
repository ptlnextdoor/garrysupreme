import type { Insight } from "./types"

export const insights: Insight[] = [
  {
    id: "i_red_velvet",
    kind: "menu",
    title: "Red Velvet is a hidden hit",
    body:
      "Your top-selling cake flavor is vanilla, but 40% of customers who asked for recommendations chose red velvet. Consider featuring it more prominently.",
    metric: "+40% conversion",
  },
  {
    id: "i_maria_churn",
    kind: "churn",
    title: "Maria hasn't ordered in 3 weeks",
    body: "She was a weekly customer with avg ticket $18.50. Recommend reach-out or a personalized return offer.",
    metric: "27 orders historical",
    customerId: "c_maria",
  },
  {
    id: "i_chai_lavender",
    kind: "cross-sell",
    title: "Chai → Lavender pattern",
    body:
      "67% of chai customers who tried the lavender latte ordered it again within 2 weeks. hey, G! is now auto-suggesting this pair.",
    metric: "67% repeat rate",
  },
  {
    id: "i_lep",
    kind: "trend",
    title: "Non-English calls up 28% this month",
    body:
      "Spanish, Vietnamese and Hindi calls grew from 12% to 28% of total volume. hey, G! handled all of them in-language — no manual translation needed.",
    metric: "+28% MoM",
  },
  {
    id: "i_lavender_growth",
    kind: "trend",
    title: "Lavender Latte: 2/wk → 14/wk",
    body:
      "Before hey, G! the lavender latte sold ~2/week. After 6 weeks of personalized recommendations: 14/week. Estimated +$2,400 monthly contribution.",
    metric: "+$2.4K / mo",
  },
  {
    id: "i_lin_churn",
    kind: "churn",
    title: "Lin Chen — custom-cake customer cold for 5 weeks",
    body: "Avg ticket $32. Birthday-cake orders are seasonal — hey, G! suggests a check-in or seasonal promo.",
    metric: "4 historical orders",
    customerId: "c_lin",
  },
]
