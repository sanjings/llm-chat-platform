---
name: chat-session-streaming-frontend
description: Implement and debug frontend multi-session streaming chat behavior in this repository. Use when requests mention conversation switching, stream rendering isolation, stop generation, cooperative cancel fallback, stream error display, first-message display, draft session migration, or chat window layout regressions.
---

# Chat Session Streaming Frontend

## Scope

- `apps/frontend/portal/src/store/chat.ts`
- `apps/frontend/portal/src/views/chat/index.tsx`
- `apps/frontend/portal/src/views/chat/components/Session/index.tsx`
- `apps/frontend/portal/src/views/chat/components/Window/index.tsx`
- `apps/frontend/portal/src/views/chat/components/Window/Message/index.tsx`
- `apps/frontend/portal/src/views/chat/components/Window/Prompt/index.tsx`
- `apps/frontend/portal/src/services/api/chat.ts`
- `apps/frontend/portal/src/utils/stream.ts`

## Project Conventions

- Load [project-js-fullstack-conventions](../project-js-fullstack-conventions/SKILL.md) before coding.
- Prefer arrow functions for new callbacks/helpers unless framework constraints require `function`.
- Keep code readable and direct; avoid adding extra abstraction layers for one-off logic.

## Hard Rules

1. Runtime state remains keyed by session (`messagesBySession`, `streamBySession`, `loadingBySession`).
2. Stream updates always target `sessionKey + requestId`; never append by current visible panel.
3. Outbound payload is normalized from local state and ends with user message.
4. Draft session (`__draft__`) migration to returned `session-id` must preserve messages and stream state. Register the header value through `onSessionId` / `streamBackendSessionIds` as soon as it arrives, so a draft conversation can still be cancelled.
5. Stop action must not abort immediately. Request cooperative cancel (`requestCancelChatStream`) and wait for the SSE to end naturally, so the client can still receive `save_failed`. Wait up to `CANCEL_STREAM_GRACE_MS` (8s); only on timeout or cancel-request failure fall back to aborting the local controller. Preserve assistant text that was already received.
6. After fallback abort, verify whether content was saved only by querying `requestSessionMessagesSessionId`. Do not call `loadSessionMessages`: it replaces local state with server history and would wipe an unsaved assistant bubble the user still needs to copy.
7. `ChatStreamError` is collected until the stream ends, then surfaced once (antd `message.error`) so a later `save_failed` is not dropped. An upstream HTTP 200 `data.error` frame (e.g. insufficient balance) is a visible failure; our own `type: 'chat-error'` frame is not an upstream error.
8. A user-initiated stop produces `AbortError`; do not show it as a failure toast. Keep the stream status as stopped and keep the partial content.
9. Remove the empty assistant placeholder only when the request produced neither `content` nor `reasoning`.
10. Empty/new-window rendering logic uses message length, not only route param.
11. Chat layout keeps prompt pinned at bottom (`flex: 1` handling in history container).

## Workflow

1. Confirm route session id and selected session id stay in sync.
2. In `sendMessage`:
   - append optimistic user + assistant placeholder to the target session key
   - compute normalized request payload from store messages
   - stream deltas through buffered flush (rAF batching)
   - record the `session-id` header via `onSessionId` for cooperative cancel
3. In stream parser:
   - keep compatibility for OpenAI-compatible delta chunks
   - keep compatibility for DashScope full-text chunks
   - keep reasoning separate from content
   - queue `chat-error` events and throw `ChatStreamError` after the stream ends
   - treat upstream `data.error` frames as failures
4. In session switching:
   - never auto-abort unrelated session streams
   - subscribe UI rendering to selected session key only
5. In stop behavior:
   - mark stream stopped while keeping the current `requestId`, so pending deltas still land in the assistant bubble
   - request cooperative cancel with the real backend session id (from route or `streamBackendSessionIds`)
   - wait for `sendMessage` to clear its controller, with an 8s grace period
   - on cancel failure or timeout, abort locally and verify saved history without replacing local messages
   - never clear already received assistant content
6. On completion/error:
   - cancel pending rAF, flush deltas, remove only truly empty assistant placeholders
   - migrate draft messages/stream state to the real session id when the request started without a session
   - surface stream errors through `message.error`
7. In layout regressions, check the empty/history/skeleton branches and prompt placement together.

## Frequent Regression Patterns

- Cross-session pollution when flushing buffered deltas without request guard.
- Aborting immediately on stop, losing the SSE `save_failed` hint.
- Calling `loadSessionMessages` after fallback abort and overwriting the unsaved local bubble.
- Showing a failure toast for the user's own AbortError.
- Not registering `onSessionId`, so a draft conversation cannot be cancelled cooperatively.
- Swallowing `ChatStreamError` / upstream `data.error` and leaving the UI looking successful.
- Removing an assistant placeholder that actually has reasoning only.
- First message in new chat not rendered until session list reload.
- Accidentally sending empty assistant placeholder to backend.
- Skeleton or loading container pushes prompt upward.
- Abort logic cancels wrong session due to shared controller key mistakes.

## Verification

- `pnpm --filter @llm-chat-platform/portal exec tsc --noEmit`
- Check lints on changed frontend files.
- Manual:
  - Start stream in session A, switch to B, ensure B stays clean.
  - Start first message in draft chat, verify immediate render and draft->real session migration.
  - Stop current stream and confirm other sessions continue normally.
  - Stop during generation and confirm partial content stays visible and the SSE closes within the grace period.
  - If save fails, confirm the visible "未能保存" hint and that the local bubble is still copyable.
