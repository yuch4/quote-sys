CREATE TABLE public.project_activity_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  warning_days INTEGER NOT NULL DEFAULT 7,
  danger_days INTEGER NOT NULL DEFAULT 14,
  safe_color TEXT NOT NULL DEFAULT '#FFFFFF',
  warning_color TEXT NOT NULL DEFAULT '#FEF3C7',
  danger_color TEXT NOT NULL DEFAULT '#FEE2E2',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.project_activity_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "活動しきい値参照" ON public.project_activity_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "活動しきい値更新" ON public.project_activity_settings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "活動しきい値更新2" ON public.project_activity_settings
  FOR UPDATE USING (auth.uid() IS NOT NULL);

INSERT INTO public.project_activity_settings (id)
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;
