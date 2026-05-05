---
name: chat-session-streaming
description: Coordinate cross-layer streaming chat work in this repository. Use when tasks span frontend session state/rendering and backend /chat/stream SSE, model routing, or message persistence.
---

# Chat Session Streaming

## Purpose

Use this as the router skill for any end-to-end chat streaming change.

## Load Order

1. Always load [project-js-fullstack-conventions](../project-js-fullstack-conventions/SKILL.md) first.
2. Then load one or both specialized skills:
   - Frontend: [chat-session-streaming-frontend](../chat-session-streaming-frontend/SKILL.md)
   - Backend: [chat-session-streaming-backend](../chat-session-streaming-backend/SKILL.md)

## Routing Rules

1. UI/session store/rendering only -> frontend skill.
2. `/chat/stream`, provider SSE, DTO, model binding, persistence only -> backend skill.
3. Request/response contract or behavior across both layers -> both skills.

## Non-Negotiable Invariants

- Session isolation: stream updates must be scoped by session key plus request identity.
- Request payload contract: outbound `messages` cannot end with assistant placeholder; tail must be user prompt.
- New-session flow: backend returns `session-id` header; frontend migrates draft state to real session.
- Stop behavior: stopping current panel cannot implicitly kill another session's stream.
- Persistence semantics: one user message before stream call, one assistant message at stream end when content is non-empty.

## Cross-Layer Checklist

- DTO and frontend request body stay aligned (`messages`, `sessionId`, `modelId`, `responseFormat`).
- SSE parser compatibility remains valid for both OpenAI-compatible delta and DashScope full-text styles.
- Error path closes stream cleanly and does not double-write responses.
- Model binding rule remains consistent: bound session model cannot be switched silently.

## Validation

- `pnpm --filter @llm-chat-platform/portal exec tsc --noEmit`
- `pnpm --filter @llm-chat-platform/backend run tsc`
- Manual: stream in A, switch to B, stop B, return to A; verify no cross-session pollution.
