# llm-chat-platform

### 📋 项目简介

一套可落地的**全栈 AI 对话**示例：从账号与会话管理，到 SSE 流式回复，前后端职责清晰，适合快速部署，或直接 fork 后按自己的品牌与模型接入改一改上线。

基于 React + NestJS 开发，采用前后端分离模式，实现登录、会话管理、SSE 流式回复、MarkDown渲染、历史记录、Key 不暴露在前端。

> 说明：功能以实用为主，不追求大而全；接口与数据模型会随迭代调整，部署前请阅读下方环境与迁移步骤。

### 🔧 核心技术栈

- 前端（用户端 portal）：React 19、TypeScript、Vite、Ant Design、Zustand
- 后端：NestJS、Prisma（MySQL）、Redis（ioredis，会话与 JWT 校验等）、Swagger、JWT 登录
- 对话：SSE 流式转发；支持通义 DashScope 或 OpenAI 兼容接口（如 DeepSeek），见 `apps/backend/.env.example` 中 `LLM_PROVIDER`

### 🔑 核心功能

- 用户注册 / 登录
- 会话列表、重命名、删除；历史消息加载
- 流式回复、停止生成；
- 支持多模型切换选择；
- 前端直接拉取接口文档和类型声明
- 前后端分离，开发环境通过 Vite 代理访问 API

### 📁 项目结构（pnpm workspace + Turborepo）

```text
llm-chat-platform/
├── apps/
│   ├── frontend/
│   │   └── portal/     # 用户端 React（包名 @llm-chat-platform/portal）
│   └── backend/        # NestJS + Prisma（@llm-chat-platform/backend）
├── package.json        # 根脚本与共享工程化依赖
└── README.md
```

### 本地运行

环境要求：Node.js 20+、pnpm、本机 MySQL 8（或兼容的 MariaDB）、**Redis**（认证与会话状态，默认 `127.0.0.1:6379`）。

在**仓库根目录**安装依赖：

```bash
pnpm install
```

#### 1. 数据库

创建空库后，在 `apps/backend` 配置连接串（可复制 `apps/backend/.env.example` 为 `apps/backend/.env`），执行迁移：

```bash
pnpm --filter @llm-chat-platform/backend run migrate:dev
# 首次本地建表；生产环境用 migrate:deploy
```

#### 2. 后端

在 `apps/backend/.env` 中至少配置：`DATABASE_URL`、`REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`（与本地 Redis 一致）、`JWT_SECRET`、`LLM_PROVIDER` 与对应 `LLM_API_KEY`（或 DashScope 场景下的兼容变量，见示例文件注释）。

```bash
pnpm backend:dev
# 默认 http://localhost:3000
```

#### 3. 前端（portal）

```bash
pnpm --filter @llm-chat-platform/portal run ytt
pnpm portal:dev
# 默认 http://localhost:5173 ，API 代理到后端 3000
```

浏览器打开前端地址，注册账号后即可使用。

### 构建与部署

- 前端：`pnpm portal:build`，静态资源部署到任意静态托管；生产环境需将接口域名指向后端（或配置同源反向代理）。
- 后端：`pnpm backend:build && pnpm --filter @llm-chat-platform/backend run start:prod`，服务器上配置与本地相同的 `.env`，并确保数据库已执行迁移、**Redis 可达**。

部署时务必更换强随机 `JWT_SECRET`，并妥善保管大模型 API Key。
