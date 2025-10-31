import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default async function ProjectsPage() {
  const supabase = await createClient()
  
  // ログインユーザー情報取得
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user?.id)
    .single()

  // 案件一覧取得（権限に応じてフィルタリング）
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      customer:customers(customer_name),
      sales_rep:users!projects_sales_rep_id_fkey(display_name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
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
          <h1 className="text-3xl font-bold text-gray-900">案件管理</h1>
          <p className="text-gray-600 mt-2">案件の作成・管理</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button>新規案件作成</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>案件一覧</CardTitle>
          <CardDescription>登録されている案件情報</CardDescription>
        </CardHeader>
        <CardContent>
          {projects && projects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>案件番号</TableHead>
                  <TableHead>案件名</TableHead>
                  <TableHead>顧客名</TableHead>
                  <TableHead>営業担当</TableHead>
                  <TableHead>カテゴリ</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.project_number}</TableCell>
                    <TableCell>{project.project_name}</TableCell>
                    <TableCell>{project.customer?.customer_name}</TableCell>
                    <TableCell>{project.sales_rep?.display_name}</TableCell>
                    <TableCell>{project.category}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(project.status)}>
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Link href={`/dashboard/projects/${project.id}`}>
                          <Button variant="outline" size="sm">詳細</Button>
                        </Link>
                        <Link href={`/dashboard/projects/${project.id}/edit`}>
                          <Button variant="outline" size="sm">編集</Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              登録されている案件がありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
