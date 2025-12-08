import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TICKET_CATEGORY_LABELS,
  type TicketCategory,
} from '@/types/knowledge'
import { ArrowLeft, Eye, Calendar, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'

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

interface PageParams {
  id: string
}

export default async function PortalKnowledgeDetailPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { id } = await params
  const session = await getPortalSession()

  if (!session) {
    redirect('/portal/login')
  }

  const supabase = await createClient()

  // 顧客向け記事のみ取得
  const { data: article, error } = await supabase
    .from('knowledge_base')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .in('visibility', ['customer', 'public'])
    .single()

  if (error || !article) {
    notFound()
  }

  // 閲覧数を増やす
  await supabase
    .from('knowledge_base')
    .update({ view_count: (article.view_count || 0) + 1 })
    .eq('id', id)

  // 関連記事取得
  const { data: relatedArticles } = await supabase
    .from('knowledge_base')
    .select('id, title, category')
    .eq('is_published', true)
    .in('visibility', ['customer', 'public'])
    .eq('category', article.category)
    .neq('id', id)
    .limit(3)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Link href="/portal/knowledge">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {TICKET_CATEGORY_LABELS[article.category as TicketCategory] || article.category}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{article.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* メインコンテンツ */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="pt-6">
              <div className="prose prose-slate max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold mt-8 mb-4 pb-2 border-b">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-semibold mt-6 mb-3">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-medium mt-4 mb-2">{children}</h3>
                    ),
                    p: ({ children }) => (
                      <p className="mb-4 leading-relaxed">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>
                    ),
                    code: ({ children, className }) => {
                      const isInline = !className
                      return isInline ? (
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-teal-700">
                          {children}
                        </code>
                      ) : (
                        <code className={className}>{children}</code>
                      )
                    },
                    pre: ({ children }) => (
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
                        {children}
                      </pre>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-teal-300 pl-4 italic text-gray-600 my-4">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {article.content}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 記事情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">記事情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  更新日:{' '}
                  {format(new Date(article.updated_at), 'yyyy/MM/dd', {
                    locale: ja,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Eye className="h-4 w-4" />
                <span>閲覧数: {article.view_count + 1}</span>
              </div>
            </CardContent>
          </Card>

          {/* タグ */}
          {article.tags && article.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">タグ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 関連記事 */}
          {relatedArticles && relatedArticles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">関連記事</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    href={`/portal/knowledge/${related.id}`}
                    className="block"
                  >
                    <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 transition-colors">
                      <BookOpen className="h-4 w-4 text-teal-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 line-clamp-2">
                        {related.title}
                      </span>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
