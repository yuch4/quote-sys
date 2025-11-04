-- Extend approval routes to support multiple entities
ALTER TABLE public.approval_routes
  ADD COLUMN target_entity TEXT NOT NULL DEFAULT 'quote'
  CHECK (target_entity IN ('quote', 'purchase_order'));

-- Purchase order approval columns
ALTER TABLE public.purchase_orders
  ADD COLUMN approval_status TEXT NOT NULL DEFAULT '承認済み'
    CHECK (approval_status IN ('下書き', '承認待ち', '承認済み', '却下')),
  ADD COLUMN approved_by UUID REFERENCES public.users(id),
  ADD COLUMN approved_at TIMESTAMPTZ;

-- Adjust purchase order workflow defaults
ALTER TABLE public.purchase_orders
  ALTER COLUMN status SET DEFAULT '下書き';

UPDATE public.purchase_orders
SET status = COALESCE(status, '下書き');

-- Purchase order approval instances
CREATE TABLE public.purchase_order_approval_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.approval_routes(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  current_step INTEGER,
  requested_by UUID REFERENCES public.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rejection_reason TEXT,
  UNIQUE (purchase_order_id)
);

CREATE TABLE public.purchase_order_approval_instance_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.purchase_order_approval_instances(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  approver_role TEXT NOT NULL CHECK (approver_role IN ('営業', '営業事務', '管理者')),
  approver_user_id UUID REFERENCES public.users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
  decided_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE (instance_id, step_order)
);

CREATE INDEX idx_po_approval_instances_order ON public.purchase_order_approval_instances(purchase_order_id);
CREATE INDEX idx_po_approval_steps_instance ON public.purchase_order_approval_instance_steps(instance_id);

-- updated_at triggers
CREATE TRIGGER update_purchase_order_approval_instances_updated_at
  BEFORE UPDATE ON public.purchase_order_approval_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.purchase_order_approval_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_approval_instance_steps ENABLE ROW LEVEL SECURITY;

-- Policies: viewable by authenticated users
CREATE POLICY "発注書承認インスタンス参照" ON public.purchase_order_approval_instances
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Creation (request) allowed for creator and back-office roles
CREATE POLICY "発注書承認インスタンス作成" ON public.purchase_order_approval_instances
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT created_by FROM public.purchase_orders WHERE id = purchase_order_id
    )
    OR auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

-- Updates allowed for requester/back-office/assigned approvers
CREATE POLICY "発注書承認インスタンス更新" ON public.purchase_order_approval_instances
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT created_by FROM public.purchase_orders WHERE id = purchase_order_id
    )
    OR auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
    OR EXISTS (
      SELECT 1
      FROM public.purchase_order_approval_instance_steps s
      JOIN public.users u ON u.id = auth.uid()
      WHERE s.instance_id = public.purchase_order_approval_instances.id
        AND s.approver_role = u.role
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT created_by FROM public.purchase_orders WHERE id = purchase_order_id
    )
    OR auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
    OR EXISTS (
      SELECT 1
      FROM public.purchase_order_approval_instance_steps s
      JOIN public.users u ON u.id = auth.uid()
      WHERE s.instance_id = public.purchase_order_approval_instances.id
        AND s.approver_role = u.role
    )
  );

CREATE POLICY "発注書承認インスタンス削除" ON public.purchase_order_approval_instances
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

-- Steps policies
CREATE POLICY "発注書承認ステップ参照" ON public.purchase_order_approval_instance_steps
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "発注書承認ステップ管理" ON public.purchase_order_approval_instance_steps
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

CREATE POLICY "発注書承認ステップ作成" ON public.purchase_order_approval_instance_steps
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT requested_by FROM public.purchase_order_approval_instances WHERE id = instance_id
    )
    OR auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

CREATE POLICY "発注書承認ステップ削除" ON public.purchase_order_approval_instance_steps
  FOR DELETE USING (
    auth.uid() IN (
      SELECT requested_by FROM public.purchase_order_approval_instances WHERE id = instance_id
    )
    OR auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );

CREATE POLICY "発注書承認ステップ更新" ON public.purchase_order_approval_instance_steps
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = purchase_order_approval_instance_steps.approver_role
    ) OR auth.uid() = approver_user_id
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = purchase_order_approval_instance_steps.approver_role
    ) OR auth.uid() = approver_user_id
  );
