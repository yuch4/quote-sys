-- RLSポリシーのサブクエリ問題を解決するため、セキュリティ定義者関数を使用

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "顧客登録権限" ON public.customers;
DROP POLICY IF EXISTS "顧客更新削除権限" ON public.customers;
DROP POLICY IF EXISTS "顧客削除権限" ON public.customers;
DROP POLICY IF EXISTS "仕入先登録権限" ON public.suppliers;
DROP POLICY IF EXISTS "仕入先更新削除権限" ON public.suppliers;
DROP POLICY IF EXISTS "仕入先削除権限" ON public.suppliers;

-- ユーザーロールチェック関数（SECURITY DEFINERで実行権限を昇格）
CREATE OR REPLACE FUNCTION public.check_user_role(allowed_roles text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = ANY(allowed_roles)
  );
END;
$$;

-- 顧客テーブル: INSERT権限
CREATE POLICY "顧客登録権限" ON public.customers
  FOR INSERT
  WITH CHECK (
    public.check_user_role(ARRAY['営業事務', '管理者'])
  );

-- 顧客テーブル: UPDATE権限
CREATE POLICY "顧客更新権限" ON public.customers
  FOR UPDATE
  USING (
    public.check_user_role(ARRAY['営業事務', '管理者'])
  );

-- 顧客テーブル: DELETE権限
CREATE POLICY "顧客削除権限" ON public.customers
  FOR DELETE
  USING (
    public.check_user_role(ARRAY['営業事務', '管理者'])
  );

-- 仕入先テーブル: INSERT権限
CREATE POLICY "仕入先登録権限" ON public.suppliers
  FOR INSERT
  WITH CHECK (
    public.check_user_role(ARRAY['営業事務', '管理者'])
  );

-- 仕入先テーブル: UPDATE権限
CREATE POLICY "仕入先更新権限" ON public.suppliers
  FOR UPDATE
  USING (
    public.check_user_role(ARRAY['営業事務', '管理者'])
  );

-- 仕入先テーブル: DELETE権限
CREATE POLICY "仕入先削除権限" ON public.suppliers
  FOR DELETE
  USING (
    public.check_user_role(ARRAY['営業事務', '管理者'])
  );
