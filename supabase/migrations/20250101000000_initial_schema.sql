-- ユーザーテーブル (Supabase Auth拡張)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  department TEXT,
  role TEXT NOT NULL CHECK (role IN ('営業', '営業事務', '管理者')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 顧客テーブル
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_name_kana TEXT,
  postal_code TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  contact_person TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 仕入先テーブル
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code TEXT NOT NULL UNIQUE,
  supplier_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  payment_terms TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 案件テーブル
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  project_name TEXT NOT NULL,
  category TEXT NOT NULL,
  department TEXT NOT NULL,
  sales_rep_id UUID NOT NULL REFERENCES public.users(id),
  status TEXT NOT NULL CHECK (status IN ('見積中', '受注', '失注', 'キャンセル')) DEFAULT '見積中',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 見積テーブル
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  quote_number TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 1,
  issue_date DATE NOT NULL,
  valid_until DATE,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  gross_profit DECIMAL(15, 2) NOT NULL DEFAULT 0,
  approval_status TEXT NOT NULL CHECK (approval_status IN ('下書き', '承認待ち', '承認済み', '却下')) DEFAULT '下書き',
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  pdf_url TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 明細テーブル
CREATE TABLE public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  cost_price DECIMAL(15, 2),
  cost_amount DECIMAL(15, 2),
  gross_profit DECIMAL(15, 2),
  requires_procurement BOOLEAN NOT NULL DEFAULT false,
  procurement_status TEXT CHECK (procurement_status IN ('未発注', '発注済', '入荷済')),
  ordered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  shipment_ready_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quote_id, line_number)
);

-- 発注・入荷履歴テーブル
CREATE TABLE public.procurement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_item_id UUID NOT NULL REFERENCES public.quote_items(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('発注', '入荷', '出荷準備完了')),
  action_date DATE NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  performed_by UUID NOT NULL REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 計上申請テーブル
CREATE TABLE public.billing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  quote_id UUID NOT NULL REFERENCES public.quotes(id),
  billing_month DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('申請中', '承認済', '却下', '計上完了')) DEFAULT '申請中',
  requested_by UUID NOT NULL REFERENCES public.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  exported_to_sales_system BOOLEAN NOT NULL DEFAULT false,
  exported_to_notes BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_projects_customer_id ON public.projects(customer_id);
CREATE INDEX idx_projects_sales_rep_id ON public.projects(sales_rep_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_quotes_project_id ON public.quotes(project_id);
CREATE INDEX idx_quotes_approval_status ON public.quotes(approval_status);
CREATE INDEX idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX idx_quote_items_procurement_status ON public.quote_items(procurement_status);
CREATE INDEX idx_procurement_logs_quote_item_id ON public.procurement_logs(quote_item_id);
CREATE INDEX idx_billing_requests_project_id ON public.billing_requests(project_id);
CREATE INDEX idx_billing_requests_status ON public.billing_requests(status);
CREATE INDEX idx_billing_requests_billing_month ON public.billing_requests(billing_month);

-- updated_at自動更新用トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_atトリガー設定
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_items_updated_at BEFORE UPDATE ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_requests_updated_at BEFORE UPDATE ON public.billing_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 有効化
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_requests ENABLE ROW LEVEL SECURITY;

-- RLSポリシー (基本的な読み取り権限)
-- ユーザー: 認証されたユーザーは全ユーザーを参照可能
CREATE POLICY "ユーザー参照権限" ON public.users
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 顧客: 認証されたユーザーは全顧客を参照可能
CREATE POLICY "顧客参照権限" ON public.customers
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_deleted = false);

CREATE POLICY "顧客管理権限" ON public.customers
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

-- 仕入先: 認証されたユーザーは全仕入先を参照可能
CREATE POLICY "仕入先参照権限" ON public.suppliers
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_deleted = false);

CREATE POLICY "仕入先管理権限" ON public.suppliers
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

-- 案件: 営業は自分の案件のみ、営業事務・管理者は全案件を参照可能
CREATE POLICY "案件参照権限" ON public.projects
  FOR SELECT USING (
    auth.uid() = sales_rep_id OR
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

CREATE POLICY "案件作成権限" ON public.projects
  FOR INSERT WITH CHECK (
    auth.uid() = sales_rep_id OR
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

CREATE POLICY "案件更新権限" ON public.projects
  FOR UPDATE USING (
    auth.uid() = sales_rep_id OR
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

-- 見積: 案件の権限に準じる
CREATE POLICY "見積参照権限" ON public.quotes
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE
        sales_rep_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM public.users WHERE role IN ('営業事務', '管理者'))
    )
  );

CREATE POLICY "見積作成権限" ON public.quotes
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    project_id IN (
      SELECT id FROM public.projects WHERE sales_rep_id = auth.uid()
    )
  );

CREATE POLICY "見積更新権限" ON public.quotes
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM public.projects WHERE
        sales_rep_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM public.users WHERE role IN ('営業事務', '管理者'))
    )
  );

-- 明細: 見積の権限に準じる
CREATE POLICY "明細参照権限" ON public.quote_items
  FOR SELECT USING (
    quote_id IN (
      SELECT q.id FROM public.quotes q
      JOIN public.projects p ON q.project_id = p.id
      WHERE p.sales_rep_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM public.users WHERE role IN ('営業事務', '管理者'))
    )
  );

CREATE POLICY "明細管理権限" ON public.quote_items
  FOR ALL USING (
    quote_id IN (
      SELECT q.id FROM public.quotes q
      JOIN public.projects p ON q.project_id = p.id
      WHERE p.sales_rep_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM public.users WHERE role IN ('営業事務', '管理者'))
    )
  );

-- 発注・入荷履歴: 営業事務・管理者のみ
CREATE POLICY "発注履歴参照権限" ON public.procurement_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "発注履歴管理権限" ON public.procurement_logs
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

-- 計上申請: 案件の権限に準じる
CREATE POLICY "計上申請参照権限" ON public.billing_requests
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE
        sales_rep_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM public.users WHERE role IN ('営業事務', '管理者'))
    )
  );

CREATE POLICY "計上申請作成権限" ON public.billing_requests
  FOR INSERT WITH CHECK (
    auth.uid() = requested_by AND
    project_id IN (
      SELECT id FROM public.projects WHERE sales_rep_id = auth.uid()
    )
  );

CREATE POLICY "計上申請更新権限" ON public.billing_requests
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );
