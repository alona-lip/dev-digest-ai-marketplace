/**
 * Onion-architecture rules for a Fastify + Zod + Drizzle backend — TEMPLATE.
 *
 * The rules and the reasoning behind each one live in the onion-architecture
 * skill of the engineering-paved-path plugin (SKILL.md §2–§7 and
 * references/enforcement.md).
 *
 * To adopt it:
 *   1. Copy this file to the backend package as `.dependency-cruiser.cjs`.
 *   2. Edit the PATHS block below so each ring points at the project's folders.
 *      Paths are regexes relative to the directory you run depcruise from.
 *   3. Edit SDKS / DB_DRIVERS / HTTP_FRAMEWORK to list the packages you use.
 *   4. Set PURE_PACKAGE to the pure package's source folder, or leave it null.
 *   5. Add scripts (names are suggestions):
 *        "lint:deps": "depcruise src --config .dependency-cruiser.cjs --ignore-known",
 *        "lint:deps:baseline": "depcruise src --config .dependency-cruiser.cjs --output-type baseline --output-to .dependency-cruiser-known-violations.json"
 *      With a pure package, add its source folder after `src`.
 */

// ---------- PATHS: edit these to match the project ----------

/** Ring 0 — the shared kernel: Zod wire contracts and port interfaces. */
const SHARED_KERNEL = '^src/contracts/';
/** Ring 1 — pure domain logic inside a feature module. */
const DOMAIN_FILES = '^src/modules/[^/]+/(helpers|status|constants)\\.ts$';
/** Feature modules root; a module is the first folder below it. */
const MODULES = '^src/modules/';
/** A module's data layer: `repository.ts` or anything under `repository/`. */
const REPOSITORY = '^src/modules/[^/]+/repository(\\.ts$|/)';
/** Folder shared by modules (presentation helpers). */
const MODULES_SHARED = '^src/modules/_shared/';
/** Request-context helper that may speak Fastify. */
const REQUEST_CONTEXT = '^src/modules/_shared/context\\.ts$';
/** Driven adapters for third-party SDKs and APIs. */
const ADAPTERS = '^src/adapters/';
/** Drizzle client, schema and migrations. */
const DB = '^src/db/';
/** Row types that may be imported as types outside the data layer. */
const DB_ROW_TYPES = '^src/db/rows\\.ts$';
/** Cross-cutting infrastructure. */
const PLATFORM = '^src/platform/';
/** The composition root's container: the only place that constructs adapters. */
const CONTAINER = '^src/platform/container\\.ts$';
/** The shared error taxonomy (AppError & co.). */
const ERRORS = '^src/platform/errors\\.ts$';
/** Optional pure package (ring 0′), e.g. '^\\.\\./<pure-package>/src/'. null = none. */
const PURE_PACKAGE = null;

// ---------- PACKAGES: edit to the libraries the project uses ----------

/** Third-party SDKs that may only be imported by a driven adapter. */
const SDKS = 'node_modules/(openai|@anthropic-ai|stripe|@slack|octokit|@octokit|simple-git|nodemailer)/';
const DB_DRIVERS = 'node_modules/(drizzle-orm|postgres|pg)/';
const HTTP_FRAMEWORK = 'node_modules/(fastify|@fastify|fastify-type-provider-zod|fastify-plugin)/';
/** LLM or other SDKs a pure package may use only inside its adapter folder. */
const PURE_PACKAGE_SDKS = 'node_modules/(openai|@anthropic-ai)/';

const SKILL = 'See the onion-architecture skill (engineering-paved-path)';

const pureRules = PURE_PACKAGE
  ? [
      {
        name: 'pure-package-is-pure',
        severity: 'error',
        comment:
          'The pure package has no DB, HTTP server or third-party API access. Its only side effect is an injected port. ' +
          `${SKILL} §7.`,
        from: { path: PURE_PACKAGE },
        to: {
          path: ['^src/', DB_DRIVERS, HTTP_FRAMEWORK],
          pathNot: [SHARED_KERNEL],
        },
      },
      {
        name: 'pure-package-no-node-io',
        severity: 'error',
        comment: `The pure package must run in CI and tests without touching disk, processes or the network. ${SKILL} §7.`,
        from: { path: PURE_PACKAGE },
        to: {
          dependencyTypes: ['core'],
          path: '^(node:)?(fs|fs/promises|child_process|net|http|https|dgram|cluster|worker_threads)$',
        },
      },
      {
        name: 'pure-package-sdk-only-in-adapter',
        severity: 'error',
        comment: `Only the pure package's adapter folder (e.g. llm/) may import an SDK. ${SKILL} §7.`,
        from: { path: PURE_PACKAGE, pathNot: `${PURE_PACKAGE}llm/` },
        to: { path: PURE_PACKAGE_SDKS },
      },
      {
        name: 'pure-package-via-public-api',
        severity: 'error',
        comment: `The backend imports the pure package by name (its index.ts), never a deep path. ${SKILL} §7.`,
        from: { path: '^src/' },
        to: { path: PURE_PACKAGE, pathNot: `${PURE_PACKAGE}index\\.ts$` },
      },
    ]
  : [];

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ---------- ring 0: shared kernel ----------
    {
      name: 'shared-kernel-is-pure',
      severity: 'error',
      comment:
        'The shared kernel holds the wire contracts and the ports — the centre of the onion. ' +
        `It may depend on zod and on itself, nothing else. ${SKILL} §2.`,
      from: { path: SHARED_KERNEL },
      to: { pathNot: [SHARED_KERNEL, 'node_modules/zod/'] },
    },

    // ---------- ring 1: domain logic ----------
    {
      name: 'domain-is-pure',
      severity: 'error',
      comment:
        'helpers.ts / status.ts / constants.ts are pure functions over contracts. No DB, no HTTP, no SDK, ' +
        'no platform services (the error taxonomy is the one exception). ' +
        'Move the I/O into service.ts and pass plain values in. ' +
        `Type-only imports of row types are allowed for toXDto mappers. ${SKILL} §3.`,
      from: { path: DOMAIN_FILES },
      to: {
        path: [DB, ADAPTERS, PLATFORM, REPOSITORY, DB_DRIVERS, HTTP_FRAMEWORK, SDKS],
        pathNot: [ERRORS],
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'domain-knows-no-infra-types',
      severity: 'error',
      comment:
        'Even as types, domain files may only see row shapes, ' +
        `never Drizzle tables, adapters, HTTP types or the container. ${SKILL} §3.`,
      from: { path: DOMAIN_FILES },
      to: {
        path: [DB, ADAPTERS, PLATFORM, DB_DRIVERS, HTTP_FRAMEWORK, SDKS],
        pathNot: [DB_ROW_TYPES, ERRORS],
        dependencyTypes: ['type-only'],
      },
    },

    // ---------- ring 2: application ----------
    {
      name: 'db-only-in-repositories',
      severity: 'error',
      comment:
        'Drizzle, the Postgres driver and the table objects belong to repository files. ' +
        'Add a repository method and call it from the service. ' +
        `Type-only imports of row types are fine. ${SKILL} §5.`,
      from: { path: MODULES, pathNot: REPOSITORY },
      to: {
        path: [DB, DB_DRIVERS],
        pathNot: [DB_ROW_TYPES],
      },
    },
    {
      name: 'application-knows-no-http',
      severity: 'error',
      comment:
        'Only route files (and the request-context helper) speak Fastify. Services return DTOs and throw AppError; ' +
        `the error handler in app.ts maps them to HTTP. ${SKILL} §4.`,
      from: {
        path: MODULES,
        pathNot: ['routes\\.ts$', `${MODULES}index\\.ts$`, `${MODULES}[^/]+/index\\.ts$`, REQUEST_CONTEXT],
      },
      to: { path: [HTTP_FRAMEWORK, 'routes\\.ts$'] },
    },

    // ---------- ring 3b: driving adapters ----------
    {
      name: 'routes-are-thin',
      severity: 'error',
      comment:
        'routes.ts = parse (zod schema) → call the service → return the DTO. No SQL, no repositories, no adapters. ' +
        `${SKILL} §4.`,
      from: { path: 'routes\\.ts$' },
      to: { path: [DB, ADAPTERS, REPOSITORY, DB_DRIVERS, SDKS] },
    },

    // ---------- ring 3a: driven adapters ----------
    {
      name: 'sdk-only-in-adapters',
      severity: 'error',
      comment:
        'Every third-party SDK sits behind a port from the shared kernel and is implemented in an adapter. ' +
        `Construct it in the container. ${SKILL} §6.`,
      from: {
        pathNot: [ADAPTERS, CONTAINER, ...(PURE_PACKAGE ? [`${PURE_PACKAGE}llm/`] : [])],
      },
      to: { path: SDKS },
    },
    {
      name: 'modules-use-ports-not-adapters',
      severity: 'error',
      comment:
        'Modules reach an adapter through the container (typed by its port), never by importing an adapter file. ' +
        `${SKILL} §6.`,
      from: { path: MODULES },
      to: { path: ADAPTERS },
    },
    {
      name: 'adapters-dont-know-modules',
      severity: 'error',
      comment: `An adapter implements a port; it must not call feature modules. ${SKILL} §6.`,
      from: { path: ADAPTERS },
      to: { path: MODULES },
    },

    // ---------- module boundaries ----------
    {
      name: 'no-cross-module-internals',
      severity: 'error',
      comment:
        "A module may not import another module's files. Go through the container, the module's index.ts facade, " +
        `or move the shared piece to the shared modules folder. ${SKILL} §3.`,
      from: { path: `${MODULES}([^/]+)/` },
      to: {
        path: MODULES,
        pathNot: [`${MODULES}$1/`, MODULES_SHARED, `${MODULES}[^/]+/index\\.ts$`],
      },
    },
    {
      name: 'only-composition-root-wires-modules',
      severity: 'error',
      comment:
        'platform/ is cross-cutting infrastructure. Only the container (the composition root) may know ' +
        `concrete module classes. ${SKILL} §2.`,
      from: { path: PLATFORM, pathNot: CONTAINER },
      to: { path: MODULES },
    },

    // ---------- ring 0′: optional pure package ----------
    ...pureRules,

    // ---------- hygiene ----------
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'Circular imports usually mean two rings were merged. Type-only cycles are ignored (they vanish at runtime). ' +
        `${SKILL} §1.`,
      from: {},
      to: { circular: true, viaOnly: { dependencyTypesNot: ['type-only'] } },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      comment: 'The import does not resolve — a typo, a missing install, or a path alias the config does not know.',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    // Keep `import type` edges: a type-only import of a Drizzle table is still a leak.
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
      extensions: ['.ts', '.js', '.json'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
