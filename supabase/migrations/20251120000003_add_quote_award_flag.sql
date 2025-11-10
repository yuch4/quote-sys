ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS is_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS awarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS awarded_by UUID REFERENCES public.users(id);

ALTER TABLE public.project_billing_schedules
  ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.quotes(id);

CREATE INDEX IF NOT EXISTS idx_project_billing_schedules_quote_id
  ON public.project_billing_schedules(quote_id);
