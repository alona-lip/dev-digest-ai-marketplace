---
name: checkout-violations
description: Flags both violations in the checkout diff with severity, a cited contract, verbatim evidence and a gate verdict
tags: [quality, findings]
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
diff --git a/src/modules/checkout/domain/checkout.ts b/src/modules/checkout/domain/checkout.ts
index 1111111..2222222 100644
--- a/src/modules/checkout/domain/checkout.ts
+++ b/src/modules/checkout/domain/checkout.ts
@@ -1,5 +1,6 @@
+import type { FastifyReply } from "fastify";
 export interface CheckoutOrder {
   id: string;
   total: number;
 }

-export function priceOrder(order: CheckoutOrder): number {
+export function priceOrder(order: CheckoutOrder, reply?: FastifyReply): number {
   return order.total;
 }

diff --git a/src/modules/checkout/service.ts b/src/modules/checkout/service.ts
index 3333333..4444444 100644
--- a/src/modules/checkout/service.ts
+++ b/src/modules/checkout/service.ts
@@ -1,10 +1,14 @@
 import { priceOrder } from "./domain/checkout.js";
+import { PgCheckoutRepository } from "./repository.js";

 export class CheckoutService {
+  private repo = new PgCheckoutRepository();
+
   async checkout(order: { id: string; total: number }) {
     const price = priceOrder(order);
+    await this.repo.save(order.id, price);
     return { price };
   }
 }
</diff>
