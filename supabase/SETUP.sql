-- ============================================================
-- Supabase SQL Setup - 职业测评系统
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- ============================================================
-- assessment_tasks: 任务管理表
-- ============================================================
create table if not exists public.assessment_tasks (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  student_name text,
  student_phone text,
  source text,
  status text not null default 'pending' check (status in ('pending', 'started', 'submitted', 'expired')),
  expires_at timestamptz,
  submitted_at timestamptz,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 索引
create index if not exists assessment_tasks_token_idx on public.assessment_tasks(token);
create index if not exists assessment_tasks_status_idx on public.assessment_tasks(status);
create index if not exists assessment_tasks_created_at_idx on public.assessment_tasks(created_at desc);

-- ============================================================
-- assessment_submissions: 提交记录表
-- ============================================================
create table if not exists public.assessment_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.assessment_tasks(id) on delete cascade,
  answers_json jsonb not null default '{}',
  riasec_scores_json jsonb not null default '{}',
  ipip_scores_json jsonb not null default '{}',
  top_roles_json jsonb not null default '[]',
  report_json jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 索引
create index if not exists assessment_submissions_task_id_idx on public.assessment_submissions(task_id);

-- ============================================================
-- RLS 策略
-- ============================================================
alter table public.assessment_tasks enable row level security;
alter table public.assessment_submissions enable row level security;

-- 学生端：匿名可查询/更新任务（通过 Edge Function 校验）
create policy "allow_anon_select_tasks"
  on public.assessment_tasks for select using (true);

create policy "allow_anon_insert_tasks"
  on public.assessment_tasks for insert with check (true);

create policy "allow_anon_update_tasks"
  on public.assessment_tasks for update using (true);

-- 管理端：登录用户可删除任务（级联删除 submissions 需同时对 submissions 开放 DELETE）
create policy "authenticated_delete_tasks"
  on public.assessment_tasks for delete to authenticated
  using (true);

-- 提交表：仅登录用户（管理后台）可读。匿名无 SELECT 策略 → 学生无法直接读报告
-- 写入仅通过 Edge Function（service_role 绕过 RLS），勿对 anon 开放 insert
-- 注意：禁止「for select using (false)」且不写 TO，否则会拒绝所有角色
create policy "authenticated_select_submissions"
  on public.assessment_submissions for select to authenticated
  using (true);

create policy "authenticated_delete_submissions"
  on public.assessment_submissions for delete to authenticated
  using (true);

-- ============================================================
-- updated_at 自动更新触发器
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger assessment_tasks_updated_at
  before update on public.assessment_tasks
  for each row execute procedure public.handle_updated_at();

create trigger assessment_submissions_updated_at
  before update on public.assessment_submissions
  for each row execute procedure public.handle_updated_at();
