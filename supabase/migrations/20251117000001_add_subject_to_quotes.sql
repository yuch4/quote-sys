ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS subject TEXT;

-- 既存レコードの件名が未設定の場合は暫定値をセット
UPDATE public.quotes
SET subject = COALESCE(subject, '')
WHERE subject IS NULL;
