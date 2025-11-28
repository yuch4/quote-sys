# 🚀 開発クイックスタートガイド

新しく参加した開発者が、すぐに開発を始められるようにするための実践的なガイドです。

---

## 📋 目次

1. [環境構築チェックリスト](#-環境構築チェックリスト)
2. [最初のタスク：動作確認](#-最初のタスク動作確認)
3. [よくある開発タスク](#-よくある開発タスク)
4. [デバッグ方法](#-デバッグ方法)
5. [コミットとプルリクエスト](#-コミットとプルリクエスト)
6. [トラブルシューティング](#-トラブルシューティング)

---

## ✅ 環境構築チェックリスト

開発を始める前に、以下が完了していることを確認してください。

### 必須ツール

- [ ] **Node.js 18以上** がインストールされている
  ```bash
  node --version
  # v18.0.0 以上
  ```

- [ ] **Git** がインストールされている
  ```bash
  git --version
  ```

- [ ] **VS Code** がインストールされている（推奨）

### プロジェクトセットアップ

- [ ] リポジトリをクローンした
  ```bash
  git clone https://github.com/yuch4/quote-sys.git
  cd quote-sys
  ```

- [ ] 依存ライブラリをインストールした
  ```bash
  npm install
  ```

- [ ] `.env.local` ファイルを作成した
  ```bash
  cp .env.example .env.local
  # Supabase接続情報を設定
  ```

- [ ] 開発サーバーが起動できた
  ```bash
  npm run dev
  # http://localhost:3000 でアクセス
  ```

### VS Code 拡張機能（推奨）

- [ ] **ESLint** - コード品質チェック
- [ ] **Tailwind CSS IntelliSense** - クラス名の補完
- [ ] **Prettier** - コードフォーマット
- [ ] **GitLens** - Git履歴の可視化

---

## 🎯 最初のタスク：動作確認

プロジェクトの理解を深めるために、以下の操作を試してみましょう。

### 1. ログインしてみる

1. http://localhost:3000/login にアクセス
2. テストユーザーでログイン（管理者に確認）
3. ダッシュボードが表示されることを確認

### 2. 各画面を確認する

| 画面 | URL | 何ができるか |
|:-----|:----|:-------------|
| ダッシュボード | `/dashboard` | KPI・アラート・最近の活動 |
| 案件一覧 | `/dashboard/projects` | 案件の検索・新規作成 |
| 見積一覧 | `/dashboard/quotes` | 見積の検索・承認状況確認 |
| 発注管理 | `/dashboard/procurement` | 発注・入荷の進捗確認 |
| 計上管理 | `/dashboard/billing` | 計上申請・承認 |
| レポート | `/dashboard/reports` | 売上・粗利分析 |
| 設定 | `/dashboard/settings` | マスタデータ管理 |

### 3. コードを読んでみる

簡単なページから読み始めましょう：

```
app/(dashboard)/dashboard/page.tsx  ← ダッシュボード
```

コンポーネントの読み方：
1. `import` 文でどんな部品を使っているか確認
2. 関数の引数（Props）で何を受け取るか確認
3. `return` 文でどんなUIを返しているか確認

---

## 🔨 よくある開発タスク

### タスク1: 新しいページを追加する

**例**: 「顧客分析」ページを追加

1. フォルダとファイルを作成
```bash
mkdir -p app/\(dashboard\)/dashboard/customer-analysis
touch app/\(dashboard\)/dashboard/customer-analysis/page.tsx
```

2. ページコンポーネントを実装
```tsx
// app/(dashboard)/dashboard/customer-analysis/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function CustomerAnalysisPage() {
  const supabase = await createClient();
  
  // データ取得
  const { data: customers } = await supabase
    .from('customers')
    .select('*');
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">顧客分析</h1>
      
      {/* コンテンツ */}
      <div className="grid gap-4">
        {customers?.map((customer) => (
          <div key={customer.id} className="p-4 bg-white rounded-lg shadow">
            <h2 className="font-medium">{customer.customer_name}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}
```

3. サイドバーにリンクを追加（任意）
```tsx
// components/layout/sidebar.tsx
// ナビゲーション配列に追加
{ label: '顧客分析', href: '/dashboard/customer-analysis', icon: Users }
```

---

### タスク2: コンポーネントを作成する

**例**: ステータスバッジコンポーネント

1. ファイルを作成
```bash
touch components/quotes/quote-status-badge.tsx
```

2. コンポーネントを実装
```tsx
// components/quotes/quote-status-badge.tsx
import { Badge } from '@/components/ui/badge';

type Status = 'draft' | 'pending' | 'approved' | 'rejected';

interface QuoteStatusBadgeProps {
  status: Status;
}

const statusConfig: Record<Status, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: '下書き', variant: 'secondary' },
  pending: { label: '承認待ち', variant: 'default' },
  approved: { label: '承認済み', variant: 'outline' },
  rejected: { label: '却下', variant: 'destructive' },
};

export function QuoteStatusBadge({ status }: QuoteStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}
```

3. 使用する
```tsx
import { QuoteStatusBadge } from '@/components/quotes/quote-status-badge';

<QuoteStatusBadge status={quote.approval_status} />
```

---

### タスク3: フォームを作成する

**例**: 顧客登録フォーム

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// バリデーションスキーマ
const customerSchema = z.object({
  customer_name: z.string().min(1, '顧客名は必須です'),
  email: z.string().email('有効なメールアドレスを入力してください').optional(),
  phone: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export function CustomerForm() {
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });
  
  const onSubmit = async (data: CustomerFormData) => {
    setIsLoading(true);
    try {
      // 保存処理
      await saveCustomer(data);
      toast.success('顧客を登録しました');
    } catch (error) {
      toast.error('登録に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="customer_name">顧客名 *</Label>
        <Input id="customer_name" {...register('customer_name')} />
        {errors.customer_name && (
          <p className="text-red-500 text-sm">{errors.customer_name.message}</p>
        )}
      </div>
      
      <div>
        <Label htmlFor="email">メールアドレス</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && (
          <p className="text-red-500 text-sm">{errors.email.message}</p>
        )}
      </div>
      
      <div>
        <Label htmlFor="phone">電話番号</Label>
        <Input id="phone" {...register('phone')} />
      </div>
      
      <Button type="submit" disabled={isLoading}>
        {isLoading ? '保存中...' : '登録'}
      </Button>
    </form>
  );
}
```

---

### タスク4: APIを呼び出す

**Supabaseからデータ取得（サーバーサイド）**

```tsx
// Server Component
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createClient();
  
  // 単純なクエリ
  const { data: quotes } = await supabase
    .from('quotes')
    .select('*')
    .eq('approval_status', 'approved');
  
  // リレーション付きクエリ
  const { data: quotesWithProject } = await supabase
    .from('quotes')
    .select(`
      *,
      project:projects (
        project_name,
        customer:customers (customer_name)
      )
    `);
  
  // フィルタ・ソート
  const { data: recentQuotes } = await supabase
    .from('quotes')
    .select('*')
    .gte('created_at', '2024-01-01')
    .order('created_at', { ascending: false })
    .limit(10);
}
```

**Supabaseでデータ更新（クライアントサイド）**

```tsx
'use client';

import { createClient } from '@/lib/supabase/client';

async function approveQuote(quoteId: string) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('quotes')
    .update({ 
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', quoteId);
  
  if (error) throw error;
}
```

---

## 🐛 デバッグ方法

### console.log

最も基本的なデバッグ方法：

```tsx
console.log('データ:', data);
console.log('エラー:', error);
console.table(items); // 配列を表形式で表示
```

### React Developer Tools

ブラウザ拡張機能でコンポーネントの状態を確認：
- [Chrome用](https://chrome.google.com/webstore/detail/react-developer-tools/)

### Supabase Dashboard

データベースの状態を確認：
1. https://supabase.com/dashboard にログイン
2. プロジェクトを選択
3. Table Editor でデータを確認

### Network タブ

ブラウザの開発者ツール → Network タブで：
- APIリクエストの内容を確認
- レスポンスのエラーを確認

---

## 📝 コミットとプルリクエスト

### コミットの流れ

```bash
# 1. 変更を確認
git status
git diff

# 2. 変更をステージング
git add .

# 3. コミット（Conventional Commits形式）
git commit -m "feat: 顧客分析ページを追加"

# 4. プッシュ
git push origin feature/customer-analysis
```

### コミットメッセージの例

```bash
# 新機能
git commit -m "feat: 見積検索にステータスフィルターを追加"

# バグ修正
git commit -m "fix: 承認ボタンが押せない問題を修正"

# リファクタリング
git commit -m "refactor: 見積一覧の共通処理を抽出"

# ドキュメント
git commit -m "docs: セットアップ手順を更新"
```

### ブランチ命名規則

```bash
feature/機能名     # 新機能
fix/バグ名         # バグ修正
refactor/対象     # リファクタリング
docs/ドキュメント名 # ドキュメント

# 例
feature/customer-analysis
fix/quote-approval-button
refactor/quote-list
```

---

## 🔧 トラブルシューティング

### 問題: `npm install` が失敗する

```bash
# node_modules と lock ファイルを削除して再実行
rm -rf node_modules package-lock.json
npm install
```

### 問題: 開発サーバーが起動しない

```bash
# ポートが使用中の場合
lsof -i :3000
kill -9 <PID>

# または別のポートで起動
npm run dev -- -p 3001
```

### 問題: Supabaseに接続できない

1. `.env.local` の設定を確認
2. Supabase Dashboard でプロジェクトが起動しているか確認
3. ネットワーク接続を確認

### 問題: 型エラーが発生する

```bash
# TypeScriptのキャッシュをクリア
rm -rf .next
npm run dev
```

### 問題: スタイルが反映されない

```bash
# Tailwindのキャッシュをクリア
rm -rf .next
npm run dev
```

---

## 📚 次のステップ

1. **[オンボーディングガイド](./ONBOARDING.md)** を読んでプロジェクト全体を理解
2. **[プロジェクト構造ガイド](./PROJECT-STRUCTURE.md)** でフォルダ構成を把握
3. **[技術スタックガイド](./TECH-STACK.md)** で使用技術を学習
4. **[要件定義書](./REQUIREMENTS.md)** でビジネス要件を理解
5. **[todo.md](../todo.md)** でタスクを確認して開発開始！

---

**最終更新**: 2025年11月28日
