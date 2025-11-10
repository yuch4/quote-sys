ALTER TABLE public.purchase_orders
  ADD COLUMN pdf_url TEXT,
  ADD COLUMN pdf_generated_at TIMESTAMPTZ;
