
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_code TEXT NOT NULL UNIQUE,
  department_name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_departments_active_sort
  ON public.departments (is_active, sort_order, department_name);

ALTER TABLE public.users
  ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

WITH distinct_departments AS (
  SELECT DISTINCT TRIM(department) AS department_name
  FROM public.users
  WHERE department IS NOT NULL
    AND TRIM(department) <> ''
)
INSERT INTO public.departments (department_code, department_name, sort_order)
SELECT
  'DEP-' || LPAD(seq::text, 3, '0'),
  department_name,
  seq * 10
FROM (
  SELECT department_name, ROW_NUMBER() OVER (ORDER BY department_name) AS seq
  FROM distinct_departments
) AS ordered_departments;

UPDATE public.users AS u
SET department_id = d.id
FROM public.departments AS d
WHERE u.department = d.department_name;

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
