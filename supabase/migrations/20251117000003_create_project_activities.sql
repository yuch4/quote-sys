CREATE TABLE public.project_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  subject TEXT NOT NULL,
  details TEXT,
  next_action TEXT,
  next_action_due_date DATE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_activities_project_id ON public.project_activities(project_id);
CREATE INDEX idx_project_activities_activity_date ON public.project_activities(activity_date);

ALTER TABLE public.project_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "プロジェクト活動参照権限" ON public.project_activities
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "プロジェクト活動追加権限" ON public.project_activities
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
