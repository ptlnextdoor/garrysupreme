import type { Call } from "./types"

export const calls: Call[] = [
  {
    id: "call_1",
    customerId: "c_aisha",
    customerNameSnapshot: "Aisha Rahman",
    startedAt: "2026-05-16T18:42:00Z",
    durationSec: 92,
    status: "active",
    outcome: "Iced Chai Latte ordered, oat milk, extra cardamom",
    transcript: [
      { speaker: "customer", text: "I want something sweet, like chai, but cold." },
      {
        speaker: "agent",
        text:
          "You'd love the Iced Chai Latte — it's like your usual hot chai but cold and refreshing. Want me to add that cardamom you love? Or since you liked the Coconut Cold Brew last week, I could do that with a chai flavor twist?",
      },
      { speaker: "customer", text: "Iced chai with extra cardamom please." },
      { speaker: "agent", text: "Got it — oat milk like always? Total is $5.75, pickup in about 6 minutes." },
      { speaker: "customer", text: "Yes, oat milk. Thanks!" },
    ],
  },
  {
    id: "call_2",
    customerId: "c_maria",
    customerNameSnapshot: "Maria Alvarez",
    startedAt: "2026-05-16T18:31:00Z",
    durationSec: 138,
    status: "completed",
    outcome: "1 dozen chocolate croissants ordered for Saturday pickup, nut-free confirmed",
    transcript: [
      { speaker: "customer", text: "Hola, quiero hacer un pedido para el sábado." },
      {
        speaker: "agent",
        text: "¡Hola Maria! ¿Tu pedido habitual? ¿Una docena de croissants de chocolate, sin nueces para tu hija?",
      },
      { speaker: "customer", text: "Sí exactamente, ¿pueden tenerlo a las 9?" },
      { speaker: "agent", text: "Perfecto, lo tendremos listo a las 9. Son $54." },
    ],
  },
  {
    id: "call_3",
    customerId: "c_tom",
    customerNameSnapshot: "Tom Kowalski",
    startedAt: "2026-05-16T18:14:00Z",
    durationSec: 64,
    status: "completed",
    outcome: "Large Lavender Latte, oat milk, extra sweet",
    transcript: [
      { speaker: "customer", text: "Hey, can I get my usual?" },
      { speaker: "agent", text: "Large lavender latte, oat milk, extra sweet — ready in 4 minutes. $6 on the card on file." },
      { speaker: "customer", text: "Perfect, see you in 5." },
    ],
  },
  {
    id: "call_4",
    customerId: "c_diego",
    customerNameSnapshot: "Diego Morales",
    startedAt: "2026-05-16T17:50:00Z",
    durationSec: 108,
    status: "completed",
    outcome: "Mango Refresher + GF seed bread, gluten-free confirmed",
    transcript: [
      { speaker: "customer", text: "Hi — anything new that's gluten-free?" },
      {
        speaker: "agent",
        text:
          "Hey Diego! Yes — the gluten-free seed bread is fresh today, and the Mango Refresher (you love that one) is in. The Coconut Cold Brew is also new and gluten-free. Want me to bundle the bread and a Mango?",
      },
      { speaker: "customer", text: "Yeah, let's do that." },
    ],
  },
  {
    id: "call_5",
    customerId: "c_priya",
    customerNameSnapshot: "Priya Iyer",
    startedAt: "2026-05-16T17:22:00Z",
    durationSec: 184,
    status: "completed",
    outcome: "4 hot chais, less sweet, extra cardamom, 1 chocolate croissant",
    transcript: [
      { speaker: "customer", text: "Namaste, char chai please — kam meetha, jaisa hamesha." },
      { speaker: "agent", text: "Namaste Priya! Chaar hot chai, kam meetha, extra cardamom — aur ek chocolate croissant?" },
      { speaker: "customer", text: "Haan, perfect." },
    ],
  },
  {
    id: "call_6",
    customerId: "c_sophie",
    customerNameSnapshot: "Sophie Laurent",
    startedAt: "2026-05-16T16:48:00Z",
    durationSec: 78,
    status: "completed",
    outcome: "Sourdough loaf + 2 almond croissants for weekend",
    transcript: [
      { speaker: "customer", text: "Bonjour! Ma commande du vendredi habituelle, s'il vous plaît." },
      { speaker: "agent", text: "Bonjour Sophie! Un pain au levain et deux croissants aux amandes pour ce weekend. $18.75." },
    ],
  },
  {
    id: "call_7",
    customerId: "c_marcus",
    customerNameSnapshot: "Marcus Webb",
    startedAt: "2026-05-16T16:12:00Z",
    durationSec: 48,
    status: "completed",
    outcome: "Red velvet slice to-go",
    transcript: [
      { speaker: "customer", text: "Hey, one slice of red velvet to go." },
      { speaker: "agent", text: "On its way, Marcus. $6.50 — ready in 2." },
    ],
  },
  {
    id: "call_8",
    customerId: "c_jay",
    customerNameSnapshot: "Jay Nguyen",
    startedAt: "2026-05-16T15:55:00Z",
    durationSec: 122,
    status: "completed",
    outcome: "Coconut cold brew, double shot",
    transcript: [
      { speaker: "customer", text: "Có món gì mới mà không có sữa?" },
      {
        speaker: "agent",
        text: "Chào Jay! Coconut Cold Brew mới — không có sữa, double shot như Jay thích. Sẽ sẵn sàng trong 3 phút.",
      },
    ],
  },
  {
    id: "call_9",
    customerId: null,
    customerNameSnapshot: "Unknown caller",
    startedAt: "2026-05-16T15:34:00Z",
    durationSec: 156,
    status: "completed",
    outcome: "New customer profile created — vegan, prefers cold drinks",
    transcript: [
      { speaker: "customer", text: "Hi, I'm new — do you have any vegan options?" },
      {
        speaker: "agent",
        text:
          "Welcome! Yes — the Coconut Cold Brew is fully vegan, and we can do the Mango Refresher dairy-free. What's your name so I can save your preferences for next time?",
      },
      { speaker: "customer", text: "Sarah Park." },
    ],
  },
  {
    id: "call_10",
    customerId: "c_lin",
    customerNameSnapshot: "Lin Chen",
    startedAt: "2026-05-16T15:08:00Z",
    durationSec: 312,
    status: "escalated",
    outcome: "Escalated to Sarah — complex custom cake design request",
    transcript: [
      { speaker: "customer", text: "I need a custom cake with my daughter's school logo on it." },
      {
        speaker: "agent",
        text:
          "That's a custom design — Sarah handles those personally. Let me connect you with her directly so she can sketch it with you.",
      },
    ],
  },
  {
    id: "call_11",
    customerId: "c_ben",
    customerNameSnapshot: "Ben Goldstein",
    startedAt: "2026-05-16T14:42:00Z",
    durationSec: 94,
    status: "completed",
    outcome: "Hot chai + almond croissant, tried suggested lavender latte upsell (declined)",
    transcript: [
      { speaker: "customer", text: "Hey, hot chai and an almond croissant." },
      {
        speaker: "agent",
        text:
          "On it. By the way — Aisha and Tom (our regulars) have been raving about the new lavender latte. Want to try one next time? On the house.",
      },
      { speaker: "customer", text: "Maybe next visit, thanks!" },
    ],
  },
]
