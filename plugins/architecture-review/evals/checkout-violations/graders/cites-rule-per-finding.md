---
type: llm
weight: 1
---

PASS if EVERY finding names a documented rule identifier from the contracts document (such as `inward-only-dependencies` or `di-discipline`) rather than describing the problem only in prose.
FAIL if any finding has no rule identifier, or uses an identifier that is not in the contracts document.
