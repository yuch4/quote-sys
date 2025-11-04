-- Approval workflow tables for configurable routing

CREATE TABLE public.approval_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  requester_role TEXT,
  min_total_amount NUMERIC(15, 2),
  max_total_amount NUMERIC(15, 2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.approval_route_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.approval_routes(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  approver_role TEXT NOT NULL CHECK (approver_role IN ('営業', '営業事務', '管理者')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (route_id, step_order)
);

CREATE TABLE public.quote_approval_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.approval_routes(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  current_step INTEGER,
  requested_by UUID REFERENCES public.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rejection_reason TEXT,
  UNIQUE (quote_id)
);

CREATE TABLE public.quote_approval_instance_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.quote_approval_instances(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  approver_role TEXT NOT NULL CHECK (approver_role IN ('営業', '営業事務', '管理者')),
  approver_user_id UUID REFERENCES public.users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
  decided_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE (instance_id, step_order)
);

CREATE INDEX idx_approval_route_steps_route ON public.approval_route_steps(route_id);
CREATE INDEX idx_quote_approval_instances_quote ON public.quote_approval_instances(quote_id);
CREATE INDEX idx_quote_approval_steps_instance ON public.quote_approval_instance_steps(instance_id);

-- updated_at trigger
CREATE TRIGGER update_approval_routes_updated_at
  BEFORE UPDATE ON public.approval_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_approval_instances_updated_at
  BEFORE UPDATE ON public.quote_approval_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.approval_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_route_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_approval_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_approval_instance_steps ENABLE ROW LEVEL SECURITY;

-- Policies
-- Routes can be viewed by authenticated users; managed by office/admin roles
CREATE POLICY "承認ルート参照権限" ON public.approval_routes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "承認ルート管理権限" ON public.approval_routes
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

CREATE POLICY "承認ルート工程参照権限" ON public.approval_route_steps
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "承認ルート工程管理権限" ON public.approval_route_steps
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

-- Instances can be viewed by authenticated users involved in the quote
CREATE POLICY "承認インスタンス参照権限" ON public.quote_approval_instances
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Instances can be created/updated by office/admin roles
CREATE POLICY "承認インスタンス申請権限" ON public.quote_approval_instances
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT created_by FROM public.quotes WHERE id = quote_id
    )
    OR auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

CREATE POLICY "承認インスタンス更新権限" ON public.quote_approval_instances
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT created_by FROM public.quotes WHERE id = quote_id
    )
    OR auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
    OR EXISTS (
      SELECT 1
      FROM public.quote_approval_instance_steps s
      JOIN public.users u ON u.id = auth.uid()
      WHERE s.instance_id = public.quote_approval_instances.id
        AND s.approver_role = u.role
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT created_by FROM public.quotes WHERE id = quote_id
    )
    OR auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
    OR EXISTS (
      SELECT 1
      FROM public.quote_approval_instance_steps s
      JOIN public.users u ON u.id = auth.uid()
      WHERE s.instance_id = public.quote_approval_instances.id
        AND s.approver_role = u.role
    )
  );

CREATE POLICY "承認インスタンス削除権限" ON public.quote_approval_instances
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

-- Instance steps can be read by all authenticated users
CREATE POLICY "承認インスタンス工程参照権限" ON public.quote_approval_instance_steps
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Office/Admin can manage all steps
CREATE POLICY "承認インスタンス工程管理権限" ON public.quote_approval_instance_steps
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

CREATE POLICY "承認インスタンス工程作成権限" ON public.quote_approval_instance_steps
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT requested_by FROM public.quote_approval_instances WHERE id = instance_id
    )
    OR auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

CREATE POLICY "承認インスタンス工程削除権限" ON public.quote_approval_instance_steps
  FOR DELETE USING (
    auth.uid() IN (
      SELECT requested_by FROM public.quote_approval_instances WHERE id = instance_id
    )
    OR auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

-- Approvers can update their own step status
CREATE POLICY "承認担当者のステータス更新" ON public.quote_approval_instance_steps
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = quote_approval_instance_steps.approver_role
    ) OR auth.uid() = approver_user_id
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = quote_approval_instance_steps.approver_role
    ) OR auth.uid() = approver_user_id
  );
