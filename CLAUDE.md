# Pulse — Multi-Agent Build

This is a hackathon project being built by multiple Claude Code instances simultaneously.

## Project
Pulse — AI voice concierge with persistent customer memory. Tech: Vapi + GBrain + GStack + Fastify + Next.js.

## Communication
All instances communicate via `workflow/`. Read `workflow/PROTOCOL.md` for the full protocol.

## Your Role
Read your role file in `roles/` to understand what you do:
- `roles/CEO.md` — orchestrator
- `roles/SMART_CODER.md` — complex code (Opus 4.7)
- `roles/STUPID_CODER.md` — scaffolding (Sonnet)
- `roles/DEBUGGER.md` — code review (Opus 4.7)
- `roles/BOARD_MEMBER.md` — human interface

## Critical Rules
1. NEVER modify files you don't own (see your role file for ownership)
2. ALWAYS use the task file protocol for communication
3. Code goes in the project directory structure, NOT in workflow/
4. Check workflow/STATUS.md for current state before starting
5. The demo matters more than code quality. Ship > perfect.

## Architecture Reference
- `OPUS_INIT_PROMPT.md` — full system architecture
- `SMART_CODER_PROMPT.md` — code specs
- `STUPID_CODER_PROMPT.md` — scaffolding specs
- `pulse_final_build_plan_with_vapi_v2.0.md` — detailed build plan
- `heyg_spec.md` — product spec
