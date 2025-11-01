import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import Link from 'next/link'

const ITEMS_PER_PAGE = 20

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const supabase = await createClient()
  
  const currentPage = Number(searchParams.page) || 1
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  // ログインユーザー情報取得
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user?.id)
    .single()

  // 総件数を取得
  const { count: totalCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })

  const totalPages = totalCount ? Math.ceil(totalCount / ITEMS_PER_PAGE) : 0

  // 案件一覧取得（権限に応じてフィルタリング）
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      customer:customers(customer_name),
      sales_rep:users!projects_sales_rep_id_fkey(display_name)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + ITEMS_PER_PAGE - 1)

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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">案件管理</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">案件の作成・管理</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button className="w-full sm:w-auto">新規案件作成</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>案件一覧</CardTitle>
          <CardDescription>
            登録されている案件情報（全{totalCount}件）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {projects && projects.length > 0 ? (
            <>
            {/* デスクトップ: テーブル表示 */}
            <div className="hidden md:block">
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
            </div>

            {/* モバイル: カード表示 */}
            <div className="md:hidden space-y-4">
              {projects.map((project) => (
                <Card key={project.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{project.project_number}</p>
                          <p className="text-sm text-gray-600 mt-1">{project.project_name}</p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(project.status)}>
                          {project.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">顧客</span>
                          <span className="font-medium">{project.customer?.customer_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">営業担当</span>
                          <span className="font-medium">{project.sales_rep?.display_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">カテゴリ</span>
                          <span className="font-medium">{project.category}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Link href={`/dashboard/projects/${project.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">詳細</Button>
                        </Link>
                        <Link href={`/dashboard/projects/${project.id}/edit`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">編集</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href={`?page=${Math.max(1, currentPage - 1)}`}
                        aria-disabled={currentPage === 1}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === 2 ||
                        page === totalPages - 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href={`?page=${page}`}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <span className="px-4">...</span>
                          </PaginationItem>
                        )
                      }
                      return null
                    })}
                    
                    <PaginationItem>
                      <PaginationNext
                        href={`?page=${Math.min(totalPages, currentPage + 1)}`}
                        aria-disabled={currentPage === totalPages}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
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
