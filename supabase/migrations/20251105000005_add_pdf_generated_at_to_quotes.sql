ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ;

UPDATE public.quotes
SET pdf_generated_at = COALESCE(pdf_generated_at, updated_at)
WHERE pdf_url IS NOT NULL;

