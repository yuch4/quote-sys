-- 見積作成権限ポリシーを営業事務・管理者にも適用
DROP POLICY IF EXISTS "見積作成権限" ON public.quotes;

CREATE POLICY "見積作成権限" ON public.quotes
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND (
      project_id IN (
        SELECT id FROM public.projects WHERE sales_rep_id = auth.uid()
      )
      OR auth.uid() IN (
        SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
      )
    )
  );

