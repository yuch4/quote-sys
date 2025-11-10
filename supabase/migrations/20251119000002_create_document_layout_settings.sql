CREATE TABLE public.document_layout_settings (
  target_entity TEXT PRIMARY KEY CHECK (target_entity IN ('quote', 'purchase_order')),
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  table_columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.document_layout_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "帳票レイアウト参照" ON public.document_layout_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "帳票レイアウト登録" ON public.document_layout_settings
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

CREATE POLICY "帳票レイアウト更新" ON public.document_layout_settings
  FOR UPDATE
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

CREATE TRIGGER update_document_layout_settings_updated_at
  BEFORE UPDATE ON public.document_layout_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.document_layout_settings (target_entity, sections, table_columns)
VALUES
  (
    'quote',
    '[
      {"key":"document_meta","label":"ドキュメント情報","enabled":true,"region":"header","row":0,"column":"left","width":60,"order":0},
      {"key":"company_info","label":"会社情報","enabled":true,"region":"header","row":0,"column":"right","width":40,"order":1},
      {"key":"customer_info","label":"お客様情報","enabled":true,"region":"body","row":1,"column":"full","width":100,"order":0},
      {"key":"project_info","label":"案件情報","enabled":true,"region":"body","row":2,"column":"full","width":100,"order":0},
      {"key":"items_table","label":"明細","enabled":true,"region":"body","row":3,"column":"full","width":100,"order":0},
      {"key":"totals","label":"合計","enabled":true,"region":"body","row":4,"column":"full","width":100,"order":0},
      {"key":"notes","label":"備考","enabled":true,"region":"body","row":5,"column":"full","width":100,"order":0},
      {"key":"footer","label":"フッター","enabled":true,"region":"footer","row":6,"column":"full","width":100,"order":0}
    ]'::jsonb,
    '[
      {"key":"line_number","label":"No","enabled":true,"width":8,"order":0},
      {"key":"product_name","label":"品名","enabled":true,"width":25,"order":1},
      {"key":"description","label":"説明","enabled":true,"width":30,"order":2},
      {"key":"quantity","label":"数量","enabled":true,"width":12,"order":3},
      {"key":"unit_price","label":"単価","enabled":true,"width":12,"order":4},
      {"key":"amount","label":"金額","enabled":true,"width":13,"order":5}
    ]'::jsonb
  ),
  (
    'purchase_order',
    '[
      {"key":"document_meta","label":"発注情報","enabled":true,"region":"header","row":0,"column":"left","width":60,"order":0},
      {"key":"company_info","label":"会社情報","enabled":true,"region":"header","row":0,"column":"right","width":40,"order":1},
      {"key":"supplier_info","label":"仕入先情報","enabled":true,"region":"body","row":1,"column":"full","width":100,"order":0},
      {"key":"quote_info","label":"関連見積","enabled":true,"region":"body","row":2,"column":"full","width":100,"order":0},
      {"key":"items_table","label":"明細","enabled":true,"region":"body","row":3,"column":"full","width":100,"order":0},
      {"key":"totals","label":"合計","enabled":true,"region":"body","row":4,"column":"full","width":100,"order":0},
      {"key":"notes","label":"備考","enabled":true,"region":"body","row":5,"column":"full","width":100,"order":0},
      {"key":"footer","label":"フッター","enabled":true,"region":"footer","row":6,"column":"full","width":100,"order":0}
    ]'::jsonb,
    '[
      {"key":"line_number","label":"No","enabled":true,"width":10,"order":0},
      {"key":"product_name","label":"品名","enabled":true,"width":30,"order":1},
      {"key":"description","label":"説明","enabled":true,"width":25,"order":2},
      {"key":"quantity","label":"数量","enabled":true,"width":10,"order":3},
      {"key":"unit_cost","label":"仕入単価","enabled":true,"width":12.5,"order":4},
      {"key":"amount","label":"金額","enabled":true,"width":12.5,"order":5}
    ]'::jsonb
  )
ON CONFLICT (target_entity) DO UPDATE
SET sections = EXCLUDED.sections,
    table_columns = EXCLUDED.table_columns;
