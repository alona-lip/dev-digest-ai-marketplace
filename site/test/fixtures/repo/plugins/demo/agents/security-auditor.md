---
name: security-auditor
description: Audits the codebase for vulnerabilities and leaked secrets.
tools: [Read, Grep, Glob]
model: sonnet
skills:
  - code-review          # same plugin, bare name
  - other-plugin:helper  # another plugin
---

Scan for known vulnerability patterns.
