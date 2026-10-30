---
type: llm
weight: 1
---

PASS if the report flags the domain file `src/modules/checkout/domain/checkout.ts` importing a type from `fastify` as a violation of the inward-only dependency rule (domain must not depend on the web framework).
FAIL if this import is not reported as a violation.
