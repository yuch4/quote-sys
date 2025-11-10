-- Extend project billing schedules for confirmation-based workflow
ALTER TABLE public.project_billing_schedules
  ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billed_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS billed_at TIMESTAMPTZ;

-- Update status enum to cover confirmation/delay lifecycle
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'project_billing_schedules_status_check'
  ) THEN
    ALTER TABLE public.project_billing_schedules
      DROP CONSTRAINT project_billing_schedules_status_check;
  END IF;
END $$;

-- Map legacy statuses to the new lifecycle
UPDATE public.project_billing_schedules
  SET status = '確認済'
  WHERE status = '確定';

UPDATE public.project_billing_schedules
  SET status = '計上済'
  WHERE status = '請求済';

ALTER TABLE public.project_billing_schedules
  ADD CONSTRAINT project_billing_schedules_status_check
    CHECK (status IN ('予定', '確認済', '延期', '計上済'));

-- Optional index for dashboard filtering by status
CREATE INDEX IF NOT EXISTS idx_project_billing_schedules_status
  ON public.project_billing_schedules(status);
