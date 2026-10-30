# Enforcement — dependency-cruiser

The skill ships a rules template,
[assets/dependency-cruiser.cjs](../assets/dependency-cruiser.cjs). A project
that adopts it gets a check that fails on any import crossing a ring the wrong
way (#24, #26).

## First, find out what the project already has

Read the project's `CLAUDE.md`, `AGENTS.md`, `package.json` scripts and CI
workflows. If it already runs dependency-cruiser (or another boundary checker
such as `eslint-plugin-boundaries`), use its config and its script names, and
treat the rule names below only as a guide to what each rule means. Don't add a
second checker.

## Adopting the template

| Step | What |
|---|---|
| 1 | Copy the template to the backend package as `.dependency-cruiser.cjs` |
| 2 | Edit the `PATHS` block so each ring points at the project's folders. Paths are regexes relative to where depcruise runs |
| 3 | Edit `SDKS`, `DB_DRIVERS` and `HTTP_FRAMEWORK` to list the packages the project uses |
| 4 | Set `PURE_PACKAGE` to the pure package's source folder (ring 0′), or leave it `null` |
| 5 | Add the scripts suggested in the template header, e.g. `lint:deps` and `lint:deps:baseline` |
| 6 | On an existing codebase, write the baseline once (`lint:deps:baseline`), commit it, and fix entries as their files are touched |
| 7 | Add the check script to the project's check gate and CI, next to typecheck and the unit tests |

Placeholders used below: `<check>` is the project's script that runs
dependency-cruiser with `--ignore-known`, and `<baseline>` is the script that
rewrites the known-violations file.

| What | Where |
|---|---|
| Rules | `<backend>/.dependency-cruiser.cjs` |
| Known violations | `<backend>/.dependency-cruiser-known-violations.json` |
| Check (fails on new violations) | `<check>` |
| Refresh baseline (after *fixing*) | `<baseline>` |
| See everything incl. known | `npx depcruise src --config .dependency-cruiser.cjs` (no `--ignore-known`) |

The template keeps `import type` edges (`tsPreCompilationDeps: true`) and
resolves path aliases through `tsconfig.json`. Use the `err-long` output type to
print each violated rule's comment — the comment says what to do. The exit code
is the number of error-level violations (#24, #26). The check needs no database
or Docker.

## Rules

Regexes are the `PATHS` constants of the template; the default layout is in
SKILL.md §2.

| Rule | From | Forbidden to | Typical fix |
|---|---|---|---|
| `shared-kernel-is-pure` | shared kernel | anything but itself and `zod` | keep contracts/ports as data + interfaces |
| `domain-is-pure` | `modules/*/{helpers,status,constants}.ts` | value imports of `db`, `adapters`, `platform` (except the error taxonomy), repositories, Drizzle, Fastify, SDKs | pass plain values in; move I/O to the service |
| `domain-knows-no-infra-types` | same | *type* imports of the above, except row types and the error taxonomy | type mappers with row types |
| `db-only-in-repositories` | modules except repositories | `db/**` (except row types), Drizzle, the Postgres driver | add a repository method |
| `application-knows-no-http` | modules except route files, `index.ts` facades, the request-context helper | Fastify packages, route files | return DTOs, throw `AppError` |
| `routes-are-thin` | `**/routes.ts` | `db`, `adapters`, repositories, Drizzle, SDKs | call the service |
| `sdk-only-in-adapters` | everything except adapters, the container and the pure package's adapter folder | the listed SDKs | port + adapter + container wiring |
| `modules-use-ports-not-adapters` | modules | adapters | use the container-provided port |
| `adapters-dont-know-modules` | adapters | modules | move the shared constant/type to the adapter or the shared kernel |
| `no-cross-module-internals` | `modules/<a>/**` | `modules/<b>/**` except `<b>/index.ts` and the shared modules folder | container repository, facade, or the shared folder |
| `only-composition-root-wires-modules` | `platform/**` except the container | modules | wire in the container |
| `pure-package-is-pure` | pure package | backend code (except the shared kernel), DB, Fastify | pass data in from the backend |
| `pure-package-no-node-io` | pure package | `fs`, `child_process`, `net`, `http(s)`, … | pass data in from the backend |
| `pure-package-sdk-only-in-adapter` | pure package except its adapter folder | the pure package's SDKs | keep SDK use inside its adapter |
| `pure-package-via-public-api` | backend | pure package files except `index.ts` | export it from `index.ts` |
| `no-circular` | anywhere | runtime import cycles (type-only cycles ignored) | usually two rings merged — split them |
| `not-to-unresolvable` | anywhere | unresolvable imports | typo, missing install, unknown alias |

The four `pure-package-*` rules exist only when `PURE_PACKAGE` is set.

## When a rule fires

1. Read the rule name and the comment `err-long` printed.
2. Find the ring of the *from* file (SKILL.md §2) and decide where the code
   really belongs (§3).
3. Move the code, not the rule. If the move is out of scope for the current
   task, stop and tell the user rather than baselining it.
4. A real gap in the rules (a legitimate new pattern the rules don't know) →
   change the rule in the project's config and record the reason where the
   project keeps architecture decisions (its docs or specs).

## Ratcheting the baseline

- Regenerate the baseline only after removing a violation. The diff of the
  known-violations file must contain only deletions — reviewers should treat an
  added entry as a blocker.
- When you touch a file that is in the baseline, don't copy its pattern into new
  code. Fix the violation if the change is in that area anyway.
- Rolling rules out gradually against an existing codebase and failing CI only
  on new violations is the approach lastminute.com describes for their app (#25).
