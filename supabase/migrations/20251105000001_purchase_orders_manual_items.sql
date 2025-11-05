-- Allow purchase orders without associated quotes and store manual item details

ALTER TABLE public.purchase_orders
  ALTER COLUMN quote_id DROP NOT NULL;

ALTER TABLE public.purchase_orders
  ALTER COLUMN quote_id DROP DEFAULT;

ALTER TABLE public.purchase_order_items
  ALTER COLUMN quote_item_id DROP NOT NULL;

ALTER TABLE public.purchase_order_items
  ADD COLUMN manual_name TEXT,
  ADD COLUMN manual_description TEXT;

ALTER TABLE public.purchase_order_items
  ADD CONSTRAINT purchase_order_items_quote_or_manual_chk
    CHECK (
      quote_item_id IS NOT NULL
      OR manual_name IS NOT NULL
    );
