---
name: chat-session-streaming
description: Coordinate cross-layer streaming chat work in this repository. Use when tasks span frontend session state/rendering and backend /chat/stream SSE, cooperative cancellation, stream errors, model routing, or message persistence.
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
2. `/chat/stream`, `/chat/stream/cancel`, provider SSE, DTO, model binding, persistence only -> backend skill.
3. Request/response contract or behavior across both layers -> both skills.

## Non-Negotiable Invariants

- Session isolation: stream updates must be scoped by session key plus request identity.
- Request payload contract: outbound `messages` cannot end with assistant placeholder; tail must be user prompt.
- New-session flow: backend returns `session-id` header; frontend registers it immediately and migrates draft state to the real session.
- Stop behavior: stopping current panel cannot implicitly kill another session's stream. It requests cooperative cancel and waits for the SSE to end (grace period, then fallback abort), so generated content and `save_failed` can still arrive.
- Persistence semantics: one user message before the stream call; one assistant message at stream end when `content` or `reasoning` is non-empty. Reasoning-only answers are saved with empty `content`; both empty means no assistant message.
- Error protocol: after SSE headers are sent, failures use `event: error` with `data: {"type":"chat-error","code","message"}` (`timeout` | `connection_closed` | `upstream_error` | `save_failed`). Upstream HTTP 200 `data.error` frames are failures, not normal completion.

## Cross-Layer Checklist

- DTO and frontend request body stay aligned (`messages`, `sessionId`, `modelId`, `responseFormat`).
- Cancel contract stays aligned: `POST /chat/stream/cancel` with `{ sessionId }`, only the owning user's active stream, idempotent after completion.
- SSE parser compatibility remains valid for both OpenAI-compatible delta and DashScope full-text styles, with reasoning kept separate from content.
- Error path closes stream cleanly and does not double-write responses; `save_failed` must reach the client while SSE is still open.
- Client disconnect is detected from `res.on('close')` only; upstream `aborted` is a model-side error.
- Model binding rule remains consistent: bound session model cannot be switched silently.

## Validation

- `pnpm --filter @llm-chat-platform/portal exec tsc --noEmit`
- `pnpm --filter @llm-chat-platform/backend run tsc`
- Manual: stream in A, switch to B, stop B, return to A; verify no cross-session pollution.
- Manual: stop mid-stream and confirm partial content persists, the SSE closes within the grace period, and save failures are visible.
