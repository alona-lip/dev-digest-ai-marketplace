# architecture-review

## What it is

A **read-only** structural auditor, `architecture-reviewer` (`tools: Read, Glob, Grep`, no `Edit`, `Write` or `Bash`). Given a diff or a file set, it first finds the project's own architecture contracts (agent instructions, architecture docs, decision records, boundary-checker configs), then checks the changed files against them. Every finding cites the exact contract it violates and quotes the offending line; uncited generic opinions are suppressed. The report ends with a PASS/FAIL gate.

Write tools are deliberately omitted: a reviewer that can write is tempted to fix rather than report, which destroys review independence.

**Scope.** It reviews structural contracts only: dependency direction and layering, composition root and dependency injection, module boundaries, purity of core packages, mandatory pipeline steps, config and secrets access, shared contracts. It does not review style, naming, runtime bugs, test quality, performance or security injection vectors. It notes an injection vector as out of scope instead of turning it into an architecture finding.

## Install

```
/plugin marketplace add alona-lip/dev-digest-ai-marketplace
/plugin install architecture-review@dev-digest-ai-marketplace
```

This also installs [`engineering-paved-path`](../engineering-paved-path), whose skills the agent preloads. `sdd-engineering` installs this plugin automatically.

## Components

| Component | Invocation | What it does |
| --- | --- | --- |
| Agent `architecture-reviewer` | `@agent-architecture-review:architecture-reviewer <diff, files or branch>`, or the Agent tool with `subagent_type: architecture-review:architecture-reviewer` | Audits the changes against the project's documented contracts and returns a findings table and a PASS/FAIL gate |

The agent preloads eight skills from `engineering-paved-path`: `onion-architecture`, `frontend-architecture`, `fastify-best-practices`, `drizzle-orm-patterns`, `react-best-practices`, `next-best-practices`, `typescript-expert` and `security`.

## Configuration

No `userConfig`. Tell the agent what to audit in the prompt:

| Input | Example | Effect |
| --- | --- | --- |
| Files or a diff | `src/orders/service.ts src/orders/routes.ts`, or a pasted `git diff` | Audits exactly those changes |
| Nothing | — | Looks for recently changed source files and audits those |
| Checker output | Output of `git diff --stat`, a dependency-cruiser or ESLint boundaries run | Cited as verbatim evidence instead of being re-derived |
| Pasted contracts | The text of `docs/ARCHITECTURE.md` with the diff | Treated as one of the project's documents |

### Document your contracts so the reviewer can cite them

The reviewer only flags what the project documents. It looks, in this order, at:

1. `CLAUDE.md` and `AGENTS.md` at the root and in each touched package
2. `ARCHITECTURE.md`, `docs/architecture*` and the docs they link to
3. Decision records in `docs/adr/`, `docs/decisions/` or `adr/`
4. Boundary configs: `.dependency-cruiser.*`, ESLint `import/no-restricted-paths`, `boundaries/*` or `no-restricted-imports` rules, Nx tags

To get precise findings, give each rule a short identifier and say what it allows and forbids, with paths:

```markdown
### `inward-only-dependencies`
Domain files in `src/modules/<module>/domain/` import only other domain files and `zod`.
They never import `fastify`, `drizzle-orm` or database drivers, not even as a type.

### `di-discipline`
`src/platform/container.ts` is the composition root. Repositories and adapters are constructed
only there and passed to services through their constructor.
```

Findings then name `inward-only-dependencies` or `di-discipline`. Rules without identifiers are cited as `<doc path>#<section>`. Rule names from a dependency-cruiser or ESLint config are citable as they are.

If nothing is documented, the reviewer says so at the top of the report, audits against the preloaded skills (cited as `engineering-paved-path:<skill>#<rule>`) and adds an `info` finding `missing-architecture-doc`.

## Usage

Review the current branch on its own:

```
@agent-architecture-review:architecture-reviewer Review the changes on this branch against main.
```

Example report:

```
## Architecture Review — branch order-export vs main

**Contracts:** AGENTS.md, docs/ARCHITECTURE.md, .dependency-cruiser.cjs

### Audited files
- `src/modules/checkout/domain/checkout.ts`
- `src/modules/checkout/service.ts`

### Findings

| # | file | line | severity | rule | evidence | recommendation |
|---|------|------|----------|------|----------|----------------|
| 1 | `src/modules/checkout/domain/checkout.ts` | 1 | critical | `inward-only-dependencies` | `import type { FastifyReply } from "fastify";` | Remove the framework type from the domain signature. |
| 2 | `src/modules/checkout/service.ts` | 5 | high | `di-discipline` | `private repo = new PgCheckoutRepository();` | Construct the repository in the container and inject it through the constructor. |

### Verdict

| severity | count |
|----------|-------|
| critical | 1 |
| high | 1 |
| medium | 0 |
| low | 0 |
| info | 0 |

**Gate:** FAIL (2 critical or high findings require resolution before merge)
```

Severity scale: `critical` breaks an invariant (domain imports a framework, a route runs a query), `high` is a clear violation that will cause problems (`new Adapter()` outside the composition root), `medium` has limited impact, `low` is borderline, `info` is undetermined or out of scope. PASS requires zero `critical` and zero `high` findings.

### Evals

`evals/` holds four cases for `claude plugin eval`, ported from the course evals: violations found and cited in a checkout diff, no out-of-scope findings on the same diff, project rule identifiers for a pure core package, and no findings on a benign rename. Each case pastes a sample project's contracts and a diff, so it needs no repository.

```
claude plugin eval plugins/architecture-review
```

Each run is a real model session billed to your account.

## How it fits with other plugins

- [`sdd-engineering`](../sdd-engineering): `/sdd-engineering:run-plan` dispatches `architecture-review:architecture-reviewer` after the implementers finish, in parallel with the correctness reviewers. A FAIL gate starts the fix loop.
- [`engineering-paved-path`](../engineering-paved-path): supplies the preloaded skills that give the reviewer its vocabulary and its fallback rules.

## Dependencies

- `engineering-paved-path ^1.0.0` (installed automatically).
- No external tools.

## Based on

- **Subagent design and trigger-rule `description`**: [Claude Code subagents docs](https://code.claude.com/docs/en/sub-agents), [Best practices for Claude Code subagents (PubNub)](https://www.pubnub.com/blog/best-practices-for-claude-code-sub-agents/)
- **Parallel AI agents for code review**: [9 Parallel AI Agents That Review My Code (HAMY)](https://hamy.xyz/blog/2026-02_code-reviews-claude-subagents)
- **Architectural liquefaction and the need for automated guardrails**: [Clean Architecture in the Age of AI (dev.to)](https://dev.to/uxter/clean-architecture-in-the-age-of-ai-preventing-architectural-liquefaction-5d8d)
- **Enforcing Clean Architecture via tooling**: [Enforce Clean Architecture in TypeScript with fresh-onion (dev.to)](https://dev.to/remojansen/enforce-clean-architecture-in-your-typescript-projects-with-fresh-onion-45pi)
- **Agentic code review patterns**: [Agentic Code Review (Addy Osmani)](https://addyosmani.com/blog/agentic-code-review/)
