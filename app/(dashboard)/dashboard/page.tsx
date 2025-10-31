import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-600 mt-2">見積システムへようこそ</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>案件数</CardTitle>
            <CardDescription>進行中の案件</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>見積数</CardTitle>
            <CardDescription>今月作成した見積</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>受注額</CardTitle>
            <CardDescription>今月の受注総額</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">¥0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>粗利</CardTitle>
            <CardDescription>今月の粗利総額</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">¥0</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近の活動</CardTitle>
          <CardDescription>直近の案件・見積の更新</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">データがありません</p>
        </CardContent>
      </Card>
    </div>
  )
}
