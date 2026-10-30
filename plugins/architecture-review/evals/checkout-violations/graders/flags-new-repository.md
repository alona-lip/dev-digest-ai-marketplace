---
type: llm
weight: 1
---

PASS if the report flags `new PgCheckoutRepository()` inside `src/modules/checkout/service.ts` as a violation of DI discipline (concrete repositories are constructed only in the composition root `src/platform/container.ts`).
FAIL if this construction is not reported as a violation.
