-- 仕入先テーブルに住所カラムを追加
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS address TEXT;
