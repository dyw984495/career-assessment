-- ============================================================
-- 一次性修复：管理员任务详情页「已提交但看不到报告」
-- 原因：旧策略「禁止匿名读取提交 / deny_anon_select_submissions」
--       使用 using(false) 且未指定 TO authenticated，导致连登录用户也无法 SELECT。
-- 在 Supabase → SQL Editor 中整段执行一次即可。
-- ============================================================

drop policy if exists "deny_anon_select_submissions" on public.assessment_submissions;
drop policy if exists "禁止匿名读取提交" on public.assessment_submissions;
drop policy if exists "allow_service_insert_submissions" on public.assessment_submissions;

-- 若已存在则跳过（可重复执行）
drop policy if exists "authenticated_select_submissions" on public.assessment_submissions;

create policy "authenticated_select_submissions"
  on public.assessment_submissions for select to authenticated
  using (true);
