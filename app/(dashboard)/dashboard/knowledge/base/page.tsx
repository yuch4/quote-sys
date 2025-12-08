import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VisibilityBadge } from '@/components/knowledge/visibility-badge'
import {
  TICKET_CATEGORY_LABELS,
  VISIBILITY_LABELS,
  type TicketCategory,
  type ContentVisibility,
} from '@/types/knowledge'
import { Plus, Search, BookOpen, Eye, Calendar, User } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

interface SearchParams {
  category?: string
  visibility?: string
  search?: string
}

export default async function KnowledgeBasePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('knowledge_base')
    .select(`
      *,
      created_by_user:users!knowledge_base_created_by_fkey(display_name)
    `)
    .order('updated_at', { ascending: false })

  if (params.category && params.category !== 'all') {
    query = query.eq('category', params.category)
  }
  if (params.visibility && params.visibility !== 'all') {
    query = query.eq('visibility', params.visibility)
  }
  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,content.ilike.%${params.search}%`)
  }

  const { data: articles, error } = await query

  // 統計
  const { data: stats } = await supabase
    .from('knowledge_base')
    .select('id, is_published, visibility')

  const totalArticles = stats?.length || 0
  const publishedArticles = stats?.filter((a) => a.is_published).length || 0
  const internalArticles = stats?.filter((a) => a.visibility === 'internal').length || 0

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ナレッジベース</h1>
          <p className="text-sm text-gray-500 mt-1">
            対応事例や解決策を記事として管理します
          </p>
        </div>
        <Link href="/dashboard/knowledge/base/new">
          <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4" />
            新規記事作成
          </Button>
        </Link>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">総記事数</CardTitle>
            <BookOpen className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{totalArticles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">公開中</CardTitle>
            <Eye className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{publishedArticles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">社内限定</CardTitle>
            <BookOpen className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{internalArticles}</div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  name="search"
                  placeholder="タイトル、内容で検索..."
                  defaultValue={params.search}
                  className="pl-10"
                />
              </div>
            </div>
            <Select name="category" defaultValue={params.category || 'all'}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="カテゴリ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select name="visibility" defaultValue={params.visibility || 'all'}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="公開範囲" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="secondary">
              <Search className="h-4 w-4 mr-2" />
              検索
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 記事一覧 */}
      {articles && articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/dashboard/knowledge/base/${article.id}`}
            >
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{article.title}</CardTitle>
                    <div className="flex-shrink-0">
                      {article.is_published ? (
                        <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                          公開中
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-600">
                          下書き
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm">
                      {TICKET_CATEGORY_LABELS[article.category as TicketCategory] || article.category}
                    </span>
                    <VisibilityBadge visibility={article.visibility as ContentVisibility} size="sm" />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {article.content.replace(/[#*`]/g, '').substring(0, 150)}...
                  </p>
                  
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {article.tags.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {article.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{article.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {article.created_by_user?.display_name || '不明'}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {article.view_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(article.updated_at), {
                          addSuffix: true,
                          locale: ja,
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">ナレッジ記事がありません</p>
            <Link href="/dashboard/knowledge/base/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                最初の記事を作成
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
