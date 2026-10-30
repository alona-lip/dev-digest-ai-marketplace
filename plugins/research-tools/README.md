# research-tools

## What it is

A read-only research agent, `researcher`. It finds information inside the current project (code, docs, config, git history) or on the public internet and returns it in a strict template where every claim carries a locator: a `path:line` or a URL. It never edits code and never runs deep-research.

Its only possible write is one research note, `<research_dir>/<feature>.research.md`, and only when the brief names a feature. A hook shipped with the plugin enforces that.

## Install

```
/plugin marketplace add alona-lip/dev-digest-ai-marketplace
/plugin install research-tools@dev-digest-ai-marketplace
```

`sdd-engineering` installs this plugin automatically as a dependency.

## Components

| Component | Invocation | What it does |
| --- | --- | --- |
| Agent `researcher` | `@agent-research-tools:researcher <question>`, or the Agent tool with `subagent_type: research-tools:researcher` | Answers a question about the project or the web in a fixed template. Asks clarifying questions first when the request is too vague to research |
| Hook `restrict-writes.sh` | Runs on every `Write`, `Edit`, `MultiEdit` and `NotebookEdit` call | Lets `research-tools:researcher` write only `<research_dir>/*.research.md`. Other agents and the main session are not affected |

## Configuration

| Setting | Kind | Default | Meaning |
| --- | --- | --- | --- |
| `research_dir` | `userConfig` | `docs/plans` | Project-relative directory for research notes. Set it in `/config` or when the plugin is enabled |
| `feature:<slug>` | Brief argument | — | Turns on the research note. Without it the agent writes nothing |
| `out:<path>` | Brief argument | `<research_dir>/<slug>.research.md` | Another file name for the note. It must still be a `*.research.md` file directly inside `research_dir` |

Until you save a value for `research_dir`, Claude Code does not pass the default to the agent or the hook, so both fall back to `docs/plans` on their own.

## Usage

Ask a question about the project:

```
@agent-research-tools:researcher Where do we validate request bodies, and which library do we use?
```

The reply follows the project template:

```
## Research result — Project
**Question:** Where are request bodies validated, and with which library?
**Mode:** Project
**Confidence:** High — every route reads its schema from the same helper

### Summary
…

### Findings
1. **Routes validate bodies with zod schemas**
   - **Location:** `src/orders/routes.ts:14`
   - **Evidence:**
     ```
     body: createOrderSchema,
     ```
   - **What it means:** …

### Not found / gaps
- Nothing — all parts of the question were answered.
```

Internet questions use the same shape with **Source** links, plus **Conflicts / caveats** and **Sources** sections. A mixed question gets both blocks, project first.

Prepare facts for a feature and save them:

```
@agent-research-tools:researcher feature:order-export What do we already have for exporting orders: endpoints, serializers, background jobs?
```

The agent writes `docs/plans/order-export.research.md` (first line `# Research: order-export`, then a `Date:` line and the template) and returns the path and the summary. If the file already exists, it writes `order-export-2.research.md` unless the brief says to overwrite.

## How it fits with other plugins

- In [`sdd-engineering`](../sdd-engineering), `spec-creator` and `implementation-planner` dispatch `research-tools:researcher` with `feature:<slug>` before they write a spec or a plan. The planner then reads the note.
- The agent is useful on its own for any fact-finding task where you want citations and no edits.

## Dependencies

- No plugin dependencies.
- `jq` on the `PATH`. Without it the hook blocks every write by `researcher`; other writes are not affected.
- `WebSearch` and `WebFetch` need network access for internet questions.

## Based on

- [Claude Code subagents](https://code.claude.com/docs/en/sub-agents): agent file format and trigger-rule descriptions
- [Claude Code hooks](https://code.claude.com/docs/en/hooks): `PreToolUse` blocking with exit code 2
- [Best practices for Claude Code subagents (PubNub)](https://www.pubnub.com/blog/best-practices-for-claude-code-sub-agents/): narrow tools per agent, read-only research roles
