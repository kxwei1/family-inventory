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
- [x] NestJS / Prisma schema + 核心模块（family / products / pets / stock-logs）
- [ ] NestJS 实现完整端点对齐 scaffold（dashboard / statistics / reminders / restock / family mutations / profile）
- [ ] Redis 缓存 / 队列接入
- [ ] 鉴权 & 多家庭隔离
