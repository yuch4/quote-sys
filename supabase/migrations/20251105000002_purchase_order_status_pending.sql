-- Allow "未発注" as a purchase order status and make it the default
ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

UPDATE public.purchase_orders
SET status = '未発注'
WHERE status = '下書き';

ALTER TABLE public.purchase_orders
  ALTER COLUMN status SET DEFAULT '未発注';

ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_status_check
    CHECK (status IN ('未発注', '発注済', 'キャンセル'));
