ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS contract_probability TEXT NOT NULL DEFAULT 'B'
    CHECK (contract_probability IN ('S', 'A', 'B', 'C', 'D'));

COMMENT ON COLUMN public.projects.contract_probability IS '案件の契約確度（S/A/B/C/D）';
