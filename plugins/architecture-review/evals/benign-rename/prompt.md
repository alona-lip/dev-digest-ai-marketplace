---
name: benign-rename
description: Reports no documented-rule violation for a local-variable rename in a domain file
tags: [quality, false-positives]
runs: 1
max_turns: 25
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

Dispatch the `architecture-review:architecture-reviewer` subagent with the Agent tool (`subagent_type` exactly `architecture-review:architecture-reviewer`). Pass it, verbatim, the project's architecture contracts and the diff below, and ask it to audit the diff against those contracts. The repository itself is not available; the contracts document and the diff are all there is. Do not review the diff yourself. When the subagent returns, reply with its report verbatim and nothing else.

<contracts path="docs/ARCHITECTURE.md">
# Architecture contracts — orders service

A TypeScript monorepo: `src/` is a Fastify + Drizzle backend split into modules, and
`packages/rules-core/` is a pure library that scores orders with an injected model client.

## Rules

### `inward-only-dependencies`
Layers, innermost first: `src/modules/<module>/domain/` → `src/modules/<module>/service.ts` →
`src/modules/<module>/repository.ts` and `src/modules/<module>/routes.ts`.
Domain files import only other domain files and `zod`. They never import `fastify`, `drizzle-orm`,
database drivers or any outer layer, not even as a type.

### `di-discipline`
`src/platform/container.ts` is the composition root. Concrete repositories, adapters and clients are
constructed only there and handed to services through their constructor. A service never calls
`new` on a repository or adapter.

### `thin-routes`
A route validates input with its zod schema, calls one service method and sends the reply. No
queries, no business branching.

### `core-zero-io`
`packages/rules-core/src/**` does no I/O: no `fs`, `node:fs`, `http`, `node:http`, database drivers
or HTTP clients. Its only side effect is a call through the injected `ModelClient` port.

### `core-verify-gate`
Every result that `packages/rules-core` returns from `runPipeline()` must pass through
`verifyFindings()` first. A code path that returns drafted or deduplicated findings without that
gate is a violation.
</contracts>

<diff>
diff --git a/src/modules/metrics/domain/score.ts b/src/modules/metrics/domain/score.ts
index eeeeeee..fffffff 100644
--- a/src/modules/metrics/domain/score.ts
+++ b/src/modules/metrics/domain/score.ts
@@ -1,10 +1,12 @@
 export interface ScoreRow {
   id: string;
   score: number;
 }

-export function summarize(rows: ScoreRow[]) {
-  return rows.map((r) => ({ id: r.id, score: r.score }));
+// Renamed locals for readability; behaviour unchanged.
+export function summarize(rows: ScoreRow[]) {
+  return rows.map((row) => ({ id: row.id, score: row.score }));
 }
</diff>
