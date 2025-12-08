import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  TICKET_CATEGORY_LABELS,
  type TicketCategory,
} from '@/types/knowledge'
import { Search, BookOpen, ArrowLeft, Eye, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

async function getPortalSession() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('portal_session')?.value

  if (!sessionToken) {
    return null
  }

  const supabase = await createClient()
  
  const { data: session } = await supabase
    .from('customer_portal_sessions')
    .select(`
      *,
      invite:customer_portal_invites(
        customer_id,
        customer:customers(id, name, email, group_company_id)
      )
    `)
    .eq('session_token', sessionToken)
    .gt('expires_at', new Date().toISOString())
    .single()

  return session
}

interface SearchParams {
  category?: string
  search?: string
}

export default async function PortalKnowledgePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const session = await getPortalSession()

  if (!session) {
    redirect('/portal/login')
  }

  const supabase = await createClient()

  let query = supabase
    .from('knowledge_base')
    .select('id, title, content, category, tags, view_count, updated_at')
    .eq('is_published', true)
    .in('visibility', ['customer', 'public'])
    .order('view_count', { ascending: false })

  if (params.category && params.category !== 'all') {
    query = query.eq('category', params.category)
  }
  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,content.ilike.%${params.search}%`)
  }

  const { data: articles } = await query

  // カテゴリ一覧
  const { data: allArticles } = await supabase
    .from('knowledge_base')
    .select('category')
    .eq('is_published', true)
    .in('visibility', ['customer', 'public'])

  const categories = Array.from(new Set(allArticles?.map((a) => a.category) || []))

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Link href="/portal">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ナレッジベース</h1>
          <p className="text-sm text-gray-500 mt-1">
            よくある質問や解決策を確認できます
          </p>
        </div>
      </div>

      {/* 検索・フィルター */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  name="search"
                  placeholder="キーワードで検索..."
                  defaultValue={params.search}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link href={`/portal/knowledge${params.search ? `?search=${params.search}` : ''}`}>
                <Badge
                  variant={!params.category || params.category === 'all' ? 'default' : 'outline'}
                  className="cursor-pointer"
                >
                  すべて
                </Badge>
              </Link>
              {categories.map((category) => (
                <Link
                  key={category}
                  href={`/portal/knowledge?category=${category}${params.search ? `&search=${params.search}` : ''}`}
                >
                  <Badge
                    variant={params.category === category ? 'default' : 'outline'}
                    className="cursor-pointer"
                  >
                    {TICKET_CATEGORY_LABELS[category as TicketCategory] || category}
                  </Badge>
                </Link>
              ))}
            </div>
            <Button type="submit" variant="secondary" className="gap-2">
              <Search className="h-4 w-4" />
              検索
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 記事一覧 */}
      {articles && articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/portal/knowledge/${article.id}`}
            >
              <Card className="h-full hover:border-teal-300 hover:shadow-sm transition-all">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg line-clamp-2">{article.title}</CardTitle>
                  <CardDescription>
                    <Badge variant="outline" className="text-xs">
                      {TICKET_CATEGORY_LABELS[article.category as TicketCategory] || article.category}
                    </Badge>
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
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {article.view_count} 閲覧
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(article.updated_at), {
                        addSuffix: true,
                        locale: ja,
                      })}
                    </span>
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
            <p className="text-gray-500">
              {params.search || params.category
                ? '条件に一致する記事がありません'
                : '公開中の記事はありません'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
