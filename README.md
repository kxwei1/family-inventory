# Family Inventory (家庭宠物库存)

一款家庭宠物用品库存管理小程序，支持微信小程序 / H5 / App 多端。

## 技术栈

### 前端 (`apps/client`)

- uni-app + Vue 3 + TypeScript + Vite
- wot-design-uni UI 组件库
- Pinia 状态管理
- alova 请求与缓存
- Dexie.js H5 IndexedDB 离线存储

### 后端 (`apps/server`)

- 当前：零依赖 Node.js API scaffold，提供库存、个人中心、统计概览与家庭协作接口，并使用本地 JSON 文件持久化运行时数据
- 规划：NestJS + TypeScript、Prisma ORM、MySQL 8.0、Redis

### 正式后端骨架 (`apps/server-nest`)

- NestJS 10 + Prisma 5，模块化拆分（`family` / `products` / `pets` / `stock-logs`）
- 已实现 Prisma schema、Family/Products/Pets/StockLogs 模块、demo 数据 seed、docker-compose（MySQL 8 + Redis 7）
- 端口默认 `4001`，与旧 scaffold 并存，详见 `apps/server-nest/README.md`

### 共享包 (`packages/shared-types`)

- 前后端共享的 TypeScript 类型定义

## 目录结构

```text
family-inventory/
├── apps/
│   ├── client/          # uni-app 客户端（H5 / 微信小程序 / App）
│   ├── server/          # 零依赖 Node API scaffold（含 JSON 持久化）
│   └── server-nest/     # NestJS + Prisma + MySQL 正式后端
├── packages/
│   └── shared-types/    # 前后端共享类型
├── stitch_/             # 12 个 UI 还原参考截图
├── pnpm-workspace.yaml
└── package.json
```

## 开发

```bash
# 安装依赖
pnpm install

# 启动 H5 开发服务
pnpm dev:h5

# 构建 H5
pnpm build:h5

# 启动后端 API
pnpm dev:server

# 运行后端 API 冒烟测试
pnpm smoke:api

# 运行 NestJS 单元测试
pnpm test

# 运行 NestJS e2e 测试（supertest，不依赖真实 MySQL）
pnpm test:e2e

# NestJS 正式后端（需先准备 MySQL + Redis）
docker compose -f apps/server-nest/docker-compose.yml up -d
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev:server-nest
```

## 当前进度

- [x] Monorepo 脚手架
- [x] 客户端骨架 + wot-design-uni
- [x] 基于 `stitch_` UI 图恢复首页、库存、添加、统计、我的页面
- [x] 后端 API scaffold（零依赖）
- [x] 离线存储 adapter
- [x] Pinia stores 接入离线持久化
- [x] NestJS / Prisma schema + 全部域模块（family / products / pets / stock-logs / dashboard / reminders / restock / statistics / profile / notification-settings）
- [x] NestJS 端点与 scaffold 对齐（共 30+ 路由，含 mutations / consume / stock-in / dismiss / read-all 等）
- [x] NestJS 生产化（全局 ExceptionFilter + 请求日志 + Swagger /api-docs）
- [x] NestJS Jest 单测（46/46 绿，覆盖 products / pets / family / auth / guard / cache / scheduler）
- [x] NestJS e2e 测试（supertest，6/6 绿，覆盖 register → login → me → 多家庭隔离 → 缓存失效 → 错误格式）
- [x] 客户端 TabBar 实时提醒红点 + 全局 API 错误处理
- [x] NestJS JWT 鉴权 + 多家庭隔离（`POST /api/auth/login` + `JwtAuthGuard` 全局守卫 + 请求级 `FamilyContextService`，`AUTH_REQUIRED` 开关控制是否强制）
- [x] 凭证存储（bcryptjs hash + Credential 表）+ 注册（`/api/auth/register`）+ 邀请码（`/api/auth/invite` + `/api/auth/invite/redeem`）
- [x] Redis 缓存层（`CacheService` 包装 dashboard / statistics，写路径自动失效；REDIS_URL 缺失时回退到内存缓存）
- [x] 后台调度（`@nestjs/schedule` 定时扫描，自动生成低库存 / 临期 / 已过期提醒；按 externalKey upsert 去重）
- [x] BullMQ 队列 + Webhook 推送（扫描结束后异步 fan-out 到家庭配置的 webhookUrl；REDIS 缺失时回退到内联 fire-and-forget）
- [ ] 后台 worker 拆出独立进程（`node dist/main.js --worker`）
