-- 通知テーブル作成
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('見積承認', '見積差戻', '計上申請', '計上承認', '計上差戻', '入荷完了', 'その他')),
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- RLS有効化
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: ユーザーは自分の通知のみ参照・更新可能
CREATE POLICY "通知参照権限" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "通知更新権限" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 通知作成は管理者・営業事務のみ（システムから作成するため実際には使わない）
CREATE POLICY "通知作成権限" ON public.notifications
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('営業事務', '管理者')
    )
  );
