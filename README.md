# 职业测评表单系统

> 基于 RIASEC + IPIP 模型的职业规划测评系统，支持一键生成学生测评链接、二维码和管理后台报告查看。

## 技术栈

- **前端**：React + TypeScript + Vite + Tailwind CSS
- **路由**：react-router-dom v6
- **数据库/后端**：Supabase（PostgreSQL + Edge Functions）
- **部署**：Cloudflare Pages
- **认证**：Supabase Auth
- **二维码**：qrcode

## 系统角色

- **学生**：通过唯一 token 链接访问测评页，完成作答并提交（无账号）
- **内部管理员**：登录后台，创建任务，查看报告

## 主要功能

- 唯一 token 链接 / 二维码生成（不可猜测）
- Token 过期时间可设置
- Token 只能提交一次（防重复）
- 服务端重新计算分数（防前端篡改）
- 完整 RIASEC + IPIP 报告
- 100+ 岗位推荐（含推荐理由、薪酬、行业）
- 二维码分享

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

然后编辑 `.env.local`，填入 Supabase 项目地址和 Anon Key。

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173/

### 4. 创建 Supabase 项目

1. 访问 https://supabase.com 创建新项目
2. 在 SQL Editor 中执行 `supabase/SETUP.sql`（见 SUPABASE_SETUP.md）
3. 在 Edge Functions 中部署三个函数

## 目录结构

```
├── src/
│   ├── main.tsx                  # 入口，路由配置
│   ├── App.tsx                   # 根组件（路由表）
│   ├── lib/
│   │   ├── supabase.ts           # Supabase 客户端
│   │   ├── types.ts              # TypeScript 类型定义
│   │   └── utils.ts              # 工具函数
│   ├── assessment/                # 测评核心模块（业务逻辑）
│   │   ├── questions.ts           # 题库（44 题）
│   │   ├── scoring.ts             # 评分逻辑
│   │   ├── roles.ts              # 岗位库（40+）
│   │   ├── report.ts             # 报告生成
│   │   └── index.ts              # 统一导出
│   ├── pages/
│   │   ├── student/               # 学生端页面
│   │   └── admin/                 # 管理端页面
│   └── components/                # 可复用组件
├── supabase/
│   └── functions/                 # Supabase Edge Functions
└── ...
```

## 部署

详见 [DEPLOY.md](DEPLOY.md)
