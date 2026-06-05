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

### 共享包 (`packages/shared-types`)

- 前后端共享的 TypeScript 类型定义

## 目录结构

```text
family-inventory/
├── apps/
│   ├── client/          # uni-app 客户端（H5 / 微信小程序 / App）
│   └── server/          # 后端 API scaffold
├── packages/
│   └── shared-types/    # 前后端共享类型
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
```

## 当前进度

- [x] Monorepo 脚手架
- [x] 客户端骨架 + wot-design-uni
- [x] 基于 `stitch_` UI 图恢复首页、库存、添加、统计、我的页面
- [x] 后端 API scaffold
- [x] 离线存储 adapter
- [ ] NestJS / Prisma 后端正式化
- [ ] 数据库设计与迁移
