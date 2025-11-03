-- 顧客テーブルのINSERT権限を明示的に追加
-- 既存の「顧客管理権限」ポリシーを削除して再作成

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "顧客管理権限" ON public.customers;
DROP POLICY IF EXISTS "仕入先管理権限" ON public.suppliers;

-- 顧客テーブル: INSERT権限を追加
CREATE POLICY "顧客登録権限" ON public.customers
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users
      WHERE role IN ('営業事務', '管理者')
    )
  );

-- 顧客テーブル: UPDATE/DELETE権限を追加
CREATE POLICY "顧客更新削除権限" ON public.customers
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.users
      WHERE role IN ('営業事務', '管理者')
    )
  );

CREATE POLICY "顧客削除権限" ON public.customers
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM public.users
      WHERE role IN ('営業事務', '管理者')
    )
  );

-- 仕入先テーブル: INSERT権限を追加
CREATE POLICY "仕入先登録権限" ON public.suppliers
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users
      WHERE role IN ('営業事務', '管理者')
    )
  );

-- 仕入先テーブル: UPDATE/DELETE権限を追加
CREATE POLICY "仕入先更新削除権限" ON public.suppliers
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.users
      WHERE role IN ('営業事務', '管理者')
    )
  );

CREATE POLICY "仕入先削除権限" ON public.suppliers
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM public.users
      WHERE role IN ('営業事務', '管理者')
    )
  );
