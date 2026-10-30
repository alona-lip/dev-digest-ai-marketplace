---
type: llm
weight: 1
---

PASS if the report flags that `runPipeline` now returns `deduped` directly, skipping the mandatory `verifyFindings()` gate.
FAIL if the skipped gate is not reported.
