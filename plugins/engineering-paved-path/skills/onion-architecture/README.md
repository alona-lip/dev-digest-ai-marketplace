# onion-architecture

**Version:** 2.0.0 · **Updated:** 2026-10-30 · **Scope:** a TypeScript backend on Fastify + Zod + Drizzle/Postgres

A skill that tells the agent **which ring of the onion each backend file is in,
what it may import, and where new code goes**. Rings are defined by the role a
file plays, with a default layout for new code. The agent first reads the
project's `CLAUDE.md` / `AGENTS.md` and architecture docs and maps the rings to
the project's real folders. The rules are written for this stack:
- Fastify 5 routes + Zod via `fastify-type-provider-zod`
- Drizzle ORM over Postgres with role-named repository files
- a hand-written DI container with test overrides
- SDK adapters behind ports
- an optional pure package with no I/O

It also comes with **enforcement**: a dependency-cruiser rules template
([assets/dependency-cruiser.cjs](assets/dependency-cruiser.cjs)) with path
placeholders. Once adopted, it fails the check on any *new* violation, with
existing ones kept in a baseline and fixed when their code is touched.

## When it triggers

- adding or changing a module, route, service, repository, adapter, port or helper in the backend
- moving logic between files, or a where-does-this-live question (route or service, helper or service, repository or adapter, backend or pure package)
- adding an external integration (a new SDK, API, notifier or queue)
- a dependency-cruiser failure
- reviewing a backend PR for structure, layering or dependencies

## How it relates to the other backend skills

| Need | Skill |
|---|---|
| Which ring code belongs to, import direction, ports and adapters, enforcement | **onion-architecture** (this one) |
| Fastify API: plugins, hooks, schemas, performance | [fastify-best-practices](../fastify-best-practices/SKILL.md) |
| Drizzle query syntax, relations, migrations | [drizzle-orm-patterns](../drizzle-orm-patterns/SKILL.md) |
| Table design, indexes, constraints | [postgresql-table-design](../postgresql-table-design/SKILL.md) |
| Zod API: schemas, parsing, inference | [zod](../zod/SKILL.md) |
| Same question for the frontend | [frontend-architecture](../frontend-architecture/README.md) |

## Files

| File | For | Contents |
|---|---|---|
| [SKILL.md](SKILL.md) | the agent | Principles, the ring map by role, a where-does-it-go table, short rules per tool, pure packages, the review checklist |
| [references/fastify-and-zod.md](references/fastify-and-zod.md) | the agent | The driving side: thin handlers, schema-first validation, errors → HTTP, streaming, tests |
| [references/drizzle-and-repositories.md](references/drizzle-and-repositories.md) | the agent | The driven side: repositories, row → DTO, what may stay in SQL, transactions |
| [references/di-and-adapters.md](references/di-and-adapters.md) | the agent | Ports, the composition root, the 4 steps for a new integration, constructor injection, cross-module access, tests per ring |
| [references/enforcement.md](references/enforcement.md) | agent + people | Adopting the template, every rule, how to handle a failure, ratcheting the baseline |
| [references/sources.md](references/sources.md) | agent + people | Key points of all 26 sources, and where they disagree with what we chose |
| [assets/dependency-cruiser.cjs](assets/dependency-cruiser.cjs) | maintainers | dependency-cruiser rules template: edit the `PATHS` and package blocks, then copy it into the backend |
| [evals/evals.json](evals/evals.json) | maintainers | 5 test prompts with assertions in skill-creator format, set in a sample bookstore backend. The agent doesn't load it |
| README.md | people | This overview, the version history and the link list |

Design notes: `SKILL.md` stays short (under 500 lines). Tool-specific detail
lives in `references/`, which the agent opens only when it touches that tool
(progressive disclosure). Rules explain *why*, and every rule cites a source `#N`.

## Enforcement at a glance

| Script (suggested names) | What it does |
|---|---|
| `lint:deps` | Runs dependency-cruiser with `--ignore-known`, so it fails only on new violations and prints the rule's comment with the fix |
| `lint:deps:baseline` | Rewrites `.dependency-cruiser-known-violations.json`. Run it only after fixing a violation: the diff must only remove entries |

If the project already has a boundary checker, use it instead; see
[references/enforcement.md](references/enforcement.md).

## Versioning

The version lives in `SKILL.md` frontmatter under `metadata.version`. The skill
spec allows only `name`, `description`, `license`, `allowed-tools`, `metadata`
and `compatibility` at the top level. The version follows semver:
- **major:** a rule changes so that existing, passing code would now fail the check or the checklist
- **minor:** new rules, sections or reference files
- **patch:** wording, examples, links

Bump the version in `SKILL.md` and add a changelog line below in the same commit.

### Changelog

- **2.0.0** (2026-10-30): generic version for any Fastify + Zod + Drizzle
  backend. Rings are defined by role with a default layout; the agent maps them
  to the project's folders from its own docs. The dependency-cruiser config is
  now a template with path placeholders, with optional rules for a pure
  package. Removed the product-specific ring map, pure-engine reference and
  legacy-baseline list. Evals use a sample bookstore backend.
- **1.0.0** (2026-10-12): first version, built from 26 sources researched and
  link-checked on 2026-10-12. Ring map, rules for Fastify/Zod, Drizzle, the DI
  container and SDK adapters, the review checklist, and dependency-cruiser
  rules with a baseline.

## Sources

These are all the links the skill is built from. Each number matches the `#N`
cited in `SKILL.md` and `references/`, and the key points of each source are in
[references/sources.md](references/sources.md). Every link returned HTTP 200 when
checked on 2026-10-12.

### A. Onion and sibling architectures
1. [The Onion Architecture: part 1](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/): Jeffrey Palermo, 2008
2. [The Hexagonal (Ports & Adapters) Architecture](https://alistair.cockburn.us/hexagonal-architecture/): Alistair Cockburn, 2005
3. [The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html): Robert C. Martin, 2012
4. [Layers, Onions, Ports, Adapters: it's all the same](https://blog.ploeh.dk/2013/12/03/layers-onions-ports-adapters-its-all-the-same/): Mark Seemann, 2013
5. [DDD, Hexagonal, Onion, Clean, CQRS, … How I put it all together](https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/): Herberto Graça, 2017 (updated 2020)
6. [Common web application architectures](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures): Microsoft Learn
7. [Presentation Domain Data Layering](https://martinfowler.com/bliki/PresentationDomainDataLayering.html): Martin Fowler, 2015

### B. Designing the core and its boundaries
8. [What's a sandwich?](https://blog.ploeh.dk/2023/10/09/whats-a-sandwich/): Mark Seemann, 2023 (impureim sandwich / functional core, imperative shell)
9. [Boundaries](https://www.destroyallsoftware.com/talks/boundaries): Gary Bernhardt, SCNA 2012
10. [Repository](https://martinfowler.com/eaaCatalog/repository.html): Martin Fowler, Patterns of Enterprise Application Architecture
11. [Anemic Domain Model](https://martinfowler.com/bliki/AnemicDomainModel.html): Martin Fowler, 2003
12. [Service Locator is an Anti-Pattern](https://blog.ploeh.dk/2010/02/03/ServiceLocatorisanAnti-Pattern/): Mark Seemann, 2010
13. [Parse, don't validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/): Alexis King, 2019

### C. TypeScript / Node.js
14. [Domain-Driven Hexagon](https://github.com/Sairyss/domain-driven-hexagon): Sairyss
15. [Organizing App Logic with the Clean Architecture](https://khalilstemmler.com/articles/software-design-architecture/organizing-app-logic/): Khalil Stemmler, 2019
16. [Implementing the Onion Architecture in Node.js with TypeScript and InversifyJS](https://dev.to/remojansen/implementing-the-onion-architecture-in-nodejs-with-typescript-and-inversifyjs-10ad): Remo H. Jansen, 2018

### D. Our tools
17. [Fastify: Encapsulation](https://fastify.dev/docs/latest/Reference/Encapsulation/): Fastify docs
18. [Fastify: Decorators](https://fastify.dev/docs/latest/Reference/Decorators/): Fastify docs
19. [Fastify: Testing guide](https://fastify.dev/docs/latest/Guides/Testing/): Fastify docs
20. [fastify-type-provider-zod](https://github.com/turkerdev/fastify-type-provider-zod): turkerdev
21. [@fastify/awilix](https://github.com/fastify/fastify-awilix): Fastify org (considered, rejected)
22. [Drizzle: Transactions](https://orm.drizzle.team/docs/transactions): Drizzle docs
23. [Drizzle: Type API (`$inferSelect` / `$inferInsert`)](https://orm.drizzle.team/docs/goodies): Drizzle docs

### E. Enforcement
24. [dependency-cruiser: Rules reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md): Sander Verweij
25. [How we enforce architecture boundaries at scale on our app](https://technology.lastminute.com/how-we-enforce-architecture-boundaries-at-scale-on-our-app/): lastminute.com engineering, 2026
26. [dependency-cruiser: Command line interface](https://github.com/sverweij/dependency-cruiser/blob/main/doc/cli.md): Sander Verweij (`--ignore-known`, baseline, `err-long`)
