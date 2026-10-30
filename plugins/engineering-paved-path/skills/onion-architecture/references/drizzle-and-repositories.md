# Drizzle + Postgres — repositories (ring 3a)

The database is a detail at the edge of the onion (#1). In the default layout
the edge is a module's `repository.ts` facade class plus the query functions
under `repository/*.repo.ts`.

## Shape

```ts
// repository/order.repo.ts — query functions, executor first
export async function openOrdersForCustomer(db: Db, tenantId: string, customerId: string) {
  const rows = await db.select({ … }).from(t.orders).leftJoin(…).where(…);
  return rows.map(/* to a plain shape */);
}

// repository.ts — the facade the service sees (collection-like, domain names)
export class OrdersRepository {
  constructor(private db: Db) {}
  openOrdersForCustomer(tenantId: string, customerId: string) {
    return orderRepo.openOrdersForCustomer(this.db, tenantId, customerId);
  }
}
```

A small module may keep a single `repository.ts`; split into
`repository/<entity>.repo.ts` files once it covers several tables.

## Rules

- **Imports.** `drizzle-orm`, the Postgres driver and `db/schema*` are
  value-imported only by repository files and `src/db/**` (rule
  `db-only-in-repositories`). Other rings may
  `import type { OrderRow } from '../../db/rows.js'` — that file exists so row
  shapes can be named without importing the data layer.
- **Domain-named methods.** `listByIds`, `latestOrderPerCustomer`,
  `completePayment` — a collection-like interface (#10). No generic
  `run(query)` passthrough, no exposing the Drizzle builder to the service.
- **Return rows or plain shapes, map in helpers.** The repository returns
  `OrderRow` / plain objects; `toOrderDto(row)` in `helpers.ts` produces the
  wire DTO. Keep `$inferSelect`-derived types out of the shared kernel (#3, #23).
- **Tenant scoping is the repository's job.** In a multi-tenant app every read
  and write a user can reach filters by the tenant id; the service passes it,
  the repository enforces it.
- **What may stay in SQL.** Filtering, joins, ordering, GROUP BY/SUM — the
  things the database does better. **What may not:** the decision about what the
  numbers mean (null vs zero, "latest per customer", which rows count). Those go
  in pure helpers so all their cases are unit-testable.
- **Projection drift.** A hand-written projection (destructure → pass
  field-by-field) silently drops new fields. When adding a column, diff the
  domain shape against every insert and update call.
- **No FK assumptions in the domain.** If a reference column is nullable or has
  no foreign key, repositories must not inner-join the rows away.

## Transactions — the unit of work belongs to the use case

The service decides what must be atomic; the repository provides the means.
Because query functions take the executor first, a transaction composes:

```ts
// db/client.ts — add once when first needed
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export type Executor = Db | Tx;

// repository/*.repo.ts — widen the first parameter from Db to Executor
export async function saveLines(db: Executor, orderId: string, rows: NewOrderLine[]) { … }

// repository.ts
export class OrdersRepository {
  constructor(private db: Executor) {}
  // On a Tx this opens a savepoint, so nesting is safe.
  inTransaction<T>(fn: (repo: OrdersRepository) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => fn(new OrdersRepository(tx)));
  }
}

// service.ts
await this.repo.inTransaction(async (repo) => {
  await repo.saveOrder(…);
  await repo.saveLines(…);
});
```

- `db.transaction(async (tx) => …)` commits when the callback resolves and rolls
  back when it throws; `tx.rollback()` aborts explicitly; nested
  `tx.transaction` uses savepoints (#22).
- Keep only database work inside the callback. A call to a third-party API or
  an LLM inside a transaction holds a pooled connection for seconds and starves
  the pool — load, call the outside system, then open the transaction to
  persist (the impureim sandwich, #8).

## Migrations and schema

Out of scope here — see `engineering-paved-path:drizzle-orm-patterns` and
`engineering-paved-path:postgresql-table-design`. The general rule still
applies: applied migrations are immutable; a schema change is a new migration
generated with drizzle-kit (the project's own script for it, if it has one).

## Testing

Test repositories against a real Postgres (a test database or a container),
in a separate integration suite. Don't mock Drizzle, and don't add a repository
interface just to fake it in service tests — fake at the port level (container
overrides) or seed rows directly.
