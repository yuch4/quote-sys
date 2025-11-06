DROP POLICY IF EXISTS "顧客登録権限" ON public.customers;

CREATE POLICY "顧客登録権限" ON public.customers
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users
      WHERE role IN ('営業', '営業事務', '管理者')
    )
  );

