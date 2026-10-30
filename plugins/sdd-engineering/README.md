# sdd-engineering

Spec-Driven Development (SDD) pipeline for Claude Code: a feature request becomes an approved spec, an implementation plan, code written by parallel agents, a review gate, tests derived from acceptance criteria and a final traceability check. Works in any repository.

## What it is

Five agents and four skills that split a change into phases, each of which leaves a file in the repository:

| Phase | Question it answers | Artifact |
| --- | --- | --- |
| 1. Initiation | What is being asked, and what do we already know? | The request, plus the touched package's `INSIGHTS.md` read before any code |
| 2. Planning | What must change and why (spec); how, in what order, and what did we decide against (plan)? | `<specs_dir>/<feature>.md` and `<plans_dir>/<feature>.md` |
| 3. Implementation | Does it exist? | The code |
| 4. Validation | Does it work, provably? | Tests named after the acceptance criteria, a green Check gate, the plan-verifier matrix |
| 5. Completion | What would the next session otherwise re-learn the hard way? | New entries in `INSIGHTS.md`, a row in the retro ledger |

`spec-creator` answers **what and why**. `implementation-planner` answers **how and in what order**. `/sdd-engineering:run-plan` drives the plan to verified code.

### Pipeline

```
request → spec-creator → <specs_dir>/<feature>.md          (Status: approved by a human)
  → [researcher → <research_dir>/<feature>.research.md]    optional
  → implementation-planner → <plans_dir>/<feature>.md      (AC → task → test, Check gate)
  → /sdd-engineering:run-plan plan:<path>
       implementer ×N
       → architecture-reviewer ‖ correctness reviewers → fix loop
       → test-writer (tests from ACs) → code-fix loop
       → plan-verifier (final gate)
  → commit → /sdd-engineering:workflow-retro (manual) → ledger row
```

| Agent | Receives | Produces | How it is checked |
| --- | --- | --- | --- |
| `spec-creator` | Feature request and verified facts | Spec with EARS acceptance criteria | Every AC is atomic, verifiable and does not contradict another |
| `researcher` | The spec and the code | Research note | Claims point to real files, symbols or URLs |
| `implementation-planner` | Approved spec and research | Plan mapping tasks to ACs, with a Check gate | Plan review by a human |
| `implementer` | One plan task | A code diff | Check gate and the review gate |
| `architecture-reviewer` | The diff, the project's docs and the Check gate output | Findings that each cite a documented contract | The project's architecture contracts |
| `test-writer` | The spec, ACs first | A test per criterion | Tests come from requirements, not from the finished code |
| `plan-verifier` | Spec, plan and finished implementation | Traceability matrix and gate | Every AC has an implementation and a test |

**Why tests come after the architecture gate.** Architecture fixes move code between files, so tests written earlier would be rewritten. The risk of writing tests against finished code, copying the implementer's mistake, is covered by `test-writer` reading the spec before the code, naming every test with its AC-ID, and the `run-plan` rule that a red AC test means fixing the code, never the test.

## Install

```
/plugin marketplace add alona-lip/dev-digest-ai-marketplace
/plugin install sdd-engineering@dev-digest-ai-marketplace
```

Claude Code installs the three dependencies (`engineering-paved-path`, `research-tools`, `architecture-review`) with it. Run `/reload-plugins` or start a new session.

## Components

| Component | Invoke | What it does | Model | Writes |
| --- | --- | --- | --- | --- |
| Agent `spec-creator` | `@agent-sdd-engineering:spec-creator`, or ask for a spec | Turns a request and design sources into one feature spec: six clarification categories, EARS acceptance criteria `AC-N`, `[NEEDS CLARIFICATION]` instead of guesses, design analysis | opus | Only `<specs_dir>/**/*.md` (hook-enforced) |
| Agent `implementation-planner` | `@agent-sdd-engineering:implementation-planner`, or ask for a plan from an approved spec | Verifies the spec, asks multi- or single-agent execution, writes a plan where every task names the ACs it closes and the test that proves them, plus a Check gate | opus | Only `<plans_dir>/*.md`, not `*.research.md` (hook-enforced) |
| Agent `implementer` | Dispatched by `run-plan`, or `@agent-sdd-engineering:implementer` with one task | Implements exactly one plan task inside its owned paths and self-verifies with the Check gate rows for its package | sonnet | Code inside the task's owned paths |
| Agent `test-writer` | Dispatched by `run-plan` | Writes tests from the spec's ACs before reading the code; keeps a test red and reports when the code contradicts an AC | sonnet | Test files only |
| Agent `plan-verifier` | Dispatched by `run-plan`, or `@agent-sdd-engineering:plan-verifier` | Read-only final gate: runs the Check gate, builds the AC → task → test → commit matrix, returns PASS / FAIL / REVIEW | sonnet | Nothing |
| Skill `run-plan` | `/sdd-engineering:run-plan plan:<path>` | Orchestrates implementers, the review gate, test-writer and plan-verifier with bounded fix loops. See [skills/run-plan/README.md](skills/run-plan/README.md) | main session | Through the agents it dispatches |
| Skill `workflow-retro` | `/sdd-engineering:workflow-retro` (manual only) | Retrospective of a finished multi-agent run: tokens, cache, parallelism, waste, actions. See [skills/workflow-retro/README.md](skills/workflow-retro/README.md) | main session | One ledger row |
| Skill `engineering-insights` | Automatic on a non-obvious finding, or "record insights" | Appends dated, evidence-backed entries to `INSIGHTS.md` in the nearest package root | main session or agent | `INSIGHTS.md` |
| Skill `mermaid-diagram` | Automatic when a diagram helps | Mermaid flowcharts, sequence, ER and state diagrams in Markdown | main session or agent | — |
| Hook `restrict-writes.sh` | `PreToolUse` on `Write\|Edit\|MultiEdit\|NotebookEdit` | Blocks `spec-creator` and `implementation-planner` from writing outside their directories | — | — |

### Write restrictions

`hooks/hooks.json` runs `scripts/restrict-writes.sh` before every write. The script reads `agent_type` from the hook input and acts only for this plugin's two document writers:

| Agent | Allowed paths |
| --- | --- |
| `sdd-engineering:spec-creator` | `<specs_dir>/<name>.md` and `<specs_dir>/<subdir>/<name>.md` |
| `sdd-engineering:implementation-planner` | `<plans_dir>/<feature>.md`, except `*.research.md` |

For these two agents any other path exits 2: the call is blocked and the reason goes back to the agent. Paths outside the project or with `..` count as other paths. Without `jq` the script blocks these two agents and lets everything else through. The main session and other agents are never affected. Each agent prompt states the same rule; the hook is what makes it hold.

## Configuration

### `userConfig`

| Option | Default | Used by |
| --- | --- | --- |
| `specs_dir` | `specs` | `spec-creator` writes there, `implementation-planner` and `plan-verifier` read from there, the write guard allows it |
| `plans_dir` | `docs/plans` | `implementation-planner` writes there, `run-plan` reads from there, the write guard allows it |

Set them in `/config`, in the dialog Claude Code shows when the plugin is enabled, or from a shell:

```
echo '{"specs_dir": "docs/specs", "plans_dir": "docs/plans"}' \
  | claude plugin configure sdd-engineering@dev-digest-ai-marketplace --values-stdin
```

Paths are relative to the project root. Values are saved per user under `pluginConfigs` in `~/.claude/settings.json`.

Until you save a value, Claude Code does not pass the default to the plugin: agent prompts show a literal `${user_config.specs_dir}` placeholder and the hook gets no `CLAUDE_PLUGIN_OPTION_SPECS_DIR`. The agents and the hook apply the defaults above themselves in that case, so the plugin works without configuration. Save a value only when you want a different directory.

The research note directory belongs to `research-tools` (`research_dir`, default `docs/plans`).

### Skill arguments

| Skill | Arguments |
| --- | --- |
| `run-plan` | `plan:<path>` (required), `mode:multi\|single`, `max-parallel:<n>` (default 3), `max-fix:<n>` (default 2), `tests:off` |
| `workflow-retro` | `label:<slug>`, `deep`, `session:<id>`, `scope:last\|session`, `ledger:<path>` (default `docs/retros/ledger.md`), `no-ledger` |

### What the agents read from your project

Nothing below is required. The agents look for these files and use what they find:

- `CLAUDE.md` and `AGENTS.md`: conventions, test commands, do-not-touch paths, architecture rules
- `docs/`: architecture contracts, for example `docs/architecture.md`, that `architecture-reviewer` cites in findings
- Package manifests (`package.json`, `pyproject.toml`, `go.mod`, …), `Makefile` and CI workflows: the source of the plan's Check gate
- `INSIGHTS.md` in each package root: earlier findings, read before planning and coding

### Check gate

Every plan ends with the commands that prove the work. `implementation-planner` copies them from the project's own scripts; it never invents one. `run-plan` and `plan-verifier` run every row from the repository root.

```
## Check gate

| Check | Command | Scope |
| --- | --- | --- |
| Typecheck | `npm run typecheck --prefix api` | api |
| Unit tests | `npm test --prefix api` | api |
| Component tests | `npm test --prefix web` | web |
| Dependency rules | `npm run lint:deps` | repo |
```

`Scope` is the package directory a check covers, or `repo`. A project with no automated checks gets `No automated checks found.` and a list of manual checks, which `run-plan` passes on to you. To add a check, add the script to your project and re-plan; do not edit the gate during a run.

## Usage

### Quick start in an empty project

1. Install the plugin (see **Install**). Configuration is optional.
2. Describe the project in `CLAUDE.md`: the stack, how to run typecheck and tests, and any architecture rules. Agents read it at runtime; the more concrete it is, the better the Check gate and the review.
3. Ask for a spec:

   ```
   @agent-sdd-engineering:spec-creator Users can export their saved searches as CSV.
   ```

   Answer its questions. It writes `specs/saved-search-export.md` with `Status: draft`. Read it, resolve any `[NEEDS CLARIFICATION]`, and set `Status: approved` yourself.
4. Ask for a plan:

   ```
   @agent-sdd-engineering:implementation-planner Plan specs/saved-search-export.md
   ```

   It asks multi-agent or single-agent execution, then writes `docs/plans/saved-search-export.md`. Review the tasks and the Check gate.
5. Run it:

   ```
   /sdd-engineering:run-plan plan:docs/plans/saved-search-export.md
   ```

6. Review the diff, commit, and optionally run `/sdd-engineering:workflow-retro label:saved-search-export deep`.

### Research before planning

For an unfamiliar area, ask the planner to start from facts, or run the researcher yourself:

```
@agent-research-tools:researcher feature:saved-search-export How are CSV responses produced today, and which library streams them?
```

The note lands in `docs/plans/saved-search-export.research.md`, and `implementation-planner` reads it.

### Questions from subagents

Subagents can run in the background, where `AskUserQuestion` is not available. `spec-creator` and `implementation-planner` then return a *Questions for the user* block and stop. The main session asks you and resumes the agent with `SendMessage`. To skip the planner's first stop, tell the main session the execution mode (multi- or single-agent) up front so it goes into the planner's brief.

### Budget

Expensive models are used only where judgement dominates: `spec-creator` and `implementation-planner` run on opus, every other agent on sonnet. `run-plan` keeps `max-parallel:3` (reviewers and fixers ≤ 2) and `max-fix:2`, and never switches off the Check gate. Check your usage before a long run; limits depend on your plan, so there is no universal number. After a run, `/sdd-engineering:workflow-retro deep` turns the numbers into actions.

### Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Agent type 'architecture-review:architecture-reviewer' not found` or `'research-tools:researcher' not found` | A dependency is not installed or is disabled | `/plugin install architecture-review@dev-digest-ai-marketplace` (or `research-tools`), check it is enabled in `/plugin`, then `/reload-plugins` |
| An agent's skill is missing, for example `engineering-paved-path:zod` | `engineering-paved-path` is not installed, or an older major version is | Install or update `engineering-paved-path`; this plugin needs `^1.0.0` |
| `restrict-writes (sdd-engineering:spec-creator): '<path>' is outside this agent's write scope` | The agent tried to write outside `specs_dir` (or the planner outside `plans_dir`) | Expected when the path is wrong. If your specs live elsewhere, save `specs_dir` / `plans_dir` (see **Configuration**) and run `/reload-plugins` |
| `restrict-writes: jq not found — blocking the write` | `jq` is not installed | Install `jq` (`brew install jq`, `apt install jq`) |
| `run-plan` stops because the plan has no `## Check gate` section | The plan was written by hand or by an older planner | Re-run `implementation-planner` on the approved spec |
| `run-plan` stops because the spec is not approved | The spec still has `Status: draft` or an open `[NEEDS CLARIFICATION]` | Resolve the questions with `spec-creator`, then set `Status: approved` |

## How it fits with other plugins

| Plugin | Role in the pipeline |
| --- | --- |
| [`engineering-paved-path`](../engineering-paved-path) | Stack skills the agents preload, for example `engineering-paved-path:onion-architecture` and `engineering-paved-path:react-best-practices` |
| [`research-tools`](../research-tools) | `research-tools:researcher`, dispatched by `spec-creator` and `implementation-planner` to gather facts |
| [`architecture-review`](../architecture-review) | `architecture-review:architecture-reviewer`, the structural half of the `run-plan` review gate |

Every cross-plugin reference uses the full plugin-scoped name, so a project's own skill or agent with the same short name is never picked up by mistake.

## Dependencies

- Plugins: `engineering-paved-path ^1.0.0`, `research-tools ^1.0.0`, `architecture-review ^1.0.0`, installed automatically.
- `jq` for the write guard.
- `git`: `run-plan` reads the diff from the base commit it records.
- Python 3 for `workflow-retro deep` (standard library only).
- Your project's own toolchain for the commands in the Check gate.

## Based on

- **Spec-Driven Development, the spec vs plan split, `[NEEDS CLARIFICATION]`**: [GitHub Spec Kit](https://github.com/github/spec-kit), [Spec-Driven Development with Agentic AI (ArceApps)](https://arceapps.com/blog/spec-driven-development-ai/)
- **EARS acceptance criteria**: [Easy Approach to Requirements Syntax (Mavin et al.)](https://alistairmavin.com/ears/), [Acceptance criteria an AI agent can verify (BrainGrid)](https://www.braingrid.ai/blog/how-to-write-acceptance-criteria-ai-agent-can-verify)
- **Subagents, hooks and preloaded skills**: [Claude Code subagents](https://code.claude.com/docs/en/sub-agents), [Hooks reference](https://code.claude.com/docs/en/hooks), [Extend Claude with skills](https://code.claude.com/docs/en/skills), [Best practices for Claude Code subagents (PubNub)](https://www.pubnub.com/blog/best-practices-for-claude-code-sub-agents/)
- **Explore → Plan → Implement, self-verification, review in a fresh context**: [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)
- **Model tiering and single-responsibility agents**: [wshobson/agents](https://github.com/wshobson/agents)
- **Plan structure and anti-patterns**: [affaan-m/everything-claude-code · planner.md](https://github.com/affaan-m/everything-claude-code/blob/main/agents/planner.md), [Strategic Task Planner (subagents.app)](https://subagents.app/agents/planner)
- **Owned paths and contracts-first parallel work**: [Parallel Claude Code Agents: Safe Workflow Guide](https://www.aakashx.com/blog/parallel-claude-code-agents/)
- **Requirements traceability (AC → task → test)**: [How to create a traceability matrix (Perforce)](https://www.perforce.com/blog/alm/how-create-traceability-matrix)
- **Test quality**: [Are Coding Agents Generating Over-Mocked Tests? (arXiv)](https://arxiv.org/html/2602.00409v1), [When AI-generated tests pass but miss the bug (dev.to)](https://dev.to/jamesdev4123/when-ai-generated-tests-pass-but-miss-the-bug-a-postmortem-on-tautological-unit-tests-2ajp), [Flaky tests in Vitest (Mergify)](https://mergify.com/flaky-tests/vitest/)
- **Verification failure modes**: [LLM behavioral failure modes (ceaksan.com)](https://ceaksan.com/en/llm-behavioral-failure-modes), [AI coding agents can verify some of their work — here's what they still miss (dev.to)](https://dev.to/moonrunnerkc/ai-coding-agents-can-verify-some-of-their-work-now-heres-what-they-still-miss-58mc)
- **Learnings loop behind `engineering-insights`**: see [skills/engineering-insights/references.md](skills/engineering-insights/references.md)
