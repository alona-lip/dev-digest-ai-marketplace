# DI container, ports, adapters — and testing per ring

Paths below use the default layout from SKILL.md §2. Map them to the project's
own folders first.

## Ports live in the core, adapters at the edge

Outbound ports are interfaces in the shared kernel (default
`src/contracts/ports.ts`): for example `PaymentGateway`, `Mailer`,
`LLMProvider`, `GitClient`, `SecretsProvider`. Implementations live in
`src/adapters/<kind>/<impl>.ts` (`StripePaymentGateway`, `SmtpMailer`,
`OpenAIProvider`, …).

Design a port from the core's side: what does the use case need? "charge this
order", "complete with a structured schema" — not "a Stripe instance" (#5).
Several adapters can fit one port (real, fake, in-memory) (#2).

## The composition root

`src/platform/container.ts` is the only place where concrete classes meet the
ports (#6). It:
- holds process-wide things (`config`, `db`, job queue, event bus);
- builds adapters **lazily** when they need a secret that may not exist at boot
  (so `container.payments()` is `async`);
- accepts an `overrides` argument so tests inject fakes.

`app.ts` attaches the container with `app.decorate('container', …)`;
`modules/index.ts` registers the module plugins. Those files plus `server.ts`
are the composition root and may import anything.

## Adding an external integration — 4 steps

Example: post a message to a chat channel after an order ships.

1. **Port** in the shared kernel:
   `export interface Notifier { notify(msg: ShipmentNotice): Promise<void> }`
   — `ShipmentNotice` is a plain contract, not a chat-API payload.
2. **Adapter** `src/adapters/notifier/slack.ts` implementing it with the SDK or
   `fetch`; the SDK import is legal only here (rule `sdk-only-in-adapters`).
   Map SDK errors to `ExternalServiceError`.
3. **Wire** in `container.ts` — lazily if it needs a token from the secrets
   provider; secrets never go into the plain config object.
4. **Override** — add `notifier?: Notifier` to the container's overrides type
   and a fake for tests. Skipping this step is the common mistake: the code
   works and every test now calls the real service.

The service then depends on `Notifier`, never on `SlackNotifier`.

## How services get their dependencies

A common starting point is services that take the whole container:

```ts
// Service Locator — avoid in new code
export class CatalogService {
  private repo: CatalogRepository;
  constructor(private container: Container) {
    this.repo = new CatalogRepository(container.db);
  }
  async describe(id: string) {
    const llm = await this.container.llm();   // hidden dependency
  }
}
```

The dependencies are invisible in the signature and only fail at runtime when a
fake is missing (#12). For **new** services, inject what you use:

```ts
// constructor injection of narrow collaborators
export class ShippingService {
  constructor(
    private readonly repo: OrdersRepository,
    private readonly notifier: () => Promise<Notifier>,  // lazy port, secret resolved on first use
  ) {}
}

// routes.ts (driving adapter) or container.ts builds it
const service = new ShippingService(app.container.ordersRepo, () => app.container.notifier());
```

When you touch an existing locator-style service anyway, move it toward this
shape rather than adding another `this.container.x` call. Don't introduce a DI
framework (`@fastify/awilix`, InversifyJS) when a hand-written container plus
overrides already does the job (#21, #16).

## Adapters stay dumb

- An adapter translates; it doesn't decide. No business rules, no tenant logic,
  no imports from `src/modules/**` (rule `adapters-dont-know-modules`).
  Constants an adapter needs (limits, supported formats) belong to the adapter
  or to the shared kernel, not to a feature module.
- Pure parsers that happen to sit in `src/adapters/` are reached through the
  port, or moved next to their consumer when touched — modules may not import
  `src/adapters/**` (rule `modules-use-ports-not-adapters`).

## Cross-module access

A module never imports another module's internal file (rule
`no-cross-module-internals`). Options, in order of preference:
1. A shared repository exposed by the container (`container.customersRepo`) for
   cross-cutting entities.
2. The other module's `index.ts` facade, injected through the container.
3. Move the shared piece to `modules/_shared/` (presentation helpers) or the
   shared kernel (contracts and pure functions everyone needs).

## Testing per ring

| Ring | How |
|---|---|
| 0–1 pure | plain unit tests, no mocks, no database; a pure package's own test run |
| 2 application | service or route with fake ports via container overrides |
| 3a repositories | real Postgres (test database or container) in an integration suite |
| 3b routes | `buildApp({ overrides })` + `app.inject()` (#19) |

If a rule is hard to test without a database, it is in the wrong ring — pull
it into a pure helper (#9, #4).
