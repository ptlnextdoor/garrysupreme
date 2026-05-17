#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { applyPublicUrlToTools } from "./vapi-url.mjs";

const assistantId = process.env.VAPI_ASSISTANT_ID ?? "e629180c-f769-445d-923f-639c3c8ee37a";
const apiKey = process.env.VAPI_API_KEY;
const publicUrl = process.env.PUBLIC_URL ?? process.env.NGROK_URL ?? process.argv[2];

if (!apiKey) {
  console.error("Missing VAPI_API_KEY. Export it first, then rerun this script.");
  process.exit(1);
}

if (!publicUrl) {
  console.error("Missing PUBLIC_URL/NGROK_URL. Example: PUBLIC_URL=https://abc.ngrok-free.app npm run vapi:update:multilingual");
  process.exit(1);
}

const root = new URL("../", import.meta.url);
const systemPrompt = await readFile(new URL("vapi-system-prompt.txt", root), "utf8");
const toolsRaw = await readFile(new URL("vapi-tools.json", root), "utf8");
const tools = applyPublicUrlToTools(JSON.parse(toolsRaw), publicUrl, process.env.PULSE_DEMO_TOKEN);

const payload = {
  firstMessage: "Hello, Pulse here. I can help in English or Hindi. How can I help today? Namaste, main English ya Hindi mein madad kar sakta hoon. Aapko kya chahiye?",
  model: {
    provider: "openai",
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: systemPrompt }],
    tools
  },
  transcriber: {
    provider: "deepgram",
    model: "nova-3",
    language: "multi"
  },
  voice: {
    provider: "azure",
    voiceId: "multilingual-auto"
  }
};

const res = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

const text = await res.text();
if (!res.ok) {
  console.error(`Vapi update failed: ${res.status} ${res.statusText}`);
  console.error(text);
  process.exit(1);
}

console.log(`Updated Vapi assistant ${assistantId} for English + Hindi/Hinglish.`);
console.log(`Tool server URL base: ${publicUrl.replace(/\/$/, "")}`);
