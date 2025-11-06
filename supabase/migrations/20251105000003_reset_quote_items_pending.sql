-- Reset quote item procurement status for purchase orders that are still 未発注
UPDATE public.quote_items qi
SET procurement_status = '未発注',
    ordered_at = NULL
WHERE EXISTS (
  SELECT 1
  FROM public.purchase_order_items poi
  JOIN public.purchase_orders po ON po.id = poi.purchase_order_id
  WHERE poi.quote_item_id = qi.id
    AND po.status = '未発注'
);
