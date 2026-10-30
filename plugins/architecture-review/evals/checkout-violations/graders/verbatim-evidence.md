---
type: llm
weight: 1
---

PASS if each finding quotes the offending line from the diff verbatim as evidence (for example `import type { FastifyReply } from "fastify";` or `private repo = new PgCheckoutRepository();`), not a paraphrase.
FAIL if evidence for any finding is paraphrased or missing.
