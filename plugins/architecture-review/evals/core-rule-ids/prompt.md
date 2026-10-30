---
name: core-rule-ids
description: Cites the project's own rule identifiers for violations in the pure core package
tags: [quality, citations]
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
diff --git a/packages/rules-core/src/pipeline/run.ts b/packages/rules-core/src/pipeline/run.ts
index ccccccc..ddddddd 100644
--- a/packages/rules-core/src/pipeline/run.ts
+++ b/packages/rules-core/src/pipeline/run.ts
@@ -1,4 +1,5 @@
 import type { PipelineInput, Finding } from "./types.js";
+import { readFileSync } from "node:fs";
 import { draftFindings } from "./draft.js";
 import { dedupe } from "./dedupe.js";
 import { verifyFindings } from "./verify.js";
@@ -6,9 +7,10 @@ import { verifyFindings } from "./verify.js";
 export async function runPipeline(input: PipelineInput): Promise<Finding[]> {
   const model = input.model;
+  const prompt = readFileSync(input.promptPath, "utf8");
   const drafted = await draftFindings(input, model);
   const deduped = dedupe(drafted);
-  const verified = await verifyFindings(deduped, input.diff);
-  return verified;
+  return deduped;
 }
</diff>
