# Changelog

All notable changes to this plugin are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the plugin uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-10-30

Dependencies: `engineering-paved-path ^1.0.0`.

### Added

- `architecture-reviewer` agent: read-only audit of a diff or file set against the project's documented architecture contracts, one cited contract per finding, severity per finding and a PASS/FAIL gate.
- Fallback to the preloaded `engineering-paved-path` skills when the project documents no contracts.
- Eval suite in `evals/` for `claude plugin eval`: violations found and cited, no out-of-scope findings, project rule identifiers, no false positives on a benign rename.
