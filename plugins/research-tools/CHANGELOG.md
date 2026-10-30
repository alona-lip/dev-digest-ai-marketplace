# Changelog

All notable changes to this plugin are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the plugin uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-10-30

### Added

- `researcher` agent: read-only research in the project or on the web, with a locator for every claim.
- Research note `<research_dir>/<feature>.research.md` when the brief contains `feature:<slug>`, with an optional `out:<path>`.
- `research_dir` option, default `docs/plans`.
- `PreToolUse` hook `restrict-writes.sh` that limits `research-tools:researcher` to its research note.
