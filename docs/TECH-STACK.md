# 🛠 技術スタック詳細ガイド

このドキュメントでは、見積管理システムで使用している各技術について詳しく説明します。

---

## 📋 目次

1. [フロントエンド](#-フロントエンド)
2. [バックエンド（Supabase）](#-バックエンドsupabase)
3. [外部サービス](#-外部サービス)
4. [開発ツール](#-開発ツール)
5. [技術選定の理由](#-技術選定の理由)

---

## 🎨 フロントエンド

### Next.js 16（App Router）

**役割**: Webアプリケーションフレームワーク

Next.jsは、Reactをベースにしたフルスタックフレームワークです。このプロジェクトでは「App Router」という新しいルーティング方式を使用しています。

#### 主な特徴

| 特徴 | 説明 |
|:-----|:-----|
| **Server Components** | サーバーでレンダリングするコンポーネント。高速な初期表示 |
| **Client Components** | ブラウザで動作するインタラクティブなコンポーネント |
| **ファイルベースルーティング** | フォルダ構造がそのままURLになる |
| **Server Actions** | サーバーサイドの処理を直接呼び出せる |

#### 使用例

```tsx
// Server Component（デフォルト）
// app/(dashboard)/dashboard/quotes/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function QuotesPage() {
  const supabase = await createClient();
  const { data: quotes } = await supabase.from('quotes').select('*');
  
  return <QuoteList quotes={quotes} />;
}
```

```tsx
// Client Component
// components/quotes/approval-actions.tsx
'use client'; // このディレクティブが必要

import { useState } from 'react';

export function ApprovalActions() {
  const [isLoading, setIsLoading] = useState(false);
  // インタラクティブな処理
}
```

#### 参考リンク
- [Next.js 公式ドキュメント](https://nextjs.org/docs)
- [App Router 入門](https://nextjs.org/docs/app)

---

### React 19

**役割**: UIライブラリ

ReactはUIを「コンポーネント」という部品に分けて構築するライブラリです。

#### 主なコンセプト

```tsx
// コンポーネント = 再利用可能なUI部品
function Button({ children, onClick }) {
  return (
    <button onClick={onClick} className="bg-blue-500 text-white px-4 py-2">
      {children}
    </button>
  );
}

// 使用
<Button onClick={handleSubmit}>送信</Button>
```

```tsx
// Hooks = 状態や副作用を管理する関数
import { useState, useEffect } from 'react';

function Counter() {
  // 状態管理
  const [count, setCount] = useState(0);
  
  // 副作用（データ取得など）
  useEffect(() => {
    document.title = `カウント: ${count}`;
  }, [count]);
  
  return (
    <button onClick={() => setCount(count + 1)}>
      {count}回クリック
    </button>
  );
}
```

---

### TypeScript 5

**役割**: 型安全なJavaScript

TypeScriptはJavaScriptに「型」を追加した言語です。コードの安全性と開発効率が向上します。

#### 基本的な使い方

```tsx
// 型を定義
type Quote = {
  id: string;
  quote_number: string;
  total_amount: number;
  status: 'draft' | 'pending' | 'approved';
};

// 関数の引数と戻り値に型を指定
function calculateTax(amount: number): number {
  return amount * 0.1;
}

// コンポーネントのProps型
interface QuoteCardProps {
  quote: Quote;
  onApprove: (id: string) => void;
}

function QuoteCard({ quote, onApprove }: QuoteCardProps) {
  return (
    <div>
      <h2>{quote.quote_number}</h2>
      <button onClick={() => onApprove(quote.id)}>承認</button>
    </div>
  );
}
```

#### このプロジェクトでの型定義

```
types/
├── database.ts     # データベーステーブルの型
└── document-layout.ts
```

---

### Tailwind CSS 4

**役割**: ユーティリティファーストCSSフレームワーク

Tailwind CSSは、クラス名でスタイルを適用するCSSフレームワークです。

#### 基本的な使い方

```tsx
// 従来のCSS
<div className="card">
  <h2 className="card-title">タイトル</h2>
</div>

/* CSS ファイル */
.card { padding: 16px; border-radius: 8px; }
.card-title { font-size: 18px; font-weight: bold; }
```

```tsx
// Tailwind CSS
<div className="p-4 rounded-lg bg-white shadow">
  <h2 className="text-lg font-bold">タイトル</h2>
</div>
```

#### よく使うクラス

| カテゴリ | クラス例 | 意味 |
|:---------|:---------|:-----|
| 余白 | `p-4`, `m-2`, `px-6`, `my-4` | padding, margin |
| サイズ | `w-full`, `h-10`, `max-w-md` | width, height |
| 色 | `bg-blue-500`, `text-gray-700` | 背景色, 文字色 |
| フレックス | `flex`, `justify-center`, `items-center` | Flexbox |
| グリッド | `grid`, `grid-cols-3`, `gap-4` | Grid |
| レスポンシブ | `md:flex`, `lg:grid-cols-4` | ブレークポイント |

#### レスポンシブデザイン

```tsx
// モバイル: 1列、md以上: 2列、lg以上: 4列
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <Card />
  <Card />
  <Card />
  <Card />
</div>
```

---

### shadcn/ui

**役割**: 高品質UIコンポーネント集

shadcn/uiは、Radix UIをベースにした美しいコンポーネントライブラリです。**ライブラリをインストールするのではなく、コードを直接プロジェクトにコピー**します。

#### コンポーネントの追加方法

```bash
# 新しいコンポーネントを追加
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add table
```

追加されたコンポーネントは `components/ui/` に配置されます。

#### 使用例

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>見積一覧</CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog>
          <DialogTrigger asChild>
            <Button>新規作成</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>見積を作成</DialogTitle>
            </DialogHeader>
            {/* フォーム */}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
```

#### 参考リンク
- [shadcn/ui 公式](https://ui.shadcn.com/)

---

### Recharts

**役割**: グラフ・チャートライブラリ

売上推移やランキングなどのグラフを描画します。

#### 使用例

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { month: '1月', sales: 4000000 },
  { month: '2月', sales: 3000000 },
  { month: '3月', sales: 5000000 },
];

function SalesChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="sales" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

### sonner

**役割**: トースト通知

操作結果を画面右下に一時的に表示します。

#### 使用例

```tsx
import { toast } from 'sonner';

function handleSave() {
  try {
    await saveData();
    toast.success('保存しました');
  } catch (error) {
    toast.error('保存に失敗しました');
  }
}

// 情報通知
toast.info('処理中です...');

// カスタム通知
toast('見積が承認されました', {
  description: '見積番号: Q-2024-0001',
  action: {
    label: '詳細を見る',
    onClick: () => router.push('/quotes/xxx'),
  },
});
```

---

## 🗄 バックエンド（Supabase）

Supabaseは「Firebase の代替」として知られるオープンソースのBaaS（Backend as a Service）です。

### 全体構成

```
┌─────────────────────────────────────────┐
│              Supabase                    │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐       │
│  │ PostgreSQL  │  │    Auth     │       │
│  │ (データベース) │  │   (認証)    │       │
│  └─────────────┘  └─────────────┘       │
│                                          │
│  ┌─────────────┐  ┌─────────────┐       │
│  │   Storage   │  │  Realtime   │       │
│  │ (ファイル)   │  │ (リアルタイム)│       │
│  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────┘
```

### PostgreSQL（データベース）

リレーショナルデータベース。SQLでデータを操作します。

```tsx
// Supabaseクライアントでデータ取得
const { data, error } = await supabase
  .from('quotes')
  .select(`
    *,
    project:projects(project_name, customer:customers(customer_name))
  `)
  .eq('approval_status', 'approved')
  .order('created_at', { ascending: false });
```

### Supabase Auth（認証）

メール・パスワードでのログイン機能を提供します。

```tsx
// ログイン
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});

// ログアウト
await supabase.auth.signOut();

// 現在のユーザー取得
const { data: { user } } = await supabase.auth.getUser();
```

### Row Level Security（RLS）

ユーザーごとにアクセスできるデータを制限するセキュリティ機能。

```sql
-- 営業は自分の案件のみ閲覧可能
CREATE POLICY "営業は自分の案件を閲覧" ON projects
  FOR SELECT
  USING (sales_rep_id = auth.uid() OR user_role() IN ('admin', 'office'));
```

### Supabase Storage（ファイル保存）

PDFファイルなどを保存します。

```tsx
// ファイルアップロード
const { data, error } = await supabase.storage
  .from('documents')
  .upload(`quotes/${quote.id}.pdf`, pdfBlob);

// ファイルURL取得
const { data: { publicUrl } } = supabase.storage
  .from('documents')
  .getPublicUrl(`quotes/${quote.id}.pdf`);
```

### Supabase Realtime（リアルタイム更新）

データベースの変更をリアルタイムで検知します。

```tsx
// 通知テーブルの変更を監視
const channel = supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    // 新しい通知を表示
    toast.info(payload.new.title);
  })
  .subscribe();

// クリーンアップ
return () => supabase.removeChannel(channel);
```

---

## 📧 外部サービス

### Resend（メール送信）

見積承認通知などのメールを送信します。

```tsx
// lib/email/resend.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html }) {
  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}
```

### @react-pdf/renderer（PDF生成）

見積書・発注書のPDFを生成します。

```tsx
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30 },
  title: { fontSize: 24, marginBottom: 20 },
});

function QuotePDF({ quote }) {
  return (
    <Document>
      <Page style={styles.page}>
        <Text style={styles.title}>見積書</Text>
        <Text>見積番号: {quote.quote_number}</Text>
        {/* 明細など */}
      </Page>
    </Document>
  );
}

// PDFをBlobとして生成
const blob = await pdf(<QuotePDF quote={quote} />).toBlob();
```

---

## 🔧 開発ツール

### Vitest（単体テスト）

関数やコンポーネントをテストします。

```tsx
// utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency } from './utils';

describe('formatCurrency', () => {
  it('金額をカンマ区切りでフォーマットする', () => {
    expect(formatCurrency(1000000)).toBe('¥1,000,000');
  });
});
```

```bash
# テスト実行
npm run test

# UIモードで実行
npm run test:ui
```

### Playwright（E2Eテスト）

ブラウザを自動操作してテストします。

```tsx
// e2e/quote-creation.spec.ts
import { test, expect } from '@playwright/test';

test('見積を作成できる', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  await page.goto('/dashboard/quotes/new');
  await page.fill('[name="subject"]', 'テスト見積');
  await page.click('button:has-text("保存")');
  
  await expect(page.locator('text=見積を作成しました')).toBeVisible();
});
```

```bash
# E2Eテスト実行
npm run test:e2e

# UIモードで実行
npm run test:e2e:ui
```

### ESLint（静的解析）

コードの問題を自動検出します。

```bash
npm run lint
```

---

## 💡 技術選定の理由

| 技術 | 選定理由 |
|:-----|:---------|
| **Next.js** | React Server Componentsで高速、App Routerで直感的なルーティング |
| **Supabase** | PostgreSQL + 認証 + Storage + Realtimeがオールインワン、RLSで強力なセキュリティ |
| **TypeScript** | 型安全性による開発効率向上、エディタ補完の強化 |
| **Tailwind CSS** | 高速なスタイリング、一貫したデザインシステム |
| **shadcn/ui** | 美しいUI、カスタマイズ可能、アクセシビリティ対応 |
| **Resend** | シンプルなAPI、高い配信率 |

---

## 📚 学習リソース

### 必須
- [Next.js チュートリアル](https://nextjs.org/learn)
- [React 公式ドキュメント](https://react.dev/)
- [TypeScript ハンドブック](https://www.typescriptlang.org/docs/handbook/)

### 推奨
- [Supabase チュートリアル](https://supabase.com/docs/guides)
- [Tailwind CSS ドキュメント](https://tailwindcss.com/docs)
- [shadcn/ui コンポーネント一覧](https://ui.shadcn.com/docs/components)

---

**最終更新**: 2025年11月29日
