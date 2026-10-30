# Workflow Retro Skill

A **retrospective** for a finished multi-agent run — `/sdd-engineering:run-plan`, the spec → plan →
implement chain, a `Workflow()` fan-out, or any batch of sub-agents. It reports **what the run cost,
where it struggled, what it wasted and what to change next time**, and logs one trend row to a
ledger file (default `docs/retros/ledger.md`) so runs can be compared.

It knows the `sdd-engineering` agents (`spec-creator`, `implementation-planner`, the two fix loops of
`run-plan`, denials from the `restrict-writes.sh` write guards) and is `disable-model-invocation`.

## Manual only

Type `/sdd-engineering:workflow-retro` after a run worth reviewing. It is not wired to any hook,
`Stop` / `SubagentStop` event, or the tail of another skill, and must not be added to
`settings.json` — retros cost tokens, so you choose when to spend them.

## Counts nested sub-agents

`spec-creator` / `implementation-planner` fan out `research-tools:researcher`s, and `implementer` /
`test-writer` can spawn helpers. A parent's in-context `<usage>` excludes its children, so for such
runs use `deep`: journals are flat in `subagents/`, each with a `.meta.json` carrying `agentType` +
`spawnDepth`, and all depths are summed.

```
finished multi-agent run
  └─ scope the run            (which agents / which batch)
       └─ collect metrics      (in-context by default · `deep` parses JSONL journals)
            └─ analyse          (cost/resources + process + qualitative)
                 └─ recommend   (duplicated context · shared pre-read · split/merge role · concurrency · model · cache)
                      └─ report to chat  +  one trend row → ledger
```

## Usage

```
/sdd-engineering:workflow-retro label:<feature-slug> deep
/sdd-engineering:workflow-retro scope:session no-ledger
/sdd-engineering:workflow-retro label:<feature-slug> ledger:notes/retros.md
```

| Token | Meaning | Default |
|-------|---------|---------|
| `label:<slug>` | Name of the run under review | derived from run / date |
| `deep` | Parse on-disk JSONL journals (exact tokens, cache, tools, timing) | off |
| `session:<id>` | Session to parse in `deep` mode | current session |
| `scope:last` / `scope:session` | Most recent batch, or every agent in the session | `last` |
| `ledger:<path>` | Project-relative ledger file for the trend row | `docs/retros/ledger.md` |
| `no-ledger` | Print only; skip the ledger row | off |

## Cost estimate

Prices are **not** hard-coded — they drift. Confirm current per-model rates via the `claude-api`
skill and pass them with `--prices prices.json`; without them cost shows `n/a`.

## File structure

```
workflow-retro/
├── SKILL.md                     ← analyst: scope → collect → analyse → recommend → report
├── README.md                    ← this file
└── scripts/
    └── analyze_journals.py      ← read-only, stdlib-only JSONL parser for `deep` mode
```

The skill calls the helper as `python3 -I "${CLAUDE_SKILL_DIR}/scripts/analyze_journals.py"`, so it
works from wherever the plugin is installed.

## Relationship to other skills

- `/sdd-engineering:run-plan` **builds** a feature; `workflow-retro` looks **back** at how the run
  performed.
- `engineering-insights` records durable technical findings in the nearest package's `INSIGHTS.md`;
  `workflow-retro` is about the **process**, and its durable output is the ledger.
