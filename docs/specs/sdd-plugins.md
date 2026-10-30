# SDD plugins

- **Status:** draft
- **Date:** 2026-10-30
- **Source:** [`alona-lip/dev-digest`](https://github.com/alona-lip/dev-digest) (`.claude/agents`, `.claude/skills`)

## Why

The Spec-Driven Development (SDD) agents and skills live only inside the dev-digest product repository and depend on its layout: `server/`, `client/`, `reviewer-core/`, `docs/plans/`, `pnpm arch:check` and the devdigest MCP server. This spec moves them into this marketplace as four versioned plugins that are **not tied to any project**. Any repository can then install the SDD pipeline with one command, and the shared parts (stack skills, `researcher`, `architecture-reviewer`) can be installed on their own.

## 1. Plugins

| Plugin | Version | Contents | Depends on |
| --- | --- | --- | --- |
| `engineering-paved-path` | 1.0.0 | 11 stack skills: `react-best-practices`, `next-best-practices`, `react-testing-library`, `frontend-architecture`, `fastify-best-practices`, `drizzle-orm-patterns`, `postgresql-table-design`, `onion-architecture`, `zod`, `typescript-expert`, `security` | — |
| `research-tools` | 1.0.0 | Agent `researcher`: read-only, except for one optional research note. Write-guard hook. | — |
| `architecture-review` | 1.0.0 | Agent `architecture-reviewer`: generalized and read-only. Preloads 8 skills from `engineering-paved-path`. | `engineering-paved-path ^1.0.0` |
| `sdd-engineering` | 1.0.0 | Agents `spec-creator`, `implementation-planner`, `implementer`, `test-writer`, `plan-verifier`. Skills `run-plan`, `workflow-retro`, `mermaid-diagram`, `engineering-insights`. Write-guard hook, evals, README, CHANGELOG. | all three above, `^1.0.0` |

- `test-writer` is the fifth agent in `sdd-engineering` because step 3 of `run-plan` dispatches it.
- `mermaid-diagram` and `engineering-insights` stay in `sdd-engineering`: they serve the process, not a tech stack.

## 2. Dependency graph

### Plugins

`dependencies` in each `plugin.json`:

```
                 ┌─────────────────────────────────────────┐
                 │          sdd-engineering  1.0.0         │
                 │  agents: spec-creator · implementation- │
                 │  planner · implementer · test-writer ·  │
                 │  plan-verifier                          │
                 │  skills: run-plan · workflow-retro ·    │
                 │  mermaid-diagram · engineering-insights │
                 └──────┬──────────────────┬───────────┬───┘
                 ^1.0.0 │           ^1.0.0 │    ^1.0.0 │
                        │                  │   ┌───────▼─────────────┐
                        │                  │   │ architecture-review │
                        │                  │   │ 1.0.0               │
                        │                  │   │ architecture-       │
                        │                  │   │ reviewer            │
                        │                  │   └───────┬─────────────┘
                        │                  │    ^1.0.0 │
             ┌──────────▼───────────────┐  │           │
             │ engineering-paved-path   │◀─┼───────────┘
             │ 1.0.0 · 11 stack skills  │  │
             └──────────────────────────┘  │
                                   ┌───────▼──────┐
                                   │ research-    │
                                   │ tools 1.0.0  │
                                   │ researcher   │
                                   └──────────────┘
```

- `engineering-paved-path` and `research-tools` have no dependencies.
- `architecture-review` can be installed alone. It pulls in `engineering-paved-path` automatically.
- `sdd-engineering` declares `engineering-paved-path` directly as well, because its own agents preload those skills.

```jsonc
// plugins/architecture-review/.claude-plugin/plugin.json
"dependencies": [
  { "name": "engineering-paved-path", "version": "^1.0.0" }
]

// plugins/sdd-engineering/.claude-plugin/plugin.json
"dependencies": [
  { "name": "engineering-paved-path", "version": "^1.0.0" },
  { "name": "research-tools",         "version": "^1.0.0" },
  { "name": "architecture-review",    "version": "^1.0.0" }
]
```

Claude Code resolves a range against git tags named `<plugin>--v<version>`. `scripts/tag-releases.sh` already creates tags in that format, so all four plugins start at **1.0.0**.

### Who dispatches whom

```
/sdd-engineering:run-plan plan:<path>
 ├─▶ implementer ×N                              [sdd-engineering]
 ├─▶ architecture-review:architecture-reviewer   [architecture-review]
 ├─▶ general-purpose (correctness)  ← run-plan/references/{reviewer-prompt,severity}.md
 ├─▶ test-writer                                 [sdd-engineering]
 └─▶ plan-verifier                               [sdd-engineering]

spec-creator, implementation-planner ─▶ research-tools:researcher

/sdd-engineering:workflow-retro (manual) → ${CLAUDE_SKILL_DIR}/scripts/analyze_journals.py → ledger
```

### Preloaded skills

The `skills:` frontmatter of each agent:

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
| `mermaid-diagram` | ● | ● |  |  |  |  |
| `engineering-insights` | ● | ● | ● | ● |  |  |

`researcher` preloads nothing. Every skill taken from another plugin belongs to a plugin that the agent's own plugin declares as a dependency.

## 3. Layout

```
plugins/
├── engineering-paved-path/
│   ├── .claude-plugin/plugin.json
│   ├── skills/<11 skills>/SKILL.md      (+ references/, rules/, evals/, README.md as in the source)
│   ├── README.md
│   └── CHANGELOG.md
├── research-tools/
│   ├── .claude-plugin/plugin.json       (userConfig: research_dir)
│   ├── agents/researcher.md
│   ├── hooks/hooks.json
│   ├── scripts/restrict-writes.sh
│   ├── README.md
│   └── CHANGELOG.md
├── architecture-review/
│   ├── .claude-plugin/plugin.json       (dependencies)
│   ├── agents/architecture-reviewer.md
│   ├── README.md
│   └── CHANGELOG.md
└── sdd-engineering/
    ├── .claude-plugin/plugin.json       (dependencies, userConfig: specs_dir, plans_dir)
    ├── agents/{spec-creator,implementation-planner,implementer,test-writer,plan-verifier}.md
    ├── skills/run-plan/{SKILL.md,README.md,references/{reviewer-prompt.md,severity.md}}
    ├── skills/workflow-retro/{SKILL.md,README.md,scripts/analyze_journals.py}
    ├── skills/mermaid-diagram/
    ├── skills/engineering-insights/
    ├── hooks/hooks.json
    ├── scripts/restrict-writes.sh
    ├── evals/<case>/{prompt.md,graders/}
    ├── README.md
    └── CHANGELOG.md
```

## 4. Portability

**Rule:** no file shipped under `plugins/` names DevDigest, its modules or its paths. Project-specific values come from `userConfig`, from skill or agent arguments, or from the target project's own `CLAUDE.md`, `AGENTS.md` and `docs/`. Agents read those files at runtime and do not assume they exist.

### Replacements

| In dev-digest | In the plugin |
| --- | --- |
| `<module>/specs/`, `specs/`, `e2e/docs/specs/` | `userConfig.specs_dir` (default `specs`), referenced as `${user_config.specs_dir}` |
| `docs/plans/<feature>.md` | `userConfig.plans_dir` (default `docs/plans`) |
| `docs/plans/<feature>.research.md` | `research-tools` `userConfig.research_dir` (default `docs/plans`), or `out:<path>` in the brief |
| `docs/retros/ledger.md` | `workflow-retro` argument `ledger:<path>` (default `docs/retros/ledger.md`) |
| `<module>/INSIGHTS.md` for `client`, `server`, `reviewer-core`, `e2e`, `mcp-server` | `INSIGHTS.md` in the nearest package root of the touched file (the directory with the package manifest), else in the repository root |
| `pnpm arch:check`, `check-shared.sh`, per-module test commands, `e2e:` levels | A **Check gate** section in the plan. `implementation-planner` writes it from the project's own scripts; `run-plan` and `plan-verifier` run it. |
| `.claude/skills/<skill>/scripts/...` | `${CLAUDE_SKILL_DIR}/scripts/...` |
| `skills: [react-best-practices]` | `skills: [engineering-paved-path:react-best-practices]` |
| `subagent_type: architecture-reviewer` | `architecture-review:architecture-reviewer` |
| `mcp__devdigest__*` in `tools:` | removed |
| DevDigest's six clarification categories | kept as generic categories: data and loading, display, interactions, state, feedback, edge cases |
| `SPEC-NN` global counter | next free number found by scanning `specs_dir` |
| "Ported from course branch `lesson-*`" notes | removed from shipped files; public sources stay in each README under **Based on** |

### Audit of the source files

Counts are matches for DevDigest names and paths in the source repository.

| Component | Matches | Change |
| --- | --- | --- |
| `react-best-practices`, `react-testing-library`, `fastify-best-practices`, `drizzle-orm-patterns`, `typescript-expert`, `mermaid-diagram` | 0 | Copy as is. |
| `next-best-practices`, `postgresql-table-design`, `zod` | False positives: "Server/Client" components, the skill's own `AGENTS.md` | Copy. Link `zod/AGENTS.md` through `${CLAUDE_SKILL_DIR}`. |
| `security` | 1: an install line pointing to `.claude/skills/` in `references.md` | Remove the line. |
| `frontend-architecture` | 21: §10 "DevDigest `client/` overrides", `@devdigest/shared`, evals | Delete §10 and replace it with "project overrides: read the project's `CLAUDE.md` / `AGENTS.md`". Rewrite the evals for a neutral sample app. |
| `onion-architecture` | 147: rings mapped to `server/src` and `reviewer-core`, `arch:check`, `ContainerOverrides`, legacy baseline | Rewrite as a generic onion guide for a Fastify + Zod + Drizzle backend, with rings defined by role, not by path. Drop `references/reviewer-core.md` and `references/legacy-baseline.md`. Turn `references/enforcement.md` and `assets/dependency-cruiser.cjs` into a template with placeholder paths. Rewrite the evals. |
| `engineering-insights` | 13: module list and paths | Use the nearest-package-root rule above. |
| `run-plan` | 20 | Take checks from the plan's Check gate. Run one correctness reviewer per touched package instead of per `server` / `client` / `reviewer-core`. Read the reviewer prompt from `references/`. |
| `workflow-retro` | 15: ledger path, project slug example, `restrict-writes.sh` path | Add the `ledger:` argument, describe the project slug generically, call the script through `${CLAUDE_SKILL_DIR}`. |
| Agents: `spec-creator` 24, `implementation-planner` 41, `implementer` 20, `test-writer` 20, `architecture-reviewer` 33, `researcher` 6, `plan-verifier` 4 | — | Apply the replacements table. `architecture-reviewer` drops its seven built-in DevDigest rules: it first finds the project's documented architecture contracts and cites one per finding. `test-writer` drops testcontainers and `MockLLMProvider` specifics and reads the project's test conventions instead. |

### Enforcement

A new `scripts/check-portability.sh`, run by `.github/workflows/validate.yml`, searches `plugins/` for:

```
devdigest|DevDigest|reviewer-core|mcp-server|@devdigest|\.claude/skills/|arch:check|lesson-[0-9]+-lab
```

Any match fails the check. The marketplace name `dev-digest-ai-marketplace` in install commands is allowed.

## 5. Write guards

Claude Code ignores the `hooks` field in the frontmatter of plugin agents. `sdd-engineering` and `research-tools` therefore each ship `hooks/hooks.json` with a `PreToolUse` hook (matcher `Write|Edit|MultiEdit|NotebookEdit`) that runs `"${CLAUDE_PLUGIN_ROOT}/scripts/restrict-writes.sh"`. The script:

- reads `agent_type` from the hook input and matches the full plugin-scoped name (see §11). If it is missing or names an agent the plugin does not guard, the script exits 0;
- allows `sdd-engineering:spec-creator` to write only `<specs_dir>/**/*.md`;
- allows `sdd-engineering:implementation-planner` to write only `<plans_dir>/*.md`, except `*.research.md`;
- allows `research-tools:researcher` to write only `<research_dir>/*.research.md`;
- reads the directories from `$CLAUDE_PLUGIN_OPTION_SPECS_DIR`, `$CLAUDE_PLUGIN_OPTION_PLANS_DIR` and `$CLAUDE_PLUGIN_OPTION_RESEARCH_DIR`;
- blocks the write (exit 2) when `jq` is missing.

Each agent prompt states the same rule. The hook is what enforces it.

## 6. READMEs

Every plugin README has these sections:

1. **What it is**
2. **Install**
3. **Components**: a table with the component, how to invoke it and what it does
4. **Configuration**: `userConfig` and arguments
5. **Usage**: one or two worked examples
6. **How it fits with other plugins**
7. **Dependencies**
8. **Based on**: public sources

Text is taken from the source repository where possible and cleaned per §4.

| README | Taken from dev-digest | Added |
| --- | --- | --- |
| `engineering-paved-path/README.md` | `.claude/skills/README.md`: catalog rows for the stack skills, "What are skills" | How to preload a skill from another plugin (`engineering-paved-path:<skill>`); which agents use which skill (the preloaded-skills table) |
| Per-skill READMEs: `frontend-architecture`, `onion-architecture`, `react-testing-library`, `zod` | Copied, then cleaned | — |
| `research-tools/README.md` | `.claude/agents/README.md`, `researcher` section | Output template, `out:` and `research_dir`, write guard |
| `architecture-review/README.md` | `.claude/agents/README.md`, `architecture-reviewer` section: what it does, scope, based on | How to document a project's contracts so the reviewer can cite them; standalone use as `@agent-architecture-review:architecture-reviewer` |
| `sdd-engineering/README.md` | `.claude/agents/README.md`: agent table, pipeline, inputs and outputs, write restrictions, budget, questions from subagents, per-agent sections. `docs/workflow.md`: the five-phase cycle, generalized. `skills/run-plan/README.md`, `skills/workflow-retro/README.md` | Quick start in an empty project; `userConfig` setup; Check gate format; troubleshooting for a missing dependency and blocked writes |
| `skills/run-plan/README.md`, `skills/workflow-retro/README.md` | Copied, then cleaned | Invocation with the plugin namespace |

## 7. Pipeline

This is the core of the `sdd-engineering` README.

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

`spec-creator` and `implementation-planner` run on opus; the other agents run on sonnet. `run-plan` defaults: `max-parallel:3`, `max-fix:2`. `workflow-retro` runs only when the user invokes it.

## 8. Versions and releases

- Every plugin has a `CHANGELOG.md` in [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. The first entry for all four plugins is `[1.0.0]`.
- The CHANGELOGs of `sdd-engineering` and `architecture-review` record the dependency ranges of each release.
- SemVer and the release flow follow [RELEASES.md](../RELEASES.md). A breaking change in `engineering-paved-path`, such as a renamed or removed skill, is a MAJOR release of that plugin and requires updating the ranges in `architecture-review` and `sdd-engineering`.
- Release order: `engineering-paved-path` and `research-tools`, then `architecture-review`, then `sdd-engineering`.

## 9. Marketplace registration

- Add four entries to `.claude-plugin/marketplace.json` with `name`, `source: ./plugins/<name>`, `description`, `category` and `tags`. Do not set `version` there.
- `hello-world` stays.
- Add four rows to the Plugins table in the root `README.md`.

## 10. Not ported

- Product specs, plans and retros
- Secrets
- Cache (`pr-self-review/scripts/cache.mjs`)
- DevDigest-specific instructions: module `AGENTS.md` / `CLAUDE.md`, `.claude/settings.json`
- `pr-self-review`, `doc-writer`, `docs/agent-prompts`
- `onion-architecture/references/reviewer-core.md` and `references/legacy-baseline.md`

## 11. Naming decisions

Every cross-plugin reference uses the full plugin-scoped name, `<plugin>:<component>`. Bare names are not used, so a project's own skill or agent with the same name is never picked up by mistake.

| Where | Name used | Example |
| --- | --- | --- |
| Agent `skills:` frontmatter | `<plugin>:<skill>` | `engineering-paved-path:onion-architecture` |
| `agent_type` matched by `restrict-writes.sh` | `<plugin>:<agent>` | `sdd-engineering:spec-creator`, `research-tools:researcher` |
| `subagent_type` passed to the Agent tool | `<plugin>:<agent>` | `architecture-review:architecture-reviewer`, `research-tools:researcher` |

The Claude Code docs do not state these forms explicitly for the three places above. The first packaging PR confirms them with a small probe plugin and a logging hook, before the guard script and `run-plan` are written.
