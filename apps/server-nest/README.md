# `@family-inventory/server-nest`

Production-shaped NestJS API for Family Inventory. Coexists with the
zero-dependency Node scaffold in `apps/server/` — once feature parity is
reached the scaffold can be retired.

## Stack

- NestJS 10 (Express adapter, global validation pipe)
- Prisma 5 + MySQL 8.0
- Redis 7 (Docker only, not wired into code yet)
- Shares the API contract via `@family-inventory/shared-types`

## Production cross-cutting

- **Global validation pipe** strips unknown fields and coerces query types
  before they reach a controller.
- **Global `HttpExceptionFilter`** turns every thrown error into
  `{ error, statusCode, path, details? }` with a consistent shape; 5xx errors
  log a stack trace via Nest `Logger`.
- **Global `LoggingInterceptor`** logs `METHOD url -> status (xx.xms)` at
  `log` / `warn` / `error` depending on the response.
- **Global `JwtAuthGuard`** verifies `Authorization: Bearer <token>` on every
  request and attaches the user (`memberId / familyId / role / name`) to
  `req.user`. `FamilyContextService` then scopes every subsequent DB query
  to `req.user.familyId`. Opt out with `@Public()` (see `AuthController.login`
  and `HealthController`).
  - `AUTH_REQUIRED=false` (default) keeps the dev shortcut: requests without a
    token go through and the context falls back to the first family — so the
    client and smoke scripts keep working without logging in.
  - `AUTH_REQUIRED=true` enforces 401 on any unauthenticated request.
- **Redis cache** for aggregation endpoints. `CacheService` wraps
  `GET /api/dashboard` (TTL 30s) and `GET /api/statistics/summary` (TTL 60s)
  per family. Mutations on products / restock / reminders call
  `cache.invalidateFamilyAggregates(familyId)` so the next read recomputes.
  When `REDIS_URL` is unset, the cache falls back to an in-memory backend so
  dev still works without docker.
- **Reminder scheduler** (`@nestjs/schedule`) walks every active family on a
  cron schedule (default every 30m) and upserts low-stock + expiring-batch
  reminders by `(familyId, externalKey)`. Mutations call back into
  `cache.invalidateFamilyAggregates`.
- **Webhook fan-out** via `NotificationDispatcher`. After every scheduler
  scan that touched reminders, the dispatcher posts the refreshed reminder
  set to the family's webhook URL (`NotificationSettings.webhookUrl`, with
  `NOTIFICATION_WEBHOOK_URL` env as a tenant-wide fallback).
  - When `REDIS_URL` is set and `QUEUE_ENABLED != "false"` the dispatcher
    enqueues a BullMQ job (queue: `family-inventory:reminders`); a
    `ReminderWebhookWorker` consumes it with exponential backoff (5 attempts).
  - Otherwise it falls back to inline fire-and-forget POSTs so dev / test
    works without Redis.
- **Swagger UI** mounted at `GET /api-docs` (disable with
  `SWAGGER_ENABLED=false` in `.env.local`).

## Auth flow

```
POST /api/auth/login { memberId, familyId? }
  -> { token, expiresIn, user: { memberId, familyId, role, name } }

GET  /api/auth/me        (requires Bearer token)
  -> { user }
```

Send the token on every subsequent call as `Authorization: Bearer <token>`.
On the client, call `setAuthToken(token)` after login — the apiClient picks
it up automatically and clears it on 401/403.

## Standalone worker

In production you'll usually want to run the BullMQ consumer as a separate
process so a webhook outage or slow downstream doesn't slow HTTP traffic.

```bash
# build once
pnpm --filter @family-inventory/server-nest build

# API process — turn off the in-process worker
WORKER_INPROCESS=false node apps/server-nest/dist/src/main.js

# Worker process — boots WorkerModule (Prisma + Notifications only)
node apps/server-nest/dist/src/worker.js
```

In development:

```bash
pnpm dev:server-nest    # API
pnpm dev:worker         # worker, with watch
```

`WORKER_INPROCESS=true` (default) keeps the worker inside the API process so
single-binary dev/QA setups still work without any extra orchestration.

## Endpoints currently implemented

| Method | Path                                       | Notes                                          |
| ------ | ------------------------------------------ | ---------------------------------------------- |
| GET    | `/health`                                  | Liveness (`@Public()`)                         |
| POST   | `/api/auth/login`                          | Issue JWT for a member (`@Public()`)           |
| GET    | `/api/auth/me`                             | Return the user attached to the request        |
| GET    | `/api/dashboard`                           | Home greeting + alert counts + categories      |
| GET    | `/api/family`                              | Family overview (members + address)            |
| POST   | `/api/family/rename`                       | Rename family                                  |
| POST   | `/api/family/address`                      | Upsert family address                          |
| POST   | `/api/family/members/role`                 | Change member role (guards last admin)         |
| POST   | `/api/family/members/remove`               | Remove member (guards last admin)              |
| POST   | `/api/family/dissolve`                     | Remove non-owner members, promote owner        |
| GET    | `/api/products`                            | Filterable list (q / category / status)        |
| POST   | `/api/products`                            | Create product + stock-in log                  |
| POST   | `/api/products/stock-in`                   | Upsert + append stock-in log                   |
| GET    | `/api/products/:id`                        | Detail                                         |
| POST   | `/api/products/:id/update`                 | Update fields & quantity                       |
| POST   | `/api/products/:id/consume`                | Decrement stock + log                          |
| POST   | `/api/products/:id/archive`                | Soft delete + log                              |
| GET    | `/api/products/:id/logs`                   | Logs for a product                             |
| GET    | `/api/pets`                                | List pets                                      |
| POST   | `/api/pets`                                | Create pet                                     |
| POST   | `/api/pets/:id/update`                     | Update pet profile                             |
| POST   | `/api/pets/:id/album`                      | Append single album photo                      |
| POST   | `/api/pets/:id/album/batch`                | Append multiple album photos (dedup)           |
| POST   | `/api/pets/:id/album/remove`               | Remove an album photo                          |
| GET    | `/api/stock-logs`                          | List all stock logs                            |
| GET    | `/api/profile`                             | Current user profile + stats                   |
| POST   | `/api/profile/update`                      | Update name / avatar                           |
| GET    | `/api/notification-settings`               | Current toggles                                |
| POST   | `/api/notification-settings`               | Update stock / expiry toggles                  |
| GET    | `/api/reminders`                           | Active reminders + per-category summary        |
| POST   | `/api/reminders/dismiss`                   | Dismiss one reminder                           |
| POST   | `/api/reminders/read-all`                  | Dismiss all active reminders                   |
| GET    | `/api/restock-plan`                        | Grouped restock plan + recommendations         |
| POST   | `/api/restock-plan/complete`               | Mark items done + restock stock (+ log)        |
| POST   | `/api/restock-plan/remove`                 | Remove restock entry                           |
| POST   | `/api/restock-plan/recommendations/add`    | Add recommendation to plan                     |
| POST   | `/api/restock-plan/products/add`           | Add existing product to plan                   |
| GET    | `/api/statistics/summary?range=…`          | Spend stats (week / month / year)              |

Surface parity with the legacy scaffold has been reached. The scaffold still
ships in `apps/server/` for offline development without MySQL — switch the
client between them with `VITE_API_BASE_URL` (default `http://localhost:4000`
for the scaffold; set to `http://localhost:4001` for NestJS).

## Local setup

```bash
# 1. Boot MySQL + Redis
docker compose -f apps/server-nest/docker-compose.yml up -d

# 2. Install + generate the Prisma client (run from repo root)
pnpm install
pnpm --filter @family-inventory/server-nest prisma:generate

# 3. Run the migrations and seed the demo family
pnpm --filter @family-inventory/server-nest prisma:migrate
pnpm --filter @family-inventory/server-nest prisma:seed

# 4. Boot the API (defaults to PORT=4001 to avoid clashing with the scaffold)
pnpm --filter @family-inventory/server-nest start:dev
```

Copy `.env.example` to `.env.local` and tweak the credentials if you don't use
the bundled compose file.

## Why two servers right now?

The legacy zero-dependency scaffold (`apps/server/`) hosts every endpoint the
client uses, including the ones not yet ported (dashboard, statistics, etc.).
The NestJS app is the production target; once it reaches parity it will
replace the scaffold.
