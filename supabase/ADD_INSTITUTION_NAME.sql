-- ============================================================
-- 任务表增加「机构名」字段（仅管理端记录，不出现在学生报告中）
-- ============================================================

ALTER TABLE public.assessment_tasks
  ADD COLUMN IF NOT EXISTS institution_name text;

COMMENT ON COLUMN public.assessment_tasks.institution_name IS '创建任务时填写的机构名，仅供管理端使用，不写入 report_json';
