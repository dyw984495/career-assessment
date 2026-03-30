-- ============================================================
-- 公开报告链接：匿名用户可通过 RPC 读取 report_json（绕过 submissions 的 RLS）
-- 在 Supabase SQL Editor 执行一次即可
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_public_report(p_submission_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT report_json
  FROM public.assessment_submissions
  WHERE id = p_submission_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_report(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_report(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_report(uuid) TO authenticated;
