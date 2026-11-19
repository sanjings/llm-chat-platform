---
name: chat-session-streaming-backend
description: Implement and debug backend SSE chat streaming behavior in this repository. Use when requests mention /chat/stream or /chat/stream/cancel protocol, DTO validation, provider forwarding, assistant accumulation, cooperative cancellation, session model binding, or stream-end persistence semantics.
---

# Chat Session Streaming Backend

## Scope

- `apps/backend/src/modules/chat/controllers/chat.controller.ts`
- `apps/backend/src/modules/chat/controllers/chat.controller.spec.ts`
- `apps/backend/src/modules/chat/services/chat.services.ts`
- `apps/backend/src/modules/chat/dtos/chat.dto.ts`
- `apps/backend/src/modules/chat/utils/assistant-sse.ts`
- `apps/backend/src/modules/chat/utils/assistant-sse.spec.ts`
- `apps/backend/src/modules/chat/utils/chat-stream-events.ts`
- `apps/backend/src/modules/session/services/session.service.ts`
- session/message persistence paths used by chat flow

## Project Conventions

- Load [project-js-fullstack-conventions](../project-js-fullstack-conventions/SKILL.md) before coding.
- Prefer arrow functions for new local callbacks/closures where possible.
- Keep service logic explicit; do not split into extra indirection unless reused across multiple flows.

## Hard Rules

1. `/chat/stream` contract remains: `messages`, optional `sessionId`, optional `modelId`, optional `responseFormat`.
2. Validate and normalize context before provider call; reject if last message is not user.
3. Persist one user message per request before opening provider stream.
4. Forward provider SSE chunks as-is to client; frontend parser depends on shape compatibility. Accumulate正文 and思考 separately through `assistant-sse` helpers; never merge reasoning into content.
5. Accumulate assistant text safely across partial SSE lines and flush the trailing line at stream end. Save once per finished stream.
6. Save the assistant message when either `content.trim()` or `reasoning.trim()` is non-empty. A reasoning-only answer is persisted with `content` as an empty string (Prisma `Message.content` is required). Only skip saving when both are empty.
7. Return `session-id` header on stream response.
8. Use a single `finalized` guard so end / error / client disconnect / cooperative cancel persist and close at most once. Error and end branches must not double-write.
9. After SSE headers are sent, report failures as `event: error` with `data: {"type":"chat-error","code","message"}`. Codes are `timeout` | `connection_closed` | `upstream_error` | `save_failed`. `save_failed` uses the explicit copy from `chat-stream-events.ts` and must be written while the SSE response is still open. If headers were not sent yet, return a classified JSON error instead.
10. An upstream HTTP 200 stream can still report failure in an SSE `data.error` frame (for example insufficient balance). Treat it as `upstream_error` after saving any generated content, rather than ending silently. `assistant-sse.upstreamErrorMessageFromFrame` extracts the message and must ignore our own `type: 'chat-error'` frames.
11. Only `res.on('close')` means the browser disconnected. Do not treat the upstream axios stream's `stream.on('aborted')` as a client stop: that is a model-side interruption and should flow through the error path, otherwise the client can hang without an error event.
12. Cooperative cancel: `POST /chat/stream/cancel` with `ChatStreamCancelDto` (`sessionId`), requires login, and only cancels an active stream owned by the same user. Unknown/already-finished streams are an idempotent success. Track in-flight streams in `activeStreams` keyed by `sessionId`, and set `cancelRequested` before `stream.destroy()` so a synchronous destroy error is not treated as an upstream failure.
13. If session is already bound to model, conflicting request model must be rejected.

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
   - register the stream in `activeStreams` and set SSE headers including `session-id`
   - on `data`: `res.write`, accumulate content/reasoning, and finish with `upstream_error` if an upstream error frame was seen
   - on `error`: ignore when `cancelRequested`; otherwise finish through the error path
   - on `end`: flush the line buffer, save, close response
   - on `res close`: finish via the disconnect path and destroy the upstream stream
6. In `finish`:
   - disconnect: save generated content best-effort, then stop (client cannot receive events)
   - error before headers: return classified JSON failure
   - otherwise save partial content, emit error events (including `save_failed`), then end
7. In `/chat/stream/cancel`:
   - look up `activeStreams` by trimmed `sessionId`
   - ignore entries owned by another user
   - remove the entry before awaiting cancel to avoid re-entry
   - cancel sets `cancelRequested`, destroys the upstream stream, then runs the normal save/finish path

## Frequent Regression Patterns

- Provider parser drift: backend forwarding changes break frontend `readStream`.
- Missing final line flush causes truncated assistant save.
- Saving only on non-empty `content` drops reasoning-only answers; saving both empty creates blank assistant messages.
- Duplicate assistant save from repeated end/error/disconnect/cancel handling.
- Treating a destroy-induced error during cooperative cancel as an upstream failure.
- Treating upstream `aborted` as a browser disconnect and skipping the error event.
- Swallowing an upstream HTTP 200 `data.error` frame or a `save_failed` event.
- Writing an error event after the response ended or after the client disconnected.
- `session-id` header not set in some error/success branches.
- New provider/model mapping bypasses existing bound-model guard.

## Regression Checklist

- `session-id` header present for successful stream response.
- Assistant message persisted once when content or reasoning is non-empty.
- Reasoning-only answer saved with empty `content`; fully empty answer leaves no assistant message.
- Partial JSON lines do not crash accumulator.
- OpenAI-compatible and DashScope parsing remain valid.
- After headers are sent, stream failures produce a `chat-error` event instead of ending silently.
- Upstream `data.error` frames become visible failures, not silent completion.
- Cooperative cancel saves partial output and still delivers `save_failed` when needed.
- Cancel from another user does not stop the stream; cancel after completion returns success.
- Stream error path does not leave hanging response.
- Bound session model mismatch returns clear 400.

## Verification

- `pnpm --filter @llm-chat-platform/backend run tsc`
- Targeted: `pnpm --filter @llm-chat-platform/backend run test -- chat.controller.spec.ts assistant-sse.spec.ts`
- Optional targeted check: `/chat/stream` manual call with both providers if environment supports it.
