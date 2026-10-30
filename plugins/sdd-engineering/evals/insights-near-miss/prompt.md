---
name: insights-near-miss
description: Near-miss negative — explaining the same topic must not record an insight
expected_outcome: The session answers the question and never invokes engineering-insights
tags: [activation, engineering-insights, negative]
runs: 1
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

Explain how column dimensions work in pgvector, and why a dimension mismatch between the column and the query vector can make a similarity query return zero rows.
