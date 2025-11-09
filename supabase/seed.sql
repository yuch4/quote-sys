-- テストデータ: 部署
INSERT INTO public.departments (id, department_code, department_name, sort_order, is_active)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'DEP-001', '営業部', 10, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'DEP-002', '営業事務', 20, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'DEP-003', '管理部', 30, true);

-- テストデータ: ユーザー
INSERT INTO public.users (id, email, display_name, department_id, department, role)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'admin@example.com', '管理者太郎', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '営業部', '管理者'),
  ('22222222-2222-2222-2222-222222222222', 'sales@example.com', '営業花子', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '営業部', '営業'),
  ('33333333-3333-3333-3333-333333333333', 'clerk@example.com', '事務次郎', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '営業事務', '営業事務');

-- テストデータ: 顧客
INSERT INTO public.customers (customer_code, customer_name, customer_name_kana, postal_code, address, phone, email, contact_person)
VALUES 
  ('C001', '株式会社サンプル商事', 'カブシキガイシャサンプルショウジ', '100-0001', '東京都千代田区千代田1-1-1', '03-1234-5678', 'contact@sample.co.jp', '山田太郎'),
  ('C002', 'テスト株式会社', 'テストカブシキガイシャ', '150-0001', '東京都渋谷区神宮前1-1-1', '03-9876-5432', 'info@test.co.jp', '佐藤花子');

-- テストデータ: 仕入先
INSERT INTO public.suppliers (supplier_code, supplier_name, contact_person, phone, email, payment_terms)
VALUES 
  ('S001', '株式会社部品商社', '鈴木一郎', '06-1111-2222', 'suzuki@buhin.co.jp', '月末締め翌月末払い'),
  ('S002', '機器販売株式会社', '田中二郎', '03-3333-4444', 'tanaka@kiki.co.jp', '月末締め翌々月10日払い');

-- テストデータ: 案件
INSERT INTO public.projects (project_number, customer_id, project_name, category, department, sales_rep_id, status, order_month, accounting_month, expected_sales, expected_gross_profit)
VALUES 
  ('PRJ-2025-0001', (SELECT id FROM public.customers WHERE customer_code = 'C001'), 'オフィス機器導入プロジェクト', 'オフィス機器', '営業部', '22222222-2222-2222-2222-222222222222', '見積中', '2025-01-01', '2025-02-01', 550000, 180000),
  ('PRJ-2025-0002', (SELECT id FROM public.customers WHERE customer_code = 'C002'), 'セキュリティシステム構築', 'セキュリティ', '営業部', '22222222-2222-2222-2222-222222222222', '受注', '2025-02-01', '2025-03-01', 700000, 240000);

-- テストデータ: 見積
INSERT INTO public.quotes (project_id, quote_number, version, issue_date, valid_until, subject, approval_status, created_by)
VALUES 
  ((SELECT id FROM public.projects WHERE project_number = 'PRJ-2025-0001'), 'Q-2025-0001', 1, '2025-01-15', '2025-02-15', 'オフィス機器導入一式 御見積', '承認済み', '22222222-2222-2222-2222-222222222222'),
  ((SELECT id FROM public.projects WHERE project_number = 'PRJ-2025-0002'), 'Q-2025-0002', 1, '2025-01-20', '2025-02-20', 'セキュリティシステム構築 御見積', '承認済み', '22222222-2222-2222-2222-222222222222');

-- テストデータ: 明細
INSERT INTO public.quote_items (quote_id, line_number, product_name, description, quantity, unit_price, amount, supplier_id, cost_price, cost_amount, gross_profit, requires_procurement, procurement_status)
VALUES 
  ((SELECT id FROM public.quotes WHERE quote_number = 'Q-2025-0001'), 1, 'プリンター A4対応', '高速印刷対応モデル', 5, 50000, 250000, (SELECT id FROM public.suppliers WHERE supplier_code = 'S001'), 35000, 175000, 75000, true, '発注済'),
  ((SELECT id FROM public.quotes WHERE quote_number = 'Q-2025-0001'), 2, 'トナーカートリッジ', '純正品', 20, 5000, 100000, (SELECT id FROM public.suppliers WHERE supplier_code = 'S001'), 3500, 70000, 30000, true, '未発注'),
  ((SELECT id FROM public.quotes WHERE quote_number = 'Q-2025-0002'), 1, '監視カメラシステム', '4K対応カメラ10台セット', 1, 500000, 500000, (SELECT id FROM public.suppliers WHERE supplier_code = 'S002'), 350000, 350000, 150000, true, '入荷済'),
  ((SELECT id FROM public.quotes WHERE quote_number = 'Q-2025-0002'), 2, '設置工事費', '配線工事含む', 1, 200000, 200000, NULL, NULL, NULL, 200000, false, NULL);

-- 金額の再計算 (見積テーブル)
UPDATE public.quotes q
SET 
  total_amount = (SELECT COALESCE(SUM(amount), 0) FROM public.quote_items WHERE quote_id = q.id),
  total_cost = (SELECT COALESCE(SUM(cost_amount), 0) FROM public.quote_items WHERE quote_id = q.id),
  gross_profit = (SELECT COALESCE(SUM(gross_profit), 0) FROM public.quote_items WHERE quote_id = q.id);
