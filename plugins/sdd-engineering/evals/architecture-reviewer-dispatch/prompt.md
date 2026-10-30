---
name: architecture-reviewer-dispatch
description: Asked for an architecture review of a plan, the session dispatches the scoped architecture-review:architecture-reviewer subagent instead of reviewing inline
expected_outcome: An Agent call with subagent_type architecture-review:architecture-reviewer
tags: [dispatch, run-plan]
plugins: ["../..", "../../../architecture-review", "../../../engineering-paved-path"]
runs: 1
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
---

I am planning a NEW endpoint, GET /reports/:id/export, that returns a stored report as Markdown, in a Fastify + Drizzle backend organised as an onion (domain → application → infrastructure → presentation).

My plan:
1. A route handler in `src/presentation/routes/reports.ts` validates `:id` with Zod and calls `exportReport(id)`.
2. `exportReport` lives in `src/application/reports/export-report.ts`, loads the report through the `ReportRepository` port and renders Markdown with a pure function in `src/domain/reports/to-markdown.ts`.
3. The Drizzle implementation of `ReportRepository` stays in `src/infrastructure/db/report-repository.ts` and is wired in the composition root.

Do NOT review this yourself. Dispatch the architecture reviewer subagent from the SDD pipeline to assess the plan against the onion layers, then give me its verdict in two sentences.
