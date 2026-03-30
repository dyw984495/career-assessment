# 部署指南

## Cloudflare Pages + Supabase 部署步骤

### 步骤 1：创建 Supabase 项目

1. 访问 https://supabase.com 注册并创建新项目
2. 记住 Project URL 和 `anon` public key（在 Settings > API 中）

### 步骤 2：执行数据库建表 SQL

在 Supabase 控制台打开 **SQL Editor**，执行以下建表语句：

```sql
-- ============================================================
-- assessment_tasks 表：测评任务
-- ============================================================
create table public.assessment_tasks (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  student_name text,
  student_phone text,
  source text,
  status text not null default 'pending',
  expires_at timestamptz,
  submitted_at timestamptz,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- assessment_submissions 表：测评提交
-- ============================================================
create table public.assessment_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.assessment_tasks(id) on delete cascade,
  answers_json jsonb not null,
  riasec_scores_json jsonb not null,
  ipip_scores_json jsonb not null,
  top_roles_json jsonb not null,
  report_json jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- RLS 策略
-- ============================================================
alter table public.assessment_tasks enable row level security;
alter table public.assessment_submissions enable row level security;

-- 学生端：只能通过 token 查询自己任务
create policy "学生可通过token查询任务"
  on public.assessment_tasks for select
  using (true);

-- 管理员：可以读写所有任务（通过 anon key，依赖服务端校验）
create policy "匿名可插入任务"
  on public.assessment_tasks for insert
  with check (true);

create policy "匿名可更新任务"
  on public.assessment_tasks for update
  using (true);

-- 提交表：仅登录管理员可读；写入走 Edge Function（service_role），勿开放匿名 insert
create policy "authenticated_select_submissions"
  on public.assessment_submissions for select to authenticated
  using (true);
```

### 步骤 3：部署 Supabase Edge Functions

在项目根目录安装 Supabase CLI：

```bash
npm install -g supabase
```

登录并链接项目：

```bash
supabase login
supabase link --project-ref your-project-id
```

部署 Edge Functions：

```bash
supabase functions deploy validate-token
supabase functions deploy create-task
supabase functions deploy submit-assessment
```

### 步骤 4：创建管理员账号

在 Supabase 控制台：
1. 进入 **Authentication > Users**
2. 点击 **Add User**
3. 输入管理员邮箱和密码
4. 确认创建

### 步骤 5：配置 Cloudflare Pages

1. 登录 Cloudflare Dashboard，进入 **Pages**
2. 点击 **Create a project**
3. 选择 **Connect to Git**，连接你的代码仓库
4. 配置构建：
   - **Framework preset**：Vite
   - **Build command**：`npm run build`
   - **Build output directory**：`/dist`
5. 在 **Environment variables** 中添加：
   - `VITE_SUPABASE_URL` = 你的 Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = 你的 anon public key
   - `VITE_APP_URL` = 你的 Cloudflare Pages 域名（如 `https://xxx.pages.dev`）
6. 点击 **Save and Deploy**

### 步骤 6：更新 Supabase 允许列表

在 Supabase 控制台，进入 **Authentication > URL Configuration**：
- 添加 Cloudflare Pages 域名到 **Redirect URLs**

在 Edge Functions CORS 配置（`supabase/functions/*/index.ts`）：
- 将 Cloudflare Pages 域名加入 `corsHeaders['Access-Control-Allow-Origin']`

### 步骤 7：验证部署

1. 访问管理员后台：`https://xxx.pages.dev/admin/login`
2. 用管理员邮箱登录
3. 创建任务，测试二维码和链接

## 环境变量参考

| 变量 | 本地开发 | 生产环境 |
|------|---------|---------|
| `VITE_SUPABASE_URL` | ✅ | ✅ |
| `VITE_SUPABASE_ANON_KEY` | ✅ | ✅ |
| `VITE_APP_URL` | http://localhost:5173 | https://xxx.pages.dev |
