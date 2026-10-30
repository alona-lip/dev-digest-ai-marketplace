---
name: run-plan
description: >
  Runs an already-approved Implementation Plan (written by sdd-engineering:implementation-planner)
  end-to-end: budget check → implementer agents per the plan's DAG (multi-agent capped by
  max-parallel, or single-agent) → review gate (architecture-review:architecture-reviewer + one
  correctness reviewer per touched package) with a bounded fix loop → test-writer derives tests from
  the spec's acceptance criteria → bounded code-fix loop for red AC tests → plan-verifier as the
  final read-only gate (AC → task → test → commit), running the plan's Check gate itself. Starts
  FROM a plan — spec-creator and implementation-planner run separately beforehand. Never pushes or
  merges.
  TRIGGER when: "run the plan", "/run-plan", "execute the plan", "implement this plan",
  "implement <plans_dir>/<x>.md", "run-plan plan:<path>".
  Does NOT cover: writing specs or plans, pushing/merging, code review after the run, or
  /sdd-engineering:workflow-retro (manual, run by the user afterwards).
---

# Run Plan — Implementation Plan executor

> **Take an approved Implementation Plan and drive it to verified code: implement per the DAG,
> pass the review gate, prove every AC with a test written from the spec, and close with
> plan-verifier.**

You are the **orchestrator**, in the main session. The spec (`sdd-engineering:spec-creator`) and the
plan (`sdd-engineering:implementation-planner`) already exist and were approved by a human. You do
**not** implement, test or review yourself — you dispatch the agents and keep only their short final
reports in context. Run independent agents concurrently (several `Agent` calls in one message), never
more than `max-parallel` at once.

Always dispatch agents by their full plugin-scoped name:

| Role | `subagent_type` |
|------|-----------------|
| Implementer, fixer | `sdd-engineering:implementer` |
| Architecture reviewer | `architecture-review:architecture-reviewer` |
| Correctness reviewer | `general-purpose` |
| Test writer | `sdd-engineering:test-writer` |
| Final gate | `sdd-engineering:plan-verifier` |

```
plan:<path>
 └─ Step 0  budget check + read plan & spec + record the base commit
     └─ Step 1  implementer ×N        (DAG; ≤ max-parallel at once | single-agent)
         └─ Step 2  Check gate → architecture-reviewer ‖ correctness reviewers → fix loop (≤ max-fix)
             └─ Step 3  test-writer       (tests from ACs, spec first, then code)
                 └─ Step 4  red AC tests → implementer fixes CODE (≤ max-fix)
                     └─ Step 5  plan-verifier  (runs the Check gate; AC → task → test → commit; final gate)
                         └─ report + "review the diff, commit, then /sdd-engineering:workflow-retro" (manual)
```

**Why tests come after the review gate.** Architecture fixes move code between files (logic out of a
route into a service, an import through a facade). Tests written before that would be rewritten;
written after, they target the final structure once. The risk of this order — tests fitted to
finished code — is handled by `test-writer`'s spec-first rule (Step 3) and the rule that a red AC
test means fixing code, not the test (Step 4).

## Inputs (args)

| Token | Meaning | Default |
|-------|---------|---------|
| `plan:<path>` | Approved Implementation Plan, usually `<plans_dir>/<feature>.md`. **Required.** | — |
| free-text prose | Notes / constraints for this run ("skip phase 3 for now") | — |
| `mode:multi` / `mode:single` | Override the plan's Execution mode | read from the plan |
| `max-parallel:<n>` | Max plan-task agents running at once: implementers (Step 1) and test-writers (Step 3). Reviewers and fixers (Steps 2, 4) stay at ≤ 2 | `3` |
| `max-fix:<n>` | Cap for **each** fix loop (Step 2 and Step 4 separately) | `2` |
| `tests:off` | Skip Steps 3–4 (explicit opt-out only; Step 5 will then report ACs without tests) | on |

No `plan:` → ask for it and stop. State your interpretation of the args in one line before starting.

**Limits.** The defaults are deliberately conservative: three plan-task agents at a time (two for
reviewers and fixers) and two fix iterations. Three keeps ready tasks from queueing behind each other
without hitting rate limits on most accounts. Raise further only after a
`/sdd-engineering:workflow-retro` shows the pipeline works and the budget allows — check usage, not a
universal number. The plan's **Check gate** is never switched off: without it you cannot see whether
the pipeline itself works.

## The Check gate

The plan has a `## Check gate` section written by `implementation-planner` from the project's own
scripts (package manifests, Makefile, CI workflows):

```
## Check gate

| Check | Command | Scope |
|-------|---------|-------|
| Typecheck | `npm run typecheck --prefix api` | api |
| Unit tests | `npm test --prefix api` | api |
| Dependency rules | `npm run lint:deps` | repo |
```

- Run every row from the repository root, exactly as written. Do not invent, rewrite or drop a
  command; if one cannot run (missing service, missing tool), report it as **not run** with the
  reason — never as passing.
- `Scope` is the package directory the check covers, or `repo`. Use it to pick the rows relevant to a
  task's package when an implementer self-verifies, and to run only affected rows inside fix loops.
- `No automated checks found.` instead of a table → there is nothing to run; carry the plan's listed
  manual checks into the final report under **Needs a human**.
- No `## Check gate` section at all → stop and send the user back to `implementation-planner`.

## Guardrails (always)

- **Starts from a plan.** Never author or edit a spec or a plan. Missing/unreadable → stop.
- **Approved spec only.** The plan's `Spec:` line must point to a spec with `Status: approved` and
  no open `[NEEDS CLARIFICATION]`. Otherwise stop and send the user back to `spec-creator`.
- **Never `git push`, merge, commit or open a PR.**
- **Bounded loops.** Each fix loop stops at `max-fix` or on no progress; leftovers go to the human.
- **Owned paths never overlap** between agents running at the same time.
- **Lean context.** Hold the plan path, the spec path and each agent's short report — never paste an
  agent's transcript into your own reasoning. Pass agents paths and AC-IDs, not file dumps.

## Step 0 — Budget check, read plan and spec

1. Read the plan. Extract per task: `T-id`, `AC` list, test name, `Action`, `Package` (older plans
   may call it `Module`), `Type`, `Skills to use`, `Owned paths`, `Depends-on`, `Known gotchas`,
   `Acceptance`. Read `## Execution mode` (a `mode:` arg overrides it) and `## Check gate`. Build the
   DAG.
2. Read the spec header and AC list (not the whole spec): `Status`, Spec ID, AC-IDs, open
   `[NEEDS CLARIFICATION]`.
3. Record the **base**: `git rev-parse HEAD`, plus `git status --short`. Files already dirty before
   the run are not the run's work: exclude them from every changed-file set below and list them in
   the final report.
4. Print the budget line and wait for nothing — just make it visible:
   `6 tasks · multi-agent · 3 phases · max-parallel 3 · max-fix 2 · 4 checks · models: implementer
   sonnet, architecture-reviewer sonnet, correctness reviewers sonnet, test-writer sonnet,
   plan-verifier sonnet`.
   If any agent the run uses is on an expensive model (`opus`), say so in that line.

## Step 1 — Implement

**Multi-agent:**
1. **Ready set** = tasks whose `Depends-on` are done and whose `Owned paths` do not overlap a running
   task. Take at most `max-parallel` of them.
2. Spawn one `sdd-engineering:implementer` per ready task in one message. Brief: the full task block,
   the spec path with the task's AC-IDs, the Check gate rows whose `Scope` matches the task's
   package (plus `repo` rows), and the **other tasks' `Owned paths`** so it stays in its lane.
3. Collect reports (`Closes: AC-…`), mark tasks done, repeat until the DAG is empty.

**Single-agent:** one `sdd-engineering:implementer` at a time, in plan order.

A task reported **blocked / failing** that cannot be fixed in scope: record it; retry once with a
sharper brief or surface it to the user — never continue past a red task others depend on.

## Step 2 — Review gate (architecture + correctness) + fix loop

**Why two kinds of reviewer.** `architecture-reviewer` checks structure only — runtime bugs are out
of its scope by design. Without a correctness pass, bugs such as an unmapped filesystem error turning
into a 500, or two concurrent saves racing, surface only after the run and cost a second fix +
re-review round.

1. **Changed-file set** — `git diff --name-only <base>` plus untracked files from
   `git status --short`, minus the files that were dirty before the run.
2. **Packages touched** — group the changed files by their nearest package root (the closest parent
   directory with a package manifest such as `package.json`, `pyproject.toml`, `go.mod`; none → the
   repository root).
3. **Evidence block** — `architecture-reviewer` has no Bash, so run the deterministic checks yourself
   and keep their output short (verdict lines, not full logs):
   - `git diff --stat <base>`
   - every Check gate row (or the rows whose `Scope` is a touched package, plus `repo` rows)
   - if the project's `CLAUDE.md` / `AGENTS.md` lists do-not-touch paths (applied migrations,
     vendored code, generated files): `git diff --stat <base> -- <those paths>`
4. **Spawn the reviewers** in one message, ≤ 2 at once (all read-only):
   - `architecture-review:architecture-reviewer` on the changed-file set, with the evidence block in
     the brief: *"These command outputs are evidence you may cite; do not report them as
     cannot-verify."*
   - one **correctness reviewer** per touched package — a `general-purpose` agent with
     `model: sonnet`. Read [`references/reviewer-prompt.md`](references/reviewer-prompt.md) and fill
     its placeholders: that package's changed files, the base commit, the stack skill
     (`engineering-paved-path:typescript-expert` for TypeScript; for React UI code
     `engineering-paved-path:react-best-practices`; for another language, the closest skill the
     project has, or none), and the severity file path
     `${CLAUDE_SKILL_DIR}/references/severity.md`.
5. **Backlog** = architecture findings with severity **critical** or **high**, plus correctness
   findings with severity **CRITICAL** or **WARNING** that state a mechanism (medium/low and
   SUGGESTION → report only).

Loop `i = 1 … max-fix` while the backlog is non-empty:
1. Group findings by file into non-overlapping fix tasks.
2. Dispatch `sdd-engineering:implementer`(s), ≤ 2 at once: *"Fix exactly these findings in these
   files, stay in scope, self-verify."* — with each finding's text, `file:line` and recommendation.
3. Re-run the affected Check gate rows, then only the reviewer(s) that reported the findings, on the
   touched files only.
4. Empty → gate PASS. Same findings as last iteration → stop, flag as stuck.

Cap reached with findings left → stop the run here and report them; do **not** write tests on a
structure that is still going to change.

## Step 3 — Tests from acceptance criteria

Skip if `tests:off`. Spawn `sdd-engineering:test-writer` — one per touched package that has ACs to
test, in parallel, ≤ `max-parallel`. **Split a package in two** when its ACs need both fast unit tests
and slow integration tests (a database, containers, a running service): one writer for the unit files
and one for the integration files, each with its own AC subset and disjoint test files — one writer
for both becomes the run's critical path. **Split further, per test file,** when one writer would own
more than ~25 ACs: output volume, not test runtime, is then the bottleneck. If the plan already has
separate test tasks, follow them; run all of them at once, ≤ `max-parallel`. Brief:

- the **spec path and its AC-IDs first**, the plan's `Traceability` table, then the changed-file set
  and the Check gate rows for that package;
- *"Derive the test cases from the ACs before reading the implementation. Name every test with its
  AC-ID. If the code contradicts an AC, keep the test red and report the mismatch — do not adapt the
  expectation."*

ACs the plan assigns elsewhere — UI behaviour covered by the implementer's colocated component tests,
browser-level behaviour covered by an end-to-end row in the Check gate — are out of `test-writer`'s
scope; list them in the report.

## Step 4 — Red AC tests → fix the code

Backlog = `test-writer`'s *AC mismatches* (red tests that encode an AC).

Loop `i = 1 … max-fix` while the backlog is non-empty:
1. Decide per item: **code contradicts a clear AC** → dispatch an `sdd-engineering:implementer` with
   the failing test, the AC text and the owned files: *"Make this test pass by fixing the code. Do
   not edit the test."* **AC is ambiguous** (both readings defensible) → stop the loop for that AC
   and ask the user; the answer goes back through `spec-creator`, never into the test.
2. Re-run only the affected test files.
3. Empty → PASS. No progress → stop, flag as stuck.

## Step 5 — plan-verifier (final, read-only)

Spawn `sdd-engineering:plan-verifier` with the spec path, the plan path, the base commit, the
changed-file set and the plan's Check gate. Brief: *"Run the Check gate yourself and quote the
results; do not take pass counts from this brief."* — never pass your own test totals as facts. It
returns the matrix AC → task → test → commit and a PASS / FAIL / REVIEW gate.

- `missing` / `partial` ACs: if the Step 4 budget has iterations left, dispatch an `implementer` (and,
  for a missing test, `test-writer`) for those ACs, then re-run `plan-verifier` for them only.
  Otherwise list them for the human.
- Commits: the run itself never commits; `uncommitted` in the matrix is expected until the user
  commits.

## Final report

```
## Run Plan — <feature> (SPEC-NN)

- **Plan:** `<plan path>` — mode: multi-agent | single-agent · max-parallel <n> · max-fix <n>
- **Implemented:** <N> tasks (T1…Tn) — closes AC-…
- **Check gate:** <passed>/<total> green · failing: <check — detail> · not run: <check — reason>

### Review gate
- architecture-reviewer: PASS | FAIL — crit <n> / high <n>
- correctness (<packages>): PASS | FAIL — CRITICAL <n> / WARNING <n>
- fix iterations <i>/<max-fix>

### Tests from ACs
- test-writer: <n> tests for <m> ACs · red AC tests fixed in code: <list> · iterations <i>/<max-fix>
- out of test-writer scope (UI / end-to-end): <AC-IDs>

### plan-verifier
- PASS | FAIL | REVIEW — <verified N/M>; missing/partial: <AC-IDs>

### Needs a human
- <stuck findings, ambiguous ACs, unverified ACs, manual checks, files dirty before the run — or "none">

### Next steps (manual)
1. Review the uncommitted diff with your usual code review. If its fixes change code, re-run
   `plan-verifier` only for the ACs whose files changed, not the whole matrix.
2. Commit, then `/sdd-engineering:workflow-retro label:<feature> deep` → one row in the retro ledger.
```

## When you cannot proceed

Missing/unreadable plan, a spec that is not approved, a plan without a Check gate, or an implementer
blocked on a human decision → stop and say exactly what you need. "Blocked here, need X" is a valid
result; a half-run that looks complete is not.
