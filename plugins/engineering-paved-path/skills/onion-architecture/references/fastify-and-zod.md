# Fastify + Zod — the driving side (ring 3b)

A route file is a *driving adapter*: it translates HTTP into a call on the
application ring and translates the result back (#2, #5). Everything it knows
about HTTP stays here; nothing it knows about storage is allowed here.

Paths below use the default layout from SKILL.md §2. Map them to the project's
own folders first.

## The shape of a handler

```ts
// GOOD — modules/orders/routes.ts (simplified)
export default async function ordersRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const service = new OrdersService(app.container.ordersRepo, () => app.container.payments());

  app.post('/orders', { schema: { body: CreateOrderBody } }, async (req) => {
    const { tenantId, userId } = await getContext(app.container, req);
    return service.create(tenantId, req.body, userId);       // one call, DTO out
  });
}
```

```ts
// BAD — SQL, a third-party sync and rollup logic inline in the handler
app.get('/customers/:id/orders', { schema: { params: IdParams } }, async (req) => {
  const [customer] = await container.db.select().from(t.customers).where(/* … */);
  const crm = await container.crm();
  for (const o of await crm.listOrders(/* … */)) {
    await container.db.insert(t.orders).values(/* … */);
  }
  // … 150 more lines of queries and grouping
});
```

Why the first is better: the use case ("list orders, syncing from the CRM when
possible") can be tested with a fake CRM port and no HTTP; the handler is
obviously correct by reading it; another driving adapter (a job, a CLI) can
reuse the service.

**Moving logic out of a fat handler** (when you're already changing it):
1. Create or extend `service.ts` with a method named after the use case.
2. Move each query into a `repository/<entity>.repo.ts` function taking `db`.
3. Move pure decisions (grouping, "latest", null-vs-zero) into `helpers.ts` /
   `status.ts` with unit tests.
4. Leave the handler as context → service → return.
5. Run the dependency check; if the project keeps a baseline, regenerate it and
   confirm the diff only removes entries.

## Rules

- **Schema-first validation.** Put Zod schemas on `schema.params`, `body`,
  `querystring` (and `response` where the DTO is stable). With
  `validatorCompiler`/`serializerCompiler` registered in `app.ts`, the handler
  receives typed, already-parsed data — "parse, don't validate" at the edge
  (#13, #20). Don't call `Schema.parse(req.body)` in the handler and don't
  re-validate in the service.
- **Wire contracts live in the shared kernel.** Request-only schemas that no
  other package needs may live at the top of the route file. Keep the wire
  field casing the project uses (often `snake_case`) and make any mapping to
  `camelCase` explicit at the boundary; never rename a wire field silently to
  match TS.
- **Contracts are data.** A Zod schema in the shared kernel must not import
  anything but `zod` (rule `shared-kernel-is-pure`). Behaviour over contracts
  goes in helpers.
- **Copies of contracts change together.** If the frontend keeps its own copy
  of the contracts (vendored or generated), update both in the same commit.
- **Errors.** Services throw `AppError` subclasses (`NotFoundError`,
  `ValidationError`, `ExternalServiceError`, `ConfigError`) from
  `platform/errors.ts`. The one `setErrorHandler` in `app.ts` turns them, Zod
  validation errors and serialization failures into one error envelope. A
  service never calls `reply.status()` and never imports Fastify (rule
  `application-knows-no-http`).
- **Request context.** Tenancy and identity come from a helper such as
  `getContext(container, req)` (`modules/_shared/context.ts`) and are passed to
  the service as plain strings — the service never sees `FastifyRequest`.
- **Encapsulation.** Each module is a plugin registered in `modules/index.ts`;
  hooks and decorators it adds stay inside its context. Wrap with
  `fastify-plugin` only something every module needs (auth, a shared hook)
  (#17). The only instance decorator is the container (#18).
- **Streaming.** Progress streaming (SSE, websockets) goes through an event bus
  in `platform/`. The use case publishes events; the route subscribes and writes
  to the stream. The use case doesn't know a stream exists.
- **Testing.** `buildApp({ config, overrides })` + `app.inject()` — no port,
  plugins booted, adapters faked through the container overrides (#19).

## Not statically enforced — catch in review

- `container.db` used in a route or service without importing Drizzle (e.g.
  only through `container.db.query.*`).
- A handler with branching business logic but no forbidden import.
- A service method that takes `FastifyRequest`-shaped objects typed as `any`.
