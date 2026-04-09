# llm-chat-platform

全栈 AI 流式聊天平台 | React + NestJS + TypeScript + LLM API（前后端分离）

简洁实用的企业级 AI 聊天应用，前后端分离架构，隐藏 API Key 保障安全，支持流式输出，适合快速部署。

## 📋 项目简介

基于 React + NestJS 开发的全栈 AI 聊天项目，采用前后端分离模式，实现 AI 流式聊天、多轮对话，代码规范，可直接部署。

### 核心亮点

- ✅ 前后端分离：前端（React）、后端（NestJS）独立运行
- ✅ 流式输出：AI 回答逐字显示，提升交互体验
- ✅ 安全可靠：后端托管 API Key，避免前端泄露
- ✅ 全 TS 开发：类型安全，易维护、易扩展

## 🔧 核心技术栈

- 前端：React 19 + TypeScript + Vite
- 后端：NestJS + `@nestjs/axios`
- 第三方：通义千问 API（可切换其他大模型）

## 📁 项目结构

```text
llm-chat-platform/
├── frontend/   # React 前端（聊天界面）
├── backend/    # NestJS 后端（API 转发、安全控制）
├── README.md   # 项目说明
└── .gitignore  # Git 忽略文件
```

## 🚀 快速启动（必看）

**前提：** 安装 Node.js（v20+）

### 1) 克隆项目

```bash
git clone https://github.com/sanjings/llm-chat-platform.git
cd llm-chat-platform
```

### 2) 启动后端

```bash
cd backend
pnpm install

# 复制 .env.example 为 .env，填入 DeepSeek API Key
cp .env.example .env
pnpm run start:dev # 端口 3000
```

### 3) 启动前端

```bash
# 新开终端
cd frontend
pnpm install
pnpm run dev # 端口 5173
```

### 4) 访问

打开 `http://localhost:5173`，输入消息即可使用。

## 🔑 核心功能

- 流式聊天：AI 回答逐字输出，模拟真实对话
- 多轮对话：支持连续上下文交流
- 安全防护：API Key 后端隐藏，避免泄露
- 灵活扩展：可切换 OpenAI 等大模型

## 📦 简单部署

- 前端：`pnpm run build` 打包后，部署至 Netlify/Vercel/GitHub Pages
- 后端：打包后部署至云服务器（如阿里云、腾讯云），配置环境变量即可
