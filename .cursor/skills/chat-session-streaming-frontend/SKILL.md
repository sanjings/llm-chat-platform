---
name: chat-session-streaming-frontend
description: Implement and debug frontend multi-session streaming chat behavior. Use when the user mentions conversation switching, stream rendering isolation, stop generation, first-message display, or history skeleton layout in the chat UI.
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

## Hard Rules

1. Runtime state must be keyed by session (`messagesBySession`, `streamBySession`, `loadingBySession`).
2. Stream updates must target `sessionId + requestId`; never append blindly to current visible list.
3. Outbound payload must not include empty assistant placeholders; last message must be user.
4. Empty/new-window UI logic must use `messages.length`, not only route `sessionId`.
5. History skeleton container must keep `flex: 1` so prompt stays at bottom.

## Workflow

1. Confirm selected session object (`id`, `title`) and route param stay in sync.
2. For stream send:
   - write local optimistic user + assistant placeholder
   - normalize payload
   - enqueue delta and flush in batches (rAF)
3. For switching sessions:
   - do not auto-abort other sessions
   - ensure active panel subscribes to the selected session key only
4. For stop:
   - abort only the current session controller
   - keep already generated text

## Regression Checklist

- A streaming while viewing B does not pollute B.
- Returning to A shows ongoing stream or completed content.
- First send in new chat renders immediately.
- Stop affects only current session.
- Skeleton does not lift the input box.

## Verification

- `pnpm -C frontend exec tsc --noEmit`
- Check lints on changed files.
