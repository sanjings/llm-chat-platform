---
name: chat-session-streaming-backend
description: Implement and debug backend SSE chat stream behavior. Use when the user mentions /chat/stream protocol, provider forwarding, assistant accumulation, session/message persistence, or stream-end save semantics.
---

# Chat Session Streaming Backend

## Scope

- `backend/src/modules/chat/controllers/chat.controller.ts`
- `backend/src/modules/chat/services/chat.services.ts`
- `backend/src/modules/chat/dtos/chat.dto.ts`
- session/message services used by chat flow

## Current Contract

1. `/chat/stream` receives `messages`, optional `sessionId`, optional `modelId`.
2. Service writes the latest user message first (`sendMsg`), creates session if needed.
3. Controller forwards provider SSE chunks to client unchanged.
4. Controller accumulates assistant final text from SSE and saves at stream end.
5. Response header includes `session-id`.

## Hard Rules

1. Persist exactly one user message per request before provider stream call.
2. Save assistant message only on valid non-empty final content.
3. Keep SSE forwarding format stable; frontend parser depends on provider shape.
4. Handle provider errors without leaving hanging response.
5. If request message tail is invalid (no user prompt), reject early with clear error.

## Workflow

1. Validate incoming `messages` contract.
2. Resolve provider/model/api-key consistently.
3. Stream to provider with timeout and proper auth headers.
4. In controller:
   - write chunks to client
   - accumulate assistant text
   - on end, flush remainder and save assistant text
5. Ensure response closes in both success and error branches.

## Regression Checklist

- `session-id` header always present.
- Assistant text is persisted once per completed stream.
- Partial JSON chunks do not crash accumulator.
- OpenAI-compatible and DashScope parsing both remain valid.
- Stream error path does not double-write response.
