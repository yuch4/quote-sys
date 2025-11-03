-- Purchase order tables

CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_number TEXT NOT NULL UNIQUE,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('下書き', '発注済', 'キャンセル')) DEFAULT '発注済',
  total_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  quote_item_id UUID NOT NULL REFERENCES public.quote_items(id) ON DELETE CASCADE,
  quantity NUMERIC(10, 2) NOT NULL,
  unit_cost NUMERIC(15, 2) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_orders_quote_id ON public.purchase_orders(quote_id);
CREATE INDEX idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_order_items_order_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX idx_purchase_order_items_quote_item_id ON public.purchase_order_items(quote_item_id);

-- updated_at trigger
CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "発注書参照権限" ON public.purchase_orders
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "発注書管理権限" ON public.purchase_orders
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

CREATE POLICY "発注書明細参照権限" ON public.purchase_order_items
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "発注書明細管理権限" ON public.purchase_order_items
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );
