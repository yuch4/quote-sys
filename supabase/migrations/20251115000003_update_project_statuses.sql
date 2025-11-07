-- Update project status workflow: add new statuses and adjust defaults

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('リード', '見積中', '受注', '計上OK', '計上済み', '失注', 'キャンセル'));

ALTER TABLE public.projects
  ALTER COLUMN status SET DEFAULT 'リード';

-- Backfill existing data: treat former "見積中" entries as leads, then flag ones with approved quotes
UPDATE public.projects
SET status = 'リード'
WHERE status = '見積中';

UPDATE public.projects p
SET status = '見積中'
WHERE status = 'リード'
  AND EXISTS (
    SELECT 1
    FROM public.quotes q
    WHERE q.project_id = p.id
      AND q.approval_status = '承認済み'
  );
