CREATE TABLE public.company_profile (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  company_name TEXT NOT NULL DEFAULT '自社名',
  company_address TEXT NOT NULL DEFAULT '住所未設定',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "会社情報参照" ON public.company_profile
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "会社情報登録" ON public.company_profile
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "会社情報更新" ON public.company_profile
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

INSERT INTO public.company_profile (id)
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;
