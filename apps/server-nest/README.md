# `@family-inventory/server-nest`

Production-shaped NestJS API for Family Inventory. Coexists with the
zero-dependency Node scaffold in `apps/server/` — once feature parity is
reached the scaffold can be retired.

## Stack

- NestJS 10 (Express adapter, global validation pipe)
- Prisma 5 + MySQL 8.0
- Redis 7 (Docker only, not wired into code yet)
- Shares the API contract via `@family-inventory/shared-types`

## Endpoints currently implemented

| Method | Path                                | Notes                              |
| ------ | ----------------------------------- | ---------------------------------- |
| GET    | `/health`                           | Liveness                           |
| GET    | `/api/family`                       | Family overview (members + addr)   |
| GET    | `/api/products`                     | Filterable list                    |
| POST   | `/api/products`                     | Create product + stock-in log      |
| GET    | `/api/products/:id`                 | Detail                             |
| POST   | `/api/products/:id/update`          | Update fields & quantity           |
| POST   | `/api/products/:id/consume`         | Decrement stock + log              |
| POST   | `/api/products/:id/archive`         | Soft delete + log                  |
| GET    | `/api/pets`                         | List pets                          |
| POST   | `/api/pets`                         | Create pet                         |
| POST   | `/api/pets/:id/update`              | Update pet profile                 |
| POST   | `/api/pets/:id/album`               | Append single album photo          |
| POST   | `/api/pets/:id/album/batch`         | Append multiple album photos       |
| POST   | `/api/pets/:id/album/remove`        | Remove an album photo              |
| GET    | `/api/stock-logs`                   | List all stock logs                |
| GET    | `/api/products/:id/logs`            | List logs for a product            |

Endpoints exposed by the legacy scaffold that aren't yet ported:
`dashboard`, `statistics`, `reminders`, `restock-plan`, `notification-settings`,
`family/*` mutations, `profile/*`. They remain available via the existing
scaffold (`pnpm dev:server`) while the Nest implementation grows.

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
