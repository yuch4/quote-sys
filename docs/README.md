# 見積管理システム（quote-sys）ドキュメント

見積管理システムの技術ドキュメントへようこそ。このディレクトリには、システムの設計、実装、運用に関する包括的なドキュメントが含まれています。

---

## 📚 ドキュメント一覧

### 🚀 はじめに

| ドキュメント | 説明 | 対象者 |
|-------------|------|--------|
| [QUICK-START.md](./QUICK-START.md) | クイックスタートガイド | 新規開発者 |
| [ONBOARDING.md](./ONBOARDING.md) | オンボーディングガイド | 新規メンバー |

### 📋 要件・設計

| ドキュメント | 説明 | 対象者 |
|-------------|------|--------|
| [REQUIREMENTS.md](./REQUIREMENTS.md) | 要件定義書 | 全員 |
| [TECH-STACK.md](./TECH-STACK.md) | 技術スタック詳細 | 開発者 |
| [PROJECT-STRUCTURE.md](./PROJECT-STRUCTURE.md) | プロジェクト構造ガイド | 開発者 |

### 💾 データベース・API

| ドキュメント | 説明 | 対象者 |
|-------------|------|--------|
| [DATABASE-DESIGN.md](./DATABASE-DESIGN.md) | データベース設計書（テーブル定義、ER図、RLS、インデックス） | 開発者 |
| [API-REFERENCE.md](./API-REFERENCE.md) | API仕様書（Server Actions、API Routes） | 開発者 |

### 🔄 ビジネスロジック

| ドキュメント | 説明 | 対象者 |
|-------------|------|--------|
| [BUSINESS-LOGIC.md](./BUSINESS-LOGIC.md) | ビジネスロジック仕様書（承認フロー、発注・入荷、計上、権限） | 開発者・PM |

### 🎨 コンポーネント

| ドキュメント | 説明 | 対象者 |
|-------------|------|--------|
| [COMPONENTS.md](./COMPONENTS.md) | コンポーネント一覧（UI、機能、レイアウト） | フロントエンド開発者 |

### 📄 機能仕様

| ドキュメント | 説明 | 対象者 |
|-------------|------|--------|
| [pdf-generate.md](./pdf-generate.md) | PDF生成仕様 | 開発者 |

### 🧪 テスト

| ドキュメント | 説明 | 対象者 |
|-------------|------|--------|
| [E2E_TEST_REPORT.md](./E2E_TEST_REPORT.md) | E2Eテストレポート | 開発者・QA |

### 📐 機能設計書

`design/` ディレクトリには詳細な機能設計書が含まれています：

| ドキュメント | 説明 |
|-------------|------|
| [design/README.md](./design/README.md) | 設計書一覧 |
| [design/00_システム全体設計.md](./design/00_システム全体設計.md) | システム全体設計 |
| [design/01_認証・認可機能設計.md](./design/01_認証・認可機能設計.md) | 認証・認可機能設計 |
| [design/02_案件管理機能設計.md](./design/02_案件管理機能設計.md) | 案件管理機能設計 |
| [design/03_見積管理機能設計.md](./design/03_見積管理機能設計.md) | 見積管理機能設計 |
| [design/04_発注・入荷管理機能設計.md](./design/04_発注・入荷管理機能設計.md) | 発注・入荷管理機能設計 |
| [design/05-09_その他機能設計.md](./design/05-09_その他機能設計.md) | その他機能設計 |

### 📝 参考資料

| ドキュメント | 説明 |
|-------------|------|
| [見積システムの問題点.md](./見積システムの問題点.md) | 現行システムの課題分析 |

---

## 🗺️ ドキュメントマップ

開発タスクに応じて、以下のドキュメントを参照してください：

### 新規参画時

```
1. QUICK-START.md     → 環境構築
2. ONBOARDING.md      → システム概要の理解
3. PROJECT-STRUCTURE.md → コードベースの理解
4. TECH-STACK.md      → 使用技術の確認
```

### 新機能開発時

```
1. REQUIREMENTS.md    → 要件の確認
2. DATABASE-DESIGN.md → データモデルの理解
3. API-REFERENCE.md   → API設計の確認
4. BUSINESS-LOGIC.md  → ビジネスルールの確認
5. COMPONENTS.md      → UIコンポーネントの選択
```

### バグ修正時

```
1. E2E_TEST_REPORT.md → テスト状況の確認
2. BUSINESS-LOGIC.md  → 期待動作の確認
3. DATABASE-DESIGN.md → データ整合性の確認
4. API-REFERENCE.md   → エンドポイント仕様の確認
```

### PDF機能の開発・修正時

```
1. pdf-generate.md    → PDF生成仕様
2. API-REFERENCE.md   → PDF APIの確認
```

---

## 📖 ドキュメント更新ガイドライン

### 新しいドキュメントを追加する場合

1. 適切なディレクトリに配置する
2. このREADME.mdに追加する
3. 関連ドキュメントからリンクを張る

### 既存ドキュメントを更新する場合

1. 変更日と変更内容を記録する（必要に応じて）
2. 関連ドキュメントの整合性を確認する
3. コードとの整合性を確認する

### 命名規則

- ファイル名はケバブケース（例: `api-reference.md`）
- タイトルは日本語
- 見出しにはMarkdown標準の `#` を使用

---

## 🔗 外部リソース

| リソース | URL |
|----------|-----|
| Next.js ドキュメント | https://nextjs.org/docs |
| Supabase ドキュメント | https://supabase.com/docs |
| Tailwind CSS | https://tailwindcss.com/docs |
| shadcn/ui | https://ui.shadcn.com/ |
| React Hook Form | https://react-hook-form.com/ |
| Zod | https://zod.dev/ |

---

## 📞 サポート

ドキュメントに関する質問や改善提案がある場合は、以下の方法でお問い合わせください：

- GitHub Issues を作成
- プロジェクトの Slack チャンネルで質問

---

*最終更新: 2024年12月*
