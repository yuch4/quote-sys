ALTER TABLE public.project_activities
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS next_action_due_date DATE;

COMMENT ON COLUMN public.project_activities.next_action IS '次回アクション内容';
COMMENT ON COLUMN public.project_activities.next_action_due_date IS '次回アクション予定日';
