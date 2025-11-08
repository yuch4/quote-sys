ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS order_month DATE,
  ADD COLUMN IF NOT EXISTS accounting_month DATE,
  ADD COLUMN IF NOT EXISTS expected_sales DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS expected_gross_profit DECIMAL(15, 2);

-- 既存データはnullのままとする
