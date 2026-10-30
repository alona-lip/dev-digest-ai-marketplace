---
type: llm
weight: 1
---

PASS if the report flags `import { readFileSync } from "node:fs";` added to `packages/rules-core/src/pipeline/run.ts` as a violation (the core package must do no I/O except through the injected ModelClient).
FAIL if the fs import is not reported.
