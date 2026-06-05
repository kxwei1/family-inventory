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

| Method | Path                                       | Notes                                          |
| ------ | ------------------------------------------ | ---------------------------------------------- |
| GET    | `/health`                                  | Liveness                                       |
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
