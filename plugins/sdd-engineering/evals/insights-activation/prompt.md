---
name: insights-activation
description: engineering-insights activates when the user reports a genuine, hard-won discovery
expected_outcome: The session invokes the sdd-engineering:engineering-insights skill
tags: [activation, engineering-insights]
runs: 1
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

I just figured out why a pgvector similarity query kept returning zero rows: after we switched the embedding model, the vector column's dimension no longer matched the new embeddings, and nothing failed loudly. I want to record this so nobody on the team steps on it again.
