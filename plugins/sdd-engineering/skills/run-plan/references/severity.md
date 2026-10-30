# Severity — one definition for every correctness finding

Three levels. **Only CRITICAL blocks.**

- **CRITICAL** — once merged, this can cause a security breach, data
  loss/corruption, a wrong result, a crash, or a broken contract callers depend
  on. Also: touching a do-not-touch zone the project documents (an applied
  migration, a lock file edited by hand, vendored code).
- **WARNING** — a real problem worth fixing that does not block: a missed edge
  case, degraded behaviour, a maintainability or performance risk.
- **SUGGESTION** — a minor improvement; safe to merge without it.

## Skills' own "CRITICAL" labels are not findings

`react-best-practices`, `zod` and other stack skills tag whole rule
*categories* "CRITICAL". That is the priority of the category, not the severity
of a finding. A violated rule becomes a CRITICAL **finding** only if you can
state the concrete mechanism: which input or path reaches it, and what breaks.

| Violation | Severity |
|---|---|
| Route reads a row by id with no tenant / owner scope (cross-tenant read) | CRITICAL |
| SQL built by string concatenation from request input | CRITICAL |
| Secret / token written to a log or response | CRITICAL |
| Unvalidated request body used as a trusted value at a boundary | CRITICAL |
| Response shape changed while a client still expects the old one | CRITICAL |
| Missing `await` on a write whose result is then returned as success | CRITICAL |
| Error from the filesystem or a driver mapped to a generic 500 instead of the documented status | WARNING |
| Two concurrent updates can overwrite each other with no check | WARNING (CRITICAL if data is lost on a normal path) |
| Derived value stored in state (`useState` + `useEffect` sync) | WARNING |
| `any` / needless cast with no observable failure path | WARNING |
| Naming, ordering, a nicer type | SUGGESTION |

Speculation ("might", "could", "if X isn't handled elsewhere") is at most
WARNING. If you would dismiss your own finding as a likely false positive, do
not report it.

## Legitimate migration edits

Migration generators add a new migration file and usually append to a journal
or snapshot. That is allowed. Editing, deleting or renaming a migration that
was already applied is CRITICAL.
