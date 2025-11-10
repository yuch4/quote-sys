-- 月次計上予定テーブル
CREATE TABLE public.project_billing_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  billing_month DATE NOT NULL,
  billing_date DATE,
  amount DECIMAL(15, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT '予定' CHECK (status IN ('予定', '確定', '請求済')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_billing_schedules_project_id
  ON public.project_billing_schedules(project_id);

CREATE INDEX idx_project_billing_schedules_billing_month
  ON public.project_billing_schedules(billing_month);

CREATE TRIGGER update_project_billing_schedules_updated_at
  BEFORE UPDATE ON public.project_billing_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.project_billing_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "計上予定参照権限" ON public.project_billing_schedules
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE
        sales_rep_id = auth.uid() OR
        auth.uid() IN (
          SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
        )
    )
  );

CREATE POLICY "計上予定作成権限" ON public.project_billing_schedules
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE
        sales_rep_id = auth.uid() OR
        auth.uid() IN (
          SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
        )
    )
  );

CREATE POLICY "計上予定更新権限" ON public.project_billing_schedules
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM public.projects WHERE
        sales_rep_id = auth.uid() OR
        auth.uid() IN (
          SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
        )
    )
  );

CREATE POLICY "計上予定削除権限" ON public.project_billing_schedules
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM public.projects WHERE
        sales_rep_id = auth.uid() OR
        auth.uid() IN (
          SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
        )
    )
  );
