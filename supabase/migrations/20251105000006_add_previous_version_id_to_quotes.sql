ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_previous_version_id ON public.quotes(previous_version_id);

