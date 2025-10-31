import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">設定</h1>
        <p className="text-gray-600 mt-2">マスタデータの管理</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/settings/customers">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>顧客マスタ</CardTitle>
              <CardDescription>顧客情報の管理</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                顧客の登録・編集・削除
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/settings/suppliers">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>仕入先マスタ</CardTitle>
              <CardDescription>仕入先情報の管理</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                仕入先の登録・編集・削除
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/settings/users">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>ユーザー管理</CardTitle>
              <CardDescription>システムユーザーの管理</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                ユーザーの登録・編集・権限設定
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
