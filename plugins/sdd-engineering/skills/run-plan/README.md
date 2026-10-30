# Run Plan Skill

Executor for an **approved** Implementation Plan (`<plans_dir>/<feature>.md`, written by
`sdd-engineering:implementation-planner`). One command drives the plan to verified code — dispatching
the agents, keeping its own context lean (only short agent reports), and closing every acceptance
criterion of the spec with an implementation and a test.

- **Order:** implementer → architecture-reviewer ‖ correctness reviewers (+ fix loop) → **test-writer
  from ACs** (+ code-fix loop) → **plan-verifier last**. Tests are written once, after the
  architecture gate, so structural fixes do not rewrite them — and `test-writer` reads the spec before
  the code so tests don't copy its bugs.
- **Checks:** every command comes from the plan's **Check gate** section, which the planner fills from
  the project's own scripts. The skill never invents a check and never switches the gate off.
- **Limits:** `max-parallel:3` for implementers and test-writers (reviewers and fixers ≤ 2),
  `max-fix:2` per loop.
- **Gate on the spec:** the plan's spec must be `Status: approved` with no open `[NEEDS CLARIFICATION]`.

`spec-creator` and `implementation-planner` run **before** this command; your code review and
`/sdd-engineering:workflow-retro` run **after** it, by hand.

```
/sdd-engineering:run-plan plan:<plans_dir>/<feature>.md [mode:multi|single] [max-parallel:N] [max-fix:N] [tests:off]
  └─ budget check, read plan + spec header, record base commit
       └─ implementer ×N           (DAG, ≤ max-parallel at once | single-agent)
            └─ Check gate → architecture-reviewer ‖ correctness reviewer per package → implementer fixes (≤ max-fix)
                 └─ test-writer      (tests from AC-N, spec first, then code; per package, unit ‖ integration)
                      └─ red AC test → implementer fixes CODE, never the test (≤ max-fix)
                           └─ plan-verifier   (runs the Check gate; AC → task → test → commit, final gate)
                                └─ report → you review, commit, /sdd-engineering:workflow-retro
```

## Agents orchestrated

| Step | Agent | Model | Role |
|------|-------|-------|------|
| 1 | `sdd-engineering:implementer` ×N | sonnet | One task each; owned paths never overlap; self-verifies |
| 2 | `architecture-review:architecture-reviewer` | sonnet | Structural contracts the project documents (read-only); gets the Check gate output from the orchestrator |
| 2 | `general-purpose` ×package | sonnet | Correctness reviewer: error mapping, races, boundary edge cases (read-only); prompt in [`references/reviewer-prompt.md`](references/reviewer-prompt.md), severity in [`references/severity.md`](references/severity.md) |
| 2, 4 | `sdd-engineering:implementer` ×N | sonnet | Fix review findings; fix code behind red AC tests |
| 3 | `sdd-engineering:test-writer` | sonnet | Tests derived from the spec's ACs, per package |
| 5 | `sdd-engineering:plan-verifier` | sonnet | Runs the Check gate itself; AC → task → test → commit matrix, final gate (read-only) |

## Inputs

| Token | Meaning | Default |
|-------|---------|---------|
| `plan:<path>` | Approved Implementation Plan. **Required.** | — |
| free-text | Notes / constraints for this run | — |
| `mode:multi` / `mode:single` | Override the plan's Execution mode | from the plan |
| `max-parallel:<n>` | Implementers / test-writers at once (reviewers, fixers ≤ 2) | `3` |
| `max-fix:<n>` | Cap per fix loop (review, AC tests) | `2` |
| `tests:off` | Skip test-writer (explicit opt-out) | on |

## Guardrails

- Never authors a spec or a plan; never edits a test to make it green.
- Never commits, pushes, merges or opens a PR.
- Each fix loop is bounded; leftovers go to a human.
- Agents running at once own non-overlapping paths.
- A plan without a `## Check gate` section is sent back to the planner.

## File structure

```
run-plan/
├── SKILL.md                     ← orchestrator: budget check → implement → review gate → AC tests → verify
├── README.md                    ← this file
└── references/
    ├── reviewer-prompt.md       ← brief for the per-package correctness reviewer
    └── severity.md              ← CRITICAL / WARNING / SUGGESTION definitions
```
