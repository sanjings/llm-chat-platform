---
name: chat-session-streaming-frontend
description: Implement and debug frontend multi-session streaming chat behavior in this repository. Use when requests mention conversation switching, stream rendering isolation, stop generation, first-message display, draft session migration, or chat window layout regressions.
---

# Chat Session Streaming Frontend

## Scope

- `frontend/src/store/chat.ts`
- `frontend/src/views/chat/index.tsx`
- `frontend/src/views/chat/components/Session/index.tsx`
- `frontend/src/views/chat/components/Window/index.tsx`
- `frontend/src/views/chat/components/Window/Message/index.tsx`
- `frontend/src/views/chat/components/Window/Prompt/index.tsx`
- `frontend/src/services/api/chat.ts`
- `frontend/src/utils/stream.ts`

## Project Conventions

- Load [project-js-fullstack-conventions](../project-js-fullstack-conventions/SKILL.md) before coding.
- Prefer arrow functions for new callbacks/helpers unless framework constraints require `function`.
- Keep code readable and direct; avoid adding extra abstraction layers for one-off logic.

## Hard Rules

1. Runtime state remains keyed by session (`messagesBySession`, `streamBySession`, `loadingBySession`).
2. Stream updates always target `sessionKey + requestId`; never append by current visible panel.
3. Outbound payload is normalized from local state and ends with user message.
4. Draft session (`__draft__`) migration to returned `session-id` must preserve messages and stream state.
5. Stop action only aborts the current session controller and preserves generated assistant text.
6. Empty/new-window rendering logic uses message length, not only route param.
7. Chat layout keeps prompt pinned at bottom (`flex: 1` handling in history container).

## Workflow

1. Confirm route session id and selected session id stay in sync.
2. In `sendMessage`:
   - append optimistic user + assistant placeholder to the target session key
   - compute normalized request payload from store messages
   - stream deltas through buffered flush (rAF batching)
3. In stream parser:
   - keep compatibility for OpenAI-compatible delta chunks
   - keep compatibility for DashScope full-text chunks
4. In session switching:
   - never auto-abort unrelated session streams
   - subscribe UI rendering to selected session key only
5. In stop behavior:
   - set status to stopped
   - avoid clearing already received assistant content

## Frequent Regression Patterns

- Cross-session pollution when flushing buffered deltas without request guard.
- First message in new chat not rendered until session list reload.
- Accidentally sending empty assistant placeholder to backend.
- Skeleton or loading container pushes prompt upward.
- Abort logic cancels wrong session due to shared controller key mistakes.

## Verification

- `pnpm -C frontend exec tsc --noEmit`
- Check lints on changed frontend files.
- Manual:
  - Start stream in session A, switch to B, ensure B stays clean.
  - Start first message in draft chat, verify immediate render and draft->real session migration.
  - Stop current stream and confirm other sessions continue normally.
