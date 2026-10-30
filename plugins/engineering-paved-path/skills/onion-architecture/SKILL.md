---
name: onion-architecture
description: "Onion (ports & adapters / clean) architecture for a TypeScript backend built on Fastify, Zod and Drizzle + Postgres, with a hand-written DI container and SDK adapters. Says which ring every file is in by its role, what it may import, where new code goes, and how a dependency-cruiser check enforces it. Use this skill whenever you add or change a module, route, service, repository, adapter, port or helper in such a backend; move logic between files; add an external integration (a new SDK, API, queue, notifier); answer where-should-this-live questions (route or service? helper or service? repository or adapter? does this belong in a pure package?); see a dependency-cruiser failure; or review a backend PR for structure, layering or dependencies — even if nobody says architecture. Not for Fastify API details (fastify-best-practices), Drizzle query syntax (drizzle-orm-patterns), table design (postgresql-table-design) or Zod API (zod)."
metadata:
  version: 2.0.0
  updated: 2026-10-30
  tags: onion-architecture, hexagonal, clean-architecture, ports-and-adapters, fastify, drizzle, zod, dependency-injection, dependency-cruiser, backend
---

# Onion Architecture — Fastify + Zod + Drizzle backend

Where backend code lives and which way its dependencies point. `#N` cites a
source in [references/sources.md](references/sources.md) (links also in
[README.md](README.md)).

**Scope.** The backend package of a project: Fastify routes, services, Drizzle
repositories, SDK adapters, the DI container, and any pure library package the
backend calls. For framework and library mechanics use the neighbouring skills:
`engineering-paved-path:fastify-best-practices`,
`engineering-paved-path:drizzle-orm-patterns`,
`engineering-paved-path:postgresql-table-design`, `engineering-paved-path:zod`.
This skill decides *where* code goes; they decide *how* to write it there.

**Rings are defined by role, not by path.** §2 gives each ring with the role a
file plays and a *default* path. Before applying the rules to an existing
project, read its `CLAUDE.md`, `AGENTS.md` and architecture docs (often under
`docs/`), and map each ring to the project's real folders. If the project
documents its own layering rules, they win; use this skill for what they leave
open. If it documents nothing, follow the surrounding code and use the default
layout for new code.

## How to use this skill

- **Placing new code** → find the row in §3, check the ring's import rules in §2,
  then open the matching reference file for that tool.
- **The dependency check failed** → the rule name tells you the ring that was
  crossed; [references/enforcement.md](references/enforcement.md) explains each
  rule and the fix. Move the code; don't loosen the rule.
- **Touching a file that already breaks a rule** → don't copy the pattern; fix it
  if the change is in that area anyway (see "Ratcheting" in enforcement.md).
- **Reviewing a backend PR** → run the §8 checklist.
- **Before finishing any backend change** → run the project's check gate:
  typecheck, unit tests and, if the project has one, the dependency-cruiser
  script.
- **Setting up enforcement in a project** → copy
  [assets/dependency-cruiser.cjs](assets/dependency-cruiser.cjs), replace the
  path placeholders, and follow enforcement.md.

| Read this reference | When |
|---|---|
| [fastify-and-zod.md](references/fastify-and-zod.md) | writing or reviewing a route file, request/response schemas, errors → HTTP |
| [drizzle-and-repositories.md](references/drizzle-and-repositories.md) | any SQL, a new repository method, row→DTO mapping, transactions |
| [di-and-adapters.md](references/di-and-adapters.md) | a new SDK/integration, a port, the container, service constructors, tests per ring |
| [enforcement.md](references/enforcement.md) | a dependency-cruiser error, adopting or changing the rules, the baseline |
| [sources.md](references/sources.md) | you need the reasoning behind a rule or must justify it in review |

---

## 1. Principles

1. **Dependencies point inward.** Source code may depend on rings closer to the
   centre, never further out (#1, #3). "The database is not the center. It is
   external" (#1) — so are Fastify, third-party APIs, LLM providers, git and
   the disk.
2. **The core owns the ports.** The inside declares the interface it needs; the
   outside implements it and is plugged in at the composition root (#1, #2, #6).
   A port describes what the core needs, not the tool's API (#5).
3. **Plain data crosses boundaries.** Zod contracts / DTOs and plain values go
   in and out of a ring — not Drizzle tables, not `FastifyRequest`, not SDK
   objects (#3, #9).
4. **Functional core, imperative shell.** A use case is an impure → pure →
   impure sandwich: load what you need, call pure functions to decide, then
   write/send the result (#8). Pure code is where the business rules live and is
   trivially testable.
5. **Flat core, isolated modules.** Feature modules don't reach into each
   other's files; they meet through the container, a facade, or the shared
   kernel (#4, #5).
6. **Abstract real boundaries only.** A port exists where there is something
   external to swap or fake (#14, #15). Don't wrap Drizzle in a second
   repository interface, and don't add a DI framework on top of a hand-written
   container that already works.

Why it matters: the use cases must run hermetically in tests (fake LLM, fake
third-party API via container overrides), pure packages must run in CI without
a database, and each new feature module must be addable without touching the
others.

## 2. The rings

| Ring | Role | Default path | May import |
|---|---|---|---|
| **0 Shared kernel** — contracts + ports | Zod wire contracts, port interfaces | `src/contracts/**` (ports in `src/contracts/ports.ts`) | `zod` only |
| **0′ Pure package** (optional) | a library with the domain's heavy logic and no I/O | its own workspace package, `src/` | ring 0, its own files, one injected port; never Node I/O, DB, HTTP, backend code |
| **1 Domain logic** (pure) | rules and calculations over contracts | `modules/<m>/helpers.ts`, `status.ts`, `constants.ts` | rings 0, 0′ (public API), the error taxonomy; *types* from `db/rows.ts` for mappers |
| **2 Application** (use cases) | load → decide → persist/notify | `modules/<m>/service.ts` and other use-case files of the module | rings 0–1, ports, own repository, cross-cutting platform services (errors, logger, jobs) |
| **3a Driven adapters** | talk to the database and outside systems | `modules/<m>/repository.ts`, `modules/<m>/repository/*.repo.ts`, `src/adapters/**`, `src/db/**` | rings 0–1, Drizzle, SDKs, Node I/O |
| **3b Driving adapters** | turn HTTP (or a queue, a CLI) into a use-case call | `modules/<m>/routes.ts`, `modules/_shared/context.ts` | rings 0–2 (call the service), Fastify, zod |
| **Composition root** | build the app, pick implementations, wire modules | `src/app.ts`, `src/server.ts`, `src/modules/index.ts`, `src/platform/container.ts` | everything — the only place concretes meet ports |

`platform/{config,errors,jobs,logger,…}` is cross-cutting infrastructure. Only
`container.ts` may import feature modules.

Two deliberate exceptions:
- **Row types may cross as `import type`.** A `db/rows.ts` file exists so code
  can name a row shape without importing the data layer; `toXDto(row)` mappers
  take them. A *value* import of `db/schema*` or `drizzle-orm` outside ring 3a
  is a violation.
- **The error taxonomy is shared.** `AppError` and its subclasses
  (`platform/errors.ts`) are domain errors; the single `setErrorHandler` in
  `app.ts` maps them to HTTP.

## 3. Where does this code go?

| You're writing… | Put it in | Not in |
|---|---|---|
| A rule or calculation over domain data (score, rollup, status, eligibility) | `helpers.ts` / `status.ts` — a pure function over contracts | the route, the SQL, the service body |
| A use case: load → decide → persist/notify | a `service.ts` method (the sandwich, §1.4) | the route file |
| A SQL query, insert, upsert, aggregate | `repository/<entity>.repo.ts` function taking `db` first | service, route, helper |
| Row → wire DTO mapping | `toXDto(row)` in `helpers.ts` (row typed via `import type`) | inside the SQL function, inside the route |
| Request validation | Zod `schema.params/body/querystring` on the route (`fastify-type-provider-zod`) | `Schema.parse(req.body)` in the handler, the service |
| A call to an external SDK/API (payments, email, git, LLM, chat…) | a port in the shared kernel + impl in `src/adapters/<kind>/<impl>.ts` + wiring in `container.ts` + a test override | a module, a route |
| Choosing which implementation to use / reading a secret | `platform/container.ts` | a service (`new StripeClient(key)`) |
| Translating an error to an HTTP status | throw an `AppError` subclass; the `app.ts` error handler maps it | `reply.status(…)` in a service |
| Heavy pure logic shared by several use cases (a pricing engine, a rules engine, a parser) | a pure package (ring 0′) exported from its `index.ts`, or `helpers.ts` while it's small | a service, an adapter |
| Something two modules both need | `modules/_shared/` (presentation helpers) or the shared kernel (contracts) | importing the other module's file |
| Data another module owns | that module's repository via the container, or its `index.ts` facade | your own query against its tables |

## 4. Fastify + Zod — the driving side (ring 3b)

Details and examples → [references/fastify-and-zod.md](references/fastify-and-zod.md).

- A route handler does three things: read the request context, call **one**
  service method with typed input, return the DTO. Branching business logic in
  a handler belongs in the service (#3, #15).
- Declare `params`/`body`/`querystring` (and preferably `response`) as Zod
  schemas via `withTypeProvider<ZodTypeProvider>()` — parse at the edge, so the
  inside receives already-valid data (#13, #20).
- No `drizzle-orm`, `db/schema`, `container.db`, repositories or adapters in a
  route. The dependency rules catch the imports; `container.db` without an
  import is caught only by review (§8).
- Each module is an encapsulated Fastify plugin registered in
  `modules/index.ts`. Use `fastify-plugin` only for genuinely cross-cutting
  plugins; `decorate` only the container (#17, #18).
- Build the app in a `buildApp()` factory and test routes with `app.inject()` (#19).

## 5. Drizzle + Postgres — the driven side (ring 3a)

Details and examples → [references/drizzle-and-repositories.md](references/drizzle-and-repositories.md).

- `drizzle-orm`, the Postgres driver and the table objects in `db/schema*` are
  imported only by repository files and `src/db/**`.
- A repository is a collection-like API in domain language —
  `listByIds`, `latestOrderPerCustomer`, `completePayment` — not a generic
  `query(sql)` (#10). It returns rows (typed via `db/rows.ts`) or plain shapes;
  the service maps them to DTOs with helpers.
- Repository functions take the executor (`db`) as the first argument, which is
  what makes transactions composable: the service opens
  `db.transaction(async (tx) => …)` through a repository method and passes `tx`
  down (#22).
- Aggregation that SQL does naturally (GROUP BY, SUM) may live in SQL; business
  decisions (what counts as "latest", null-vs-zero) live in pure helpers so they
  are unit-testable without a database.

## 6. DI container, ports and external SDKs

Details and examples → [references/di-and-adapters.md](references/di-and-adapters.md).

- `platform/container.ts` is the composition root (#6). It picks the concrete
  class, resolves secrets lazily, and is the only place that `new`s an adapter.
  It accepts an `overrides` argument so tests can swap any port for a fake.
- Services receive their collaborators through the constructor — the
  repository, the ports they use — instead of reaching into the whole container
  (Service Locator hides dependencies, #12).
- Every third-party SDK (HTTP clients for outside APIs, LLM SDKs, git, search
  binaries, tokenizers…) is imported only under `src/adapters/**`.
- Adding an adapter = 4 steps: port in the shared kernel → impl in
  `src/adapters/<kind>/` → construct it in the container (lazily if it needs a
  secret) → add it to the container's test overrides with a fake. Skipping the
  last step makes every test hit the real thing.

## 7. Pure packages (ring 0′)

Some backends keep their heaviest logic in a separate package with no I/O, so
it can run in CI, in a worker or in another app. If the project has one:

- No database, third-party API, file system, child processes or HTTP server.
  The only side effect is an injected port (for example an LLM provider), and
  the SDK behind it is imported only in the package's adapter folder.
- Contracts come from the shared kernel, not from backend internals.
- Its public API is its `index.ts`; the backend imports the package name, never
  a deep path.
- If a change "needs I/O" (reading a file, calling an API), the backend loads
  the data in a service and passes it in as an argument.

## 8. Review checklist

Each item names the rule (§) it protects.

1. Does the dependency-cruiser check pass, and does the known-violations
   baseline only *lose* entries in this diff? (enforcement)
2. Is every new route handler just context → service call → DTO? Any
   `container.db`, `drizzle-orm`, repository or adapter in a route? (§4)
3. Are request inputs Zod schemas on the route, not hand-parsed? (§4)
4. Is every new SQL statement in a repository function that takes `db`
   first? (§5)
5. Are business decisions in pure helpers with unit tests, not in SQL or the
   handler? (§1.4, §5)
6. Does any helper/status/constants file import a value from `db`, `adapters`,
   `platform` (other than the error taxonomy), Fastify or an SDK? (§2)
7. Does any new code import an SDK outside `src/adapters/**`, or a concrete
   adapter class outside `container.ts`? Does the new adapter have a test
   override? (§6)
8. Does a new service take narrow constructor dependencies rather than the whole
   container? (§6)
9. Does any module import another module's internal file? (§3, §6)
10. Does any pure-package change add I/O, backend imports or a deep import? (§7)
11. Does any service set an HTTP status or build a `reply`? (§3)

**Anti-patterns to name in review:** fat route handler · Drizzle row or table
leaking into a DTO · SDK client constructed inside a service · Service Locator
(`this.container.x` scattered through a service) · an interface with one
implementation and no test double · cross-module deep import · baseline grown
to make CI green.

On anemic models: Fowler warns that moving all logic into services "robs" the
domain model (#11). This skill deliberately uses a *functional* core instead of
rich entities — contracts are plain Zod data and the rules live in pure helper
functions (#8, #9). The anti-pattern to avoid is therefore not "logic outside
entities" but "logic outside pure functions": rules buried in services, routes
or SQL.
