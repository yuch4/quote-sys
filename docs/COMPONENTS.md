# コンポーネント一覧

本ドキュメントでは、見積管理システム（quote-sys）で使用されているコンポーネントを説明します。

## 目次

- [概要](#概要)
- [UIコンポーネント](#uiコンポーネント)
- [機能コンポーネント](#機能コンポーネント)
- [レイアウトコンポーネント](#レイアウトコンポーネント)
- [使用例](#使用例)

---

## 概要

### コンポーネント構成

```
components/
├── ui/                    # 汎用UIコンポーネント（shadcn/ui ベース）
├── layout/                # レイアウト関連
├── departments/           # 部門管理
├── knowledge/             # ナレッジ・チケット管理
├── notifications/         # 通知
├── procurement/           # 調達管理
├── profile/               # プロフィール
├── projects/              # 案件管理
├── purchase-orders/       # 発注書管理
├── quotes/                # 見積管理
└── settings/              # 設定画面
```

### 技術基盤

| ライブラリ | 用途 |
|------------|------|
| **Radix UI** | アクセシブルなヘッドレスUIコンポーネント |
| **Tailwind CSS** | ユーティリティファーストなスタイリング |
| **class-variance-authority** | バリアント管理 |
| **Lucide React** | アイコン |
| **React Hook Form** | フォーム管理 |
| **Zod** | バリデーション |

---

## UIコンポーネント

`components/ui/` ディレクトリには、[shadcn/ui](https://ui.shadcn.com/) をベースにした再利用可能なUIコンポーネントが配置されています。

### アコーディオン (accordion.tsx)

折りたたみ可能なコンテンツセクションを表示します。

```tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>セクション1</AccordionTrigger>
    <AccordionContent>
      セクション1の内容です。
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

---

### アラートダイアログ (alert-dialog.tsx)

確認ダイアログを表示します。削除操作などの確認に使用。

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">削除</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
      <AlertDialogDescription>
        この操作は取り消せません。
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>キャンセル</AlertDialogCancel>
      <AlertDialogAction>削除する</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### アバター (avatar.tsx)

ユーザーのプロフィール画像を表示します。

```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

<Avatar>
  <AvatarImage src="/avatars/user.jpg" alt="ユーザー名" />
  <AvatarFallback>UN</AvatarFallback>
</Avatar>
```

---

### バッジ (badge.tsx)

ステータスやカテゴリを表すラベルを表示します。

**バリアント:**
- `default` - デフォルト
- `secondary` - セカンダリ
- `destructive` - 削除・エラー
- `outline` - アウトライン

```tsx
import { Badge } from "@/components/ui/badge"

<Badge>新規</Badge>
<Badge variant="secondary">進行中</Badge>
<Badge variant="destructive">エラー</Badge>
<Badge variant="outline">完了</Badge>
```

---

### ボタン (button.tsx)

アクションを実行するボタンを表示します。

**バリアント:**
- `default` - プライマリボタン
- `destructive` - 削除ボタン
- `outline` - アウトラインボタン
- `secondary` - セカンダリボタン
- `ghost` - ゴーストボタン
- `link` - リンクスタイル

**サイズ:**
- `default` - デフォルト
- `sm` - 小
- `lg` - 大
- `icon` - アイコンのみ

```tsx
import { Button } from "@/components/ui/button"

<Button>保存</Button>
<Button variant="destructive">削除</Button>
<Button variant="outline">キャンセル</Button>
<Button size="sm">小ボタン</Button>
<Button size="icon"><Icon /></Button>
```

---

### カレンダー (calendar.tsx)

日付選択用のカレンダーを表示します。

```tsx
import { Calendar } from "@/components/ui/calendar"
import { useState } from "react"

function CalendarDemo() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  
  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
    />
  )
}
```

---

### カード (card.tsx)

コンテンツをカード形式で表示します。

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>カードタイトル</CardTitle>
    <CardDescription>カードの説明文</CardDescription>
  </CardHeader>
  <CardContent>
    <p>カードの本文内容</p>
  </CardContent>
  <CardFooter>
    <Button>アクション</Button>
  </CardFooter>
</Card>
```

---

### チェックボックス (checkbox.tsx)

チェックボックス入力を表示します。

```tsx
import { Checkbox } from "@/components/ui/checkbox"

<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <label htmlFor="terms">利用規約に同意する</label>
</div>
```

---

### 日付ピッカー (date-picker.tsx)

日付選択用のポップオーバー付きカレンダーを表示します。

```tsx
import { DatePicker } from "@/components/ui/date-picker"

<DatePicker
  date={selectedDate}
  onSelect={setSelectedDate}
  placeholder="日付を選択"
/>
```

---

### ダイアログ (dialog.tsx)

モーダルダイアログを表示します。

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button>ダイアログを開く</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>ダイアログタイトル</DialogTitle>
      <DialogDescription>
        ダイアログの説明文
      </DialogDescription>
    </DialogHeader>
    <div>ダイアログの内容</div>
  </DialogContent>
</Dialog>
```

---

### ドロップダウンメニュー (dropdown-menu.tsx)

ドロップダウンメニューを表示します。

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost">メニュー</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>操作</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>編集</DropdownMenuItem>
    <DropdownMenuItem>複製</DropdownMenuItem>
    <DropdownMenuItem className="text-destructive">削除</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### フォーム (form.tsx)

React Hook Form と Zod を組み合わせたフォームコンポーネント。

```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const formSchema = z.object({
  name: z.string().min(2, "2文字以上で入力してください"),
})

function MyForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>名前</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                表示名を入力してください
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">送信</Button>
      </form>
    </Form>
  )
}
```

---

### インプット (input.tsx)

テキスト入力フィールドを表示します。

```tsx
import { Input } from "@/components/ui/input"

<Input type="text" placeholder="入力してください" />
<Input type="email" placeholder="メールアドレス" />
<Input type="password" placeholder="パスワード" />
<Input disabled placeholder="無効" />
```

---

### ラベル (label.tsx)

フォームフィールドのラベルを表示します。

```tsx
import { Label } from "@/components/ui/label"

<Label htmlFor="email">メールアドレス</Label>
<Input id="email" type="email" />
```

---

### ページネーション (pagination.tsx)

ページナビゲーションを表示します。

```tsx
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious href="#" />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">1</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#" isActive>2</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">3</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationNext href="#" />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

---

### ポップオーバー (popover.tsx)

ポップオーバーを表示します。

```tsx
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">詳細</Button>
  </PopoverTrigger>
  <PopoverContent>
    ポップオーバーの内容
  </PopoverContent>
</Popover>
```

---

### プログレス (progress.tsx)

進捗状況を表示します。

```tsx
import { Progress } from "@/components/ui/progress"

<Progress value={60} />
```

---

### スクロールエリア (scroll-area.tsx)

スクロール可能な領域を提供します。

```tsx
import { ScrollArea } from "@/components/ui/scroll-area"

<ScrollArea className="h-72 w-48 rounded-md border">
  <div className="p-4">
    {items.map((item) => (
      <div key={item.id}>{item.name}</div>
    ))}
  </div>
</ScrollArea>
```

---

### セレクト (select.tsx)

ドロップダウン選択を表示します。

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

<Select>
  <SelectTrigger>
    <SelectValue placeholder="選択してください" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">オプション1</SelectItem>
    <SelectItem value="option2">オプション2</SelectItem>
    <SelectItem value="option3">オプション3</SelectItem>
  </SelectContent>
</Select>
```

---

### セパレーター (separator.tsx)

区切り線を表示します。

```tsx
import { Separator } from "@/components/ui/separator"

<div>上のコンテンツ</div>
<Separator className="my-4" />
<div>下のコンテンツ</div>
```

---

### シート (sheet.tsx)

サイドから表示されるパネルを表示します。

```tsx
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

<Sheet>
  <SheetTrigger asChild>
    <Button>メニュー</Button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>シートタイトル</SheetTitle>
      <SheetDescription>
        シートの説明
      </SheetDescription>
    </SheetHeader>
    <div>シートの内容</div>
  </SheetContent>
</Sheet>
```

---

### スケルトン (skeleton.tsx)

ローディング時のプレースホルダーを表示します。

```tsx
import { Skeleton } from "@/components/ui/skeleton"

<div className="flex items-center space-x-4">
  <Skeleton className="h-12 w-12 rounded-full" />
  <div className="space-y-2">
    <Skeleton className="h-4 w-[250px]" />
    <Skeleton className="h-4 w-[200px]" />
  </div>
</div>
```

---

### スライダー (slider.tsx)

スライダー入力を表示します。

```tsx
import { Slider } from "@/components/ui/slider"

<Slider
  defaultValue={[50]}
  max={100}
  step={1}
/>
```

---

### スイッチ (switch.tsx)

オン/オフの切り替えを表示します。

```tsx
import { Switch } from "@/components/ui/switch"

<div className="flex items-center space-x-2">
  <Switch id="notifications" />
  <Label htmlFor="notifications">通知を有効にする</Label>
</div>
```

---

### テーブル (table.tsx)

データテーブルを表示します。

```tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

<Table>
  <TableCaption>商品一覧</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>商品名</TableHead>
      <TableHead>価格</TableHead>
      <TableHead>在庫</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {products.map((product) => (
      <TableRow key={product.id}>
        <TableCell>{product.name}</TableCell>
        <TableCell>{product.price}</TableCell>
        <TableCell>{product.stock}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

### タブ (tabs.tsx)

タブ切り替えを表示します。

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">概要</TabsTrigger>
    <TabsTrigger value="details">詳細</TabsTrigger>
    <TabsTrigger value="history">履歴</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">概要の内容</TabsContent>
  <TabsContent value="details">詳細の内容</TabsContent>
  <TabsContent value="history">履歴の内容</TabsContent>
</Tabs>
```

---

### テキストエリア (textarea.tsx)

複数行のテキスト入力を表示します。

```tsx
import { Textarea } from "@/components/ui/textarea"

<Textarea placeholder="備考を入力" rows={4} />
```

---

### トグル (toggle.tsx)

トグルボタンを表示します。

```tsx
import { Toggle } from "@/components/ui/toggle"
import { Bold } from "lucide-react"

<Toggle aria-label="太字">
  <Bold className="h-4 w-4" />
</Toggle>
```

---

## 機能コンポーネント

### 見積関連 (quotes/)

| コンポーネント | ファイル | 説明 |
|----------------|----------|------|
| ApprovalActions | approval-actions.tsx | 見積承認・却下のアクションボタン |
| PDFGenerateButton | pdf-generate-button.tsx | PDF生成ボタン |
| PurchaseOrderDialog | purchase-order-dialog.tsx | 発注書作成ダイアログ |
| QuoteBillingPlan | quote-billing-plan.tsx | 見積の計上計画 |
| QuoteCostPlan | quote-cost-plan.tsx | 見積の原価計画 |
| QuoteFilters | quote-filters.tsx | 見積一覧のフィルター |
| QuotePDF | quote-pdf.tsx | 見積PDF表示 |
| VersionHistory | version-history.tsx | バージョン履歴表示 |

---

### 発注関連 (purchase-orders/)

| コンポーネント | ファイル | 説明 |
|----------------|----------|------|
| PurchaseOrderApprovalActions | purchase-order-approval-actions.tsx | 発注承認アクション |
| PurchaseOrderCreateDialog | purchase-order-create-dialog.tsx | 発注書新規作成ダイアログ |
| PurchaseOrderEditDialog | purchase-order-edit-dialog.tsx | 発注書編集ダイアログ |
| PurchaseOrderPDFButton | purchase-order-pdf-button.tsx | 発注書PDF生成ボタン |
| PurchaseOrderTable | purchase-order-table.tsx | 発注書一覧テーブル |

---

### 案件関連 (projects/)

| コンポーネント | ファイル | 説明 |
|----------------|----------|------|
| BillingSchedulePlanner | billing-schedule-planner.tsx | 計上スケジュール計画 |
| CostSchedulePlanner | cost-schedule-planner.tsx | 原価スケジュール計画 |
| ProjectActivityEntry | project-activity-entry.tsx | 活動記録入力 |
| ProjectFilters | project-filters.tsx | 案件一覧のフィルター |
| ProjectKanban | project-kanban.tsx | カンバン形式の案件表示 |

---

### 調達関連 (procurement/)

| コンポーネント | ファイル | 説明 |
|----------------|----------|------|
| ActivityTimeline | activity-timeline.tsx | 活動タイムライン |
| AlertReminder | alert-reminder.tsx | アラートリマインダー |
| ProjectActivityForm | project-activity-form.tsx | 活動記録フォーム |

---

### ナレッジ関連 (knowledge/)

| コンポーネント | ファイル | 説明 |
|----------------|----------|------|
| FilePreview | file-preview.tsx | ファイルプレビュー |
| FileUpload | file-upload.tsx | ファイルアップロード |
| RichTextEditor | rich-text-editor.tsx | リッチテキストエディタ（Tiptap） |
| TicketPriorityBadge | ticket-priority-badge.tsx | チケット優先度バッジ |
| TicketStatusBadge | ticket-status-badge.tsx | チケットステータスバッジ |
| TicketTimeline | ticket-timeline.tsx | チケットタイムライン |
| VisibilityBadge | visibility-badge.tsx | 公開範囲バッジ |

---

### 設定関連 (settings/)

| コンポーネント | ファイル | 説明 |
|----------------|----------|------|
| DepartmentManager | department-manager.tsx | 部門管理 |
| DocumentLayoutEditor | document-layout-editor.tsx | 帳票レイアウト編集 |
| GroupCompanyManager | group-company-manager.tsx | グループ会社管理 |
| GroupSystemInsights | group-system-insights.tsx | システム利用状況分析 |
| LayoutPreview | layout-preview.tsx | レイアウトプレビュー |
| TemplateSettingsForm | template-settings-form.tsx | テンプレート設定フォーム |
| VendorConsolidationSimulator | vendor-consolidation-simulator.tsx | ベンダー統合シミュレーター |
| VisualLayoutEditor | visual-layout-editor.tsx | ビジュアルレイアウト編集 |

---

### 通知 (notifications/)

| コンポーネント | ファイル | 説明 |
|----------------|----------|------|
| NotificationBell | notification-bell.tsx | 通知ベル（未読件数表示） |

---

### プロフィール (profile/)

| コンポーネント | ファイル | 説明 |
|----------------|----------|------|
| ProfileForm | profile-form.tsx | プロフィール編集フォーム |

---

### 部門 (departments/)

| コンポーネント | ファイル | 説明 |
|----------------|----------|------|
| DepartmentSelect | department-select.tsx | 部門選択セレクト |

---

## レイアウトコンポーネント

`components/layout/` ディレクトリには、アプリケーション全体のレイアウトを構成するコンポーネントが配置されています。

| コンポーネント | ファイル | 説明 |
|----------------|----------|------|
| Sidebar | sidebar.tsx | サイドバーナビゲーション |
| MobileSidebar | mobile-sidebar.tsx | モバイル用サイドバー |
| BreadcrumbNav | breadcrumb-nav.tsx | パンくずナビゲーション |
| Breadcrumb | breadcrumb.tsx | パンくず基底コンポーネント |
| UserMenu | user-menu.tsx | ユーザーメニュー |

---

## 使用例

### 案件詳細ページの例

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectFilters } from "@/components/projects/project-filters"
import { BillingSchedulePlanner } from "@/components/projects/billing-schedule-planner"

export default function ProjectDetailPage({ project }) {
  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{project.project_name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {project.project_number}
            </p>
          </div>
          <Badge>{project.status}</Badge>
        </CardHeader>
      </Card>

      {/* タブコンテンツ */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="quotes">見積</TabsTrigger>
          <TabsTrigger value="billing">計上</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="pt-6">
              {/* 概要情報 */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          {/* 見積一覧 */}
        </TabsContent>

        <TabsContent value="billing">
          <BillingSchedulePlanner projectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

---

### フォーム入力の例

```tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DepartmentSelect } from "@/components/departments/department-select"

const projectSchema = z.object({
  project_name: z.string().min(1, "案件名は必須です"),
  customer_id: z.string().uuid("顧客を選択してください"),
  category: z.string().min(1, "カテゴリを選択してください"),
  department: z.string().min(1, "部門を選択してください"),
  notes: z.string().optional(),
})

export function ProjectForm() {
  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      project_name: "",
      customer_id: "",
      category: "",
      department: "",
      notes: "",
    },
  })

  const onSubmit = async (data: z.infer<typeof projectSchema>) => {
    // 送信処理
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="project_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>案件名</FormLabel>
              <FormControl>
                <Input placeholder="案件名を入力" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>カテゴリ</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリを選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="hardware">ハードウェア</SelectItem>
                  <SelectItem value="software">ソフトウェア</SelectItem>
                  <SelectItem value="service">サービス</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>部門</FormLabel>
              <FormControl>
                <DepartmentSelect
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>備考</FormLabel>
              <FormControl>
                <Textarea placeholder="備考を入力" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">保存</Button>
      </form>
    </Form>
  )
}
```

---

## 関連ドキュメント

- [TECH-STACK.md](./TECH-STACK.md) - 技術スタック詳細
- [PROJECT-STRUCTURE.md](./PROJECT-STRUCTURE.md) - プロジェクト構造ガイド
- [shadcn/ui ドキュメント](https://ui.shadcn.com/) - UIコンポーネントリファレンス
