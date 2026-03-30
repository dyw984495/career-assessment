-- ============================================================
-- 允许管理端删除任务（含级联删除 submissions）
-- 在 Supabase SQL Editor 执行一次即可
-- ============================================================

drop policy if exists "authenticated_delete_tasks" on public.assessment_tasks;
create policy "authenticated_delete_tasks"
  on public.assessment_tasks for delete to authenticated
  using (true);

drop policy if exists "authenticated_delete_submissions" on public.assessment_submissions;
create policy "authenticated_delete_submissions"
  on public.assessment_submissions for delete to authenticated
  using (true);
