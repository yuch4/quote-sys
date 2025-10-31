import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      customer:customers(*),
      sales_rep:users!projects_sales_rep_id_fkey(*)
    `)
    .eq('id', params.id)
    .single()

  if (error || !project) {
    notFound()
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case '見積中': return 'secondary'
      case '受注': return 'default'
      case '失注': return 'destructive'
      case 'キャンセル': return 'outline'
      default: return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">案件詳細</h1>
          <p className="text-gray-600 mt-2">{project.project_number}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/projects/${project.id}/edit`}>
            <Button variant="outline">編集</Button>
          </Link>
          <Link href="/dashboard/projects">
            <Button variant="outline">一覧に戻る</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">案件番号</p>
              <p className="text-lg">{project.project_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">ステータス</p>
              <Badge variant={getStatusBadgeVariant(project.status)} className="mt-1">
                {project.status}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">案件名</p>
            <p className="text-lg">{project.project_name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">カテゴリ</p>
              <p className="text-lg">{project.category}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">部門</p>
              <p className="text-lg">{project.department}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">営業担当</p>
            <p className="text-lg">{project.sales_rep?.display_name}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>顧客情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500">顧客名</p>
            <p className="text-lg">{project.customer?.customer_name}</p>
          </div>

          {project.customer?.contact_person && (
            <div>
              <p className="text-sm font-medium text-gray-500">担当者</p>
              <p className="text-lg">{project.customer.contact_person}</p>
            </div>
          )}

          {project.customer?.phone && (
            <div>
              <p className="text-sm font-medium text-gray-500">電話番号</p>
              <p className="text-lg">{project.customer.phone}</p>
            </div>
          )}

          {project.customer?.email && (
            <div>
              <p className="text-sm font-medium text-gray-500">メールアドレス</p>
              <p className="text-lg">{project.customer.email}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>見積一覧</CardTitle>
            <Link href={`/dashboard/quotes/new?project_id=${project.id}`}>
              <Button>見積作成</Button>
            </Link>
          </div>
          <CardDescription>この案件に紐づく見積</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-8">
            見積がまだ作成されていません
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
