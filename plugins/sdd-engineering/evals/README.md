# sdd-engineering evals

Eval cases for [`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals). Each case is a `prompt.md` plus `graders/*.md`.

| Case | Checks | Graders |
| --- | --- | --- |
| `insights-activation` | `engineering-insights` fires when the user reports a hard-won discovery | `tool_used` Skill (indicative), `llm` |
| `insights-near-miss` | Explaining the same topic does not fire `engineering-insights` | `tool_used` Skill with `max: 0` on both arms, `llm` |
| `architecture-reviewer-dispatch` | Asked for an architecture review, the session dispatches `architecture-review:architecture-reviewer` instead of reviewing inline | `tool_used` Agent on `subagent_type`, `llm` (with-only) |

## Run

From the repository root:

```
claude plugin eval plugins/sdd-engineering --runs 1
claude plugin eval plugins/sdd-engineering --case 'insights-*'
```

Each run is a full Claude session on your own credentials, and the dispatch case also runs the nested reviewer. Results go to `evals/results/`, which is ignored by git.

## Notes

- The activation pair differs only by prompt and has the same turn budget, so a difference in the result comes from the prompt.
- In a two-arm run the `tool_used` Skill grader of `insights-activation` is a plugin-fired indicator, not part of the score, because whether the model calls the Skill tool or writes the entry directly is behaviour, not a defect. The `llm` grader scores the outcome. The negative case sets `arm: both`, because a skill that fires on a plain explanation is a defect.
- `architecture-reviewer-dispatch` loads `architecture-review` and `engineering-paved-path` from the sibling folders through `plugins:`, so it does not depend on what is installed. Its graders are `with-only`, because the baseline arm has no such agent.
