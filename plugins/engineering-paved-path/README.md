# engineering-paved-path

## What it is

Eleven stack skills for TypeScript web projects: React, Next.js App Router, React Testing Library, frontend architecture, Fastify, Drizzle ORM, PostgreSQL table design, onion architecture, Zod, TypeScript and web security. Each skill is domain knowledge that Claude loads on demand when the task matches its description, so the project's code follows one paved path without anyone repeating the rules in prompts.

The skills are not tied to any project. The two architecture skills read the target project's `CLAUDE.md`, `AGENTS.md` and architecture docs first, and the project's own conventions win where they differ.

### What are skills?

Skills are modular packages that extend the agent with specialized knowledge and workflows. Unlike rules (always applied) or agents (invoked for specific tasks), skills are loaded on demand when the agent decides they are relevant.

| Type | Scope | Loaded | Purpose |
| --- | --- | --- | --- |
| **Skills** | Domain knowledge | On demand, by the agent or `/plugin:skill` | Specialized knowledge |
| **Agents** | Workflows | Via the Agent tool | Subagent orchestration |
| **Commands** | User actions | On `/command` invocation | Slash commands |
| **Project instructions** (`CLAUDE.md`) | Project conventions | Always | Persistent guardrails |

## Install

```
/plugin marketplace add alona-lip/dev-digest-ai-marketplace
/plugin install engineering-paved-path@dev-digest-ai-marketplace
```

`architecture-review` and `sdd-engineering` install this plugin automatically as a dependency.

## Components

All components are skills. Claude invokes them on its own when a task matches; you can also call one directly with `/engineering-paved-path:<skill>`.

| Skill | Scope | Invocation | What it does |
| --- | --- | --- | --- |
| [fastify-best-practices](skills/fastify-best-practices/SKILL.md) | Backend | `/engineering-paved-path:fastify-best-practices` | Fastify routes, plugins, JSON-schema validation, error handling |
| [drizzle-orm-patterns](skills/drizzle-orm-patterns/SKILL.md) | Backend | `/engineering-paved-path:drizzle-orm-patterns` | Drizzle schema, queries, relations, transactions, migrations |
| [postgresql-table-design](skills/postgresql-table-design/SKILL.md) | Backend | `/engineering-paved-path:postgresql-table-design` | Postgres schema design, data types, indexing, constraints |
| [onion-architecture](skills/onion-architecture/README.md) | Backend | `/engineering-paved-path:onion-architecture` | Onion rings by role for a Fastify + Zod + Drizzle backend: where routes, services, repositories, adapters and helpers live; ports and DI; a dependency-cruiser rules template |
| [next-best-practices](skills/next-best-practices/SKILL.md) | Frontend | Loaded by Claude only (not user-invocable) | Next.js App Router, RSC boundaries, data fetching, optimization |
| [react-best-practices](skills/react-best-practices/SKILL.md) | Frontend | `/engineering-paved-path:react-best-practices` | React anti-patterns, state management, hooks rules |
| [frontend-architecture](skills/frontend-architecture/README.md) | Frontend | `/engineering-paved-path:frontend-architecture` | Where components, constants, helpers, hooks and business logic live; component splitting; import boundaries |
| [react-testing-library](skills/react-testing-library/README.md) | Frontend | `/engineering-paved-path:react-testing-library` | User-flow React Testing Library tests with Vitest and MSW |
| [zod](skills/zod/README.md) | Full-stack | `/engineering-paved-path:zod` | Zod schema validation, parsing, error handling, type inference |
| [typescript-expert](skills/typescript-expert/SKILL.md) | Full-stack | `/engineering-paved-path:typescript-expert` | Type-level programming, performance, tooling, migrations |
| [security](skills/security/SKILL.md) | Full-stack | `/engineering-paved-path:security` | OWASP Top 10:2025, auth, injection, uploads, secrets |

## Configuration

None. The plugin has no `userConfig` and the skills take no arguments.

Project-specific rules come from the target project itself:

- `frontend-architecture` §10 and `onion-architecture` §2 tell the agent to read the project's `CLAUDE.md`, `AGENTS.md` and architecture docs, and to map the generic rules onto the project's folders.
- `onion-architecture` ships [assets/dependency-cruiser.cjs](skills/onion-architecture/assets/dependency-cruiser.cjs), a rules template with path placeholders. Copy it into the backend and edit the `PATHS` block; [references/enforcement.md](skills/onion-architecture/references/enforcement.md) has the steps.

## Usage

**Let Claude pick the skill.** Ask a normal question; the matching skill loads by its description:

```
Where should the discount calculation for orders live, and how do I test it?
```

Claude loads `engineering-paved-path:onion-architecture`, answers with a pure helper in the orders module plus a unit test, and keeps SQL and the route handler thin.

**Preload skills into your own agent.** A subagent can preload skills from this plugin with the full plugin-scoped name in its `skills:` frontmatter. Bare names are not used, so a project skill with the same name is never picked up by mistake.

```markdown
---
name: backend-implementer
description: Implements backend tasks in this repository.
skills:
  - engineering-paved-path:onion-architecture
  - engineering-paved-path:fastify-best-practices
  - engineering-paved-path:drizzle-orm-patterns
---
```

If the agent lives in another plugin, that plugin must declare `engineering-paved-path` in its `dependencies`, as `architecture-review` and `sdd-engineering` do.

## How it fits with other plugins

This plugin is the shared base. The agents of the other plugins preload these skills:

| Skill | spec-creator | implementation-planner | implementer | test-writer | plan-verifier | architecture-reviewer |
| --- | :-: | :-: | :-: | :-: | :-: | :-: |
| `engineering-paved-path:onion-architecture` | ● | ● | ● | ● | ● | ● |
| `engineering-paved-path:frontend-architecture` | ● | ● | ● |  | ● | ● |
| `engineering-paved-path:typescript-expert` |  | ● | ● | ● | ● | ● |
| `engineering-paved-path:zod` | ● | ● | ● | ● |  |  |
| `engineering-paved-path:security` | ● | ● | ● | ● |  | ● |
| `engineering-paved-path:fastify-best-practices` |  | ● | ● | ● |  | ● |
| `engineering-paved-path:drizzle-orm-patterns` |  | ● | ● | ● |  | ● |
| `engineering-paved-path:postgresql-table-design` |  | ● | ● |  |  |  |
| `engineering-paved-path:react-best-practices` |  | ● | ● |  |  | ● |
| `engineering-paved-path:next-best-practices` |  | ● | ● |  |  | ● |
| `engineering-paved-path:react-testing-library` |  | ● | ● | ● |  |  |

- `architecture-reviewer` is in the [architecture-review](../architecture-review) plugin.
- The other five agents are in the [sdd-engineering](../sdd-engineering) plugin.

Renaming or removing a skill here is a breaking change for those plugins. It is released as a MAJOR version, and their dependency ranges are updated in the same change.

## Dependencies

- No other plugins.
- `typescript-expert/scripts/ts_diagnostic.py` needs Python 3 if you run it.
- `onion-architecture`'s enforcement template needs [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) installed in the target project when you adopt it.

## Based on

Each skill keeps its own source list:

- `onion-architecture`: 26 sources on onion, hexagonal and clean architecture, Fastify, Drizzle and dependency-cruiser. See [skills/onion-architecture/README.md](skills/onion-architecture/README.md#sources) and [references/sources.md](skills/onion-architecture/references/sources.md).
- `frontend-architecture`: 25 sources on React and Next.js code organization. See [skills/frontend-architecture/README.md](skills/frontend-architecture/README.md#sources) and [references.md](skills/frontend-architecture/references.md).
- `react-testing-library`: Kent C. Dodds' testing articles, the Testing Library, MSW and Vitest docs. See [skills/react-testing-library/README.md](skills/react-testing-library/README.md#sources).
- `fastify-best-practices`: [mcollina/fastify-best-practices](https://github.com/mcollina/fastify-best-practices) and the [Fastify docs](https://fastify.dev/docs/latest/).
- `security`: OWASP Top 10:2025 and the security skills compared in [skills/security/references.md](skills/security/references.md).
- `zod`: the [Zod documentation](https://zod.dev/). See [skills/zod/README.md](skills/zod/README.md#references).
- `next-best-practices`, `react-best-practices`, `drizzle-orm-patterns`, `postgresql-table-design`, `typescript-expert`: the official docs of [Next.js](https://nextjs.org/docs), [React](https://react.dev/), [Drizzle ORM](https://orm.drizzle.team/docs/overview), [PostgreSQL](https://www.postgresql.org/docs/) and [TypeScript](https://www.typescriptlang.org/docs/), plus the links inside each `SKILL.md`.
