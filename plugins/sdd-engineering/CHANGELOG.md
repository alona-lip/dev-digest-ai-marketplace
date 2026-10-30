# Changelog

All notable changes to this plugin are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the plugin uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-10-30

### Dependencies

- `engineering-paved-path` `^1.0.0`
- `research-tools` `^1.0.0`
- `architecture-review` `^1.0.0`

### Added

- Agents `spec-creator`, `implementation-planner`, `implementer`, `test-writer` and `plan-verifier`.
- Skill `run-plan`: runs an approved plan through implementers, the architecture and correctness review gate, tests from acceptance criteria and `plan-verifier`. Checks come from the plan's Check gate; one correctness reviewer runs per touched package.
- Skill `workflow-retro` (manual only) with the `ledger:<path>` argument.
- Skills `engineering-insights` (writes to `INSIGHTS.md` in the nearest package root) and `mermaid-diagram`.
- `userConfig` options `specs_dir` (default `specs`) and `plans_dir` (default `docs/plans`).
- `PreToolUse` write guard that limits `spec-creator` to `specs_dir` and `implementation-planner` to `plans_dir`.
- Eval cases for `engineering-insights` activation and the architecture reviewer dispatch.
