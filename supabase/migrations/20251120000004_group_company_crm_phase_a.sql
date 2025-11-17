-- グループ会社向けCRM拡張 Phase A: データモデル

-- ▼ 列挙型の定義
CREATE TYPE public.system_category AS ENUM (
  'sales_management',
  'accounting',
  'human_resources',
  'endpoint_security',
  'collaboration',
  'infrastructure',
  'erp',
  'other'
);

CREATE TYPE public.system_adoption_status AS ENUM (
  'in_use',
  'pilot',
  'planned',
  'decommissioned',
  'unknown'
);

CREATE TYPE public.system_integration_level AS ENUM (
  'none',
  'manual',
  'partial',
  'full'
);

CREATE TYPE public.system_security_risk AS ENUM (
  'low',
  'normal',
  'high',
  'critical'
);

CREATE TYPE public.security_control_type AS ENUM (
  'edr',
  'mdm',
  'siem',
  'iam',
  'email_security',
  'network',
  'backup',
  'zero_trust',
  'other'
);

-- ▼ テーブル: グループ会社マスタ
CREATE TABLE public.group_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  company_name_kana TEXT,
  region TEXT,
  country TEXT,
  industry TEXT,
  employee_count_range TEXT,
  revenue_range TEXT,
  it_maturity TEXT,
  relationship_status TEXT NOT NULL DEFAULT 'active',
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX group_companies_name_idx ON public.group_companies (company_name);
CREATE INDEX group_companies_industry_idx ON public.group_companies (industry);

ALTER TABLE public.group_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "グループ会社参照権限" ON public.group_companies
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "グループ会社管理権限" ON public.group_companies
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

-- ▼ テーブル: システムカタログ
CREATE TABLE public.system_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.system_category NOT NULL,
  system_name TEXT NOT NULL,
  vendor TEXT,
  product_url TEXT,
  description TEXT,
  recommended BOOLEAN NOT NULL DEFAULT FALSE,
  default_license_cost NUMERIC(14, 2),
  cost_unit TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX system_catalog_category_name_uidx
  ON public.system_catalog (category, system_name);

ALTER TABLE public.system_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "システムカタログ参照権限" ON public.system_catalog
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "システムカタログ管理権限" ON public.system_catalog
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

-- ▼ テーブル: 会社別システム利用状況
CREATE TABLE public.company_system_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_company_id UUID NOT NULL REFERENCES public.group_companies (id) ON DELETE CASCADE,
  system_catalog_id UUID REFERENCES public.system_catalog (id) ON DELETE SET NULL,
  category public.system_category NOT NULL,
  system_name TEXT NOT NULL,
  vendor TEXT,
  adoption_status public.system_adoption_status NOT NULL DEFAULT 'in_use',
  deployment_model TEXT,
  contract_type TEXT,
  license_count INTEGER,
  annual_cost NUMERIC(16, 2),
  renewal_date DATE,
  satisfaction_score SMALLINT,
  integration_level public.system_integration_level NOT NULL DEFAULT 'manual',
  security_risk_level public.system_security_risk NOT NULL DEFAULT 'normal',
  point_of_contact TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::JSONB,
  notes TEXT,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT company_system_usage_unique UNIQUE (group_company_id, category, system_name),
  CONSTRAINT satisfaction_score_range CHECK (satisfaction_score IS NULL OR (satisfaction_score BETWEEN 1 AND 5))
);

CREATE INDEX company_system_usage_company_idx
  ON public.company_system_usage (group_company_id);
CREATE INDEX company_system_usage_category_idx
  ON public.company_system_usage (category);
CREATE INDEX company_system_usage_status_idx
  ON public.company_system_usage (adoption_status);

ALTER TABLE public.company_system_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "会社別システム参照権限" ON public.company_system_usage
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "会社別システム管理権限" ON public.company_system_usage
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

-- ▼ テーブル: セキュリティコントロール棚卸
CREATE TABLE public.company_security_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_company_id UUID NOT NULL REFERENCES public.group_companies (id) ON DELETE CASCADE,
  control_type public.security_control_type NOT NULL,
  vendor TEXT,
  adoption_status public.system_adoption_status NOT NULL DEFAULT 'in_use',
  coverage TEXT,
  notes TEXT,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT company_security_controls_unique UNIQUE (group_company_id, control_type, vendor)
);

CREATE INDEX company_security_controls_company_idx
  ON public.company_security_controls (group_company_id);

ALTER TABLE public.company_security_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "セキュリティ統制参照権限" ON public.company_security_controls
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "セキュリティ統制管理権限" ON public.company_security_controls
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
