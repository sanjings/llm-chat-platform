---
name: chat-session-streaming-backend
description: Implement and debug backend SSE chat streaming behavior in this repository. Use when requests mention /chat/stream protocol, DTO validation, provider forwarding, assistant accumulation, session model binding, or stream-end persistence semantics.
---

# Chat Session Streaming Backend

## Scope

- `backend/src/modules/chat/controllers/chat.controller.ts`
- `backend/src/modules/chat/services/chat.services.ts`
- `backend/src/modules/chat/dtos/chat.dto.ts`
- `backend/src/modules/session/services/session.service.ts`
- session/message persistence paths used by chat flow

## Project Conventions

- Load [project-js-fullstack-conventions](../project-js-fullstack-conventions/SKILL.md) before coding.
- Prefer arrow functions for new local callbacks/closures where possible.
- Keep service logic explicit; do not split into extra indirection unless reused across multiple flows.

## Hard Rules

1. `/chat/stream` contract remains: `messages`, optional `sessionId`, optional `modelId`, optional `responseFormat`.
2. Validate and normalize context before provider call; reject if last message is not user.
3. Persist one user message per request before opening provider stream.
4. Forward provider SSE chunks as-is to client; frontend parser depends on shape compatibility.
5. Accumulate assistant final text safely across partial SSE lines and save once at stream end.
6. Save assistant message only when content is non-empty after trim.
7. Return `session-id` header on stream response.
8. Error and end branches must close response cleanly and avoid double-write.
9. If session is already bound to model, conflicting request model must be rejected.

## Workflow

1. Validate DTO and normalize context budget:
   - keep all `system`
   - keep recent dialog
   - trim by max chars while preserving final user prompt
2. Resolve effective model:
   - read session binding when `sessionId` exists
   - reject request model mismatch against bound model
   - map model to provider/model pair
3. Persist user message and ensure session existence/binding.
4. Open provider stream with correct headers, timeout, and auth.
5. In controller stream handlers:
   - on `data`: `res.write` and accumulate assistant text
   - on `error`: return proper failure or end open stream
   - on `end`: flush line buffer, save assistant text, close response

## Frequent Regression Patterns

- Provider parser drift: backend forwarding changes break frontend `readStream`.
- Missing final line flush causes truncated assistant save.
- `session-id` header not set in some error/success branches.
- Duplicate assistant save from repeated end/error handling.
- New provider/model mapping bypasses existing bound-model guard.

## Regression Checklist

- `session-id` header present for successful stream response.
- Assistant text persisted once per completed stream.
- Partial JSON lines do not crash accumulator.
- OpenAI-compatible and DashScope parsing remain valid.
- Stream error path does not leave hanging response.
- Bound session model mismatch returns clear 400.

## Verification

- `pnpm -C backend run tsc`
- Optional targeted check: `/chat/stream` manual call with both providers if environment supports it.
