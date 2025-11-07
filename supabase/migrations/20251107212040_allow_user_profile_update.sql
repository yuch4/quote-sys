DROP POLICY IF EXISTS "ユーザープロフィール更新権限" ON public.users;

CREATE POLICY "ユーザープロフィール更新権限" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);