---
name: project-js-fullstack-conventions
description: Apply repository-wide JavaScript/TypeScript fullstack coding conventions for this project. Use when implementing or refactoring frontend React/Zustand or backend NestJS/Prisma code, especially for style consistency, validation steps, and avoiding over-abstraction.
---

# Project JS Fullstack Conventions

## Purpose

Provide shared coding and delivery rules for `llm-chat-platform` so changes do not start from zero alignment each time.

## Stack Snapshot

- Frontend: React + TypeScript + Zustand + Ant Design + Vite.
- Backend: NestJS + Prisma + JWT + Swagger.
- Core feature: session-based SSE streaming chat with model routing and persistence.

## Coding Style (Mandatory)

1. Prefer arrow functions for new callbacks/helpers and local utility functions.
2. Keep code elegant but direct: avoid unnecessary abstractions, wrappers, or premature generic frameworks.
3. Use clear names based on business meaning (`sessionKey`, `requestId`, `normalizedMessages`) instead of single-letter variables.
4. Keep behavior close to usage site unless logic is reused or clearly complex enough to extract.
5. Maintain existing conventions and comments language in touched module.

## Architecture Rules

- Preserve strict frontend/backend contract alignment for chat payload and stream behavior.
- Do not change SSE data shape casually; parser compatibility is part of the contract.
- Session isolation takes priority over UI convenience.
- Any model/provider change must respect session model binding semantics.
- Persistence semantics stay explicit: user message before stream, assistant message on stream completion.

## Change Workflow

1. Read affected module(s) end-to-end before editing.
2. Identify contract boundaries (DTO, API body, headers, stream format, store state keys).
3. Apply minimal-change solution first; only abstract when at least one of:
   - logic duplicated in 2+ places
   - function exceeds readability threshold
   - abstraction reduces concrete bug risk
4. Run targeted verification for changed layer.
5. Re-check for regressions in chat session lifecycle.

## Layer Verification Commands

- Frontend changes: `pnpm -C frontend exec tsc --noEmit`
- Backend changes: `pnpm -C backend run tsc`
- Cross-layer changes: run both commands above.

## Frontend Checklist

- State is keyed by session where relevant.
- Stream update path has request identity guard.
- Loading/empty/skeleton UI does not break prompt placement.
- New message flow in draft session renders immediately.

## Backend Checklist

- DTO remains strict and descriptive.
- Context normalization still guarantees final user prompt.
- Stream lifecycle handles `data`, `error`, `end` safely.
- DB writes are idempotent enough for expected stream behavior.

## Done Criteria

- Type-check passes for impacted layer(s).
- No obvious regression in session isolation and stream completion path.
- Code follows arrow-function preference and remains straightforward without over-engineering.
