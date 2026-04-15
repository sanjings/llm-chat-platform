---
name: chat-session-streaming
description: Coordinate full-stack multi-session streaming chat changes in this project. Use when tasks span both frontend session rendering/state and backend /chat/stream SSE or message persistence logic.
---

# Chat Session Streaming

## Use This As Router Skill

Use this skill when the request is cross-layer. Then immediately load one or both specialized skills:

- Frontend: [chat-session-streaming-frontend](../chat-session-streaming-frontend/SKILL.md)
- Backend: [chat-session-streaming-backend](../chat-session-streaming-backend/SKILL.md)

## Routing Rules

1. If task is only UI/state/rendering, use frontend skill only.
2. If task is only `/chat/stream` SSE, provider mapping, or DB persistence, use backend skill only.
3. If task affects request contract and UI behavior together, use both skills.

## Shared Invariants

- Session isolation is mandatory; no cross-session stream pollution.
- Last outbound message for stream call must be a user prompt.
- Switching sessions must not implicitly kill other in-flight sessions unless explicitly requested.

## Minimal Validation

- `pnpm -C frontend exec tsc --noEmit`
- Manual: stream in session A, switch to B, ensure no pollution; switch back and confirm continuation.
