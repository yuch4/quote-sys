import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { VisibilityBadge } from '@/components/knowledge/visibility-badge'
import {
  TICKET_CATEGORY_LABELS,
  type TicketCategory,
  type ContentVisibility,
} from '@/types/knowledge'
import {
  ArrowLeft,
  Edit,
  Eye,
  Calendar,
  User,
  LinkIcon,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'

interface PageParams {
  id: string
}

async function getArticle(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('knowledge_base')
    .select(`
      *,
      created_by_user:users!knowledge_base_created_by_fkey(display_name, email),
      updated_by_user:users!knowledge_base_updated_by_fkey(display_name, email)
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  // 閲覧数を増やす
  await supabase
    .from('knowledge_base')
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq('id', id)

  return data
}

async function getRelatedTickets(articleId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('ticket_knowledge_links')
    .select(`
      knowledge_tickets(
        id,
        ticket_number,
        subject,
        status
      )
    `)
    .eq('knowledge_base_id', articleId)
    .limit(5)

  return data?.map((d) => d.knowledge_tickets).filter(Boolean) || []
}

export default async function KnowledgeArticleDetailPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { id } = await params
  const article = await getArticle(id)

  if (!article) {
    notFound()
  }

  const relatedTickets = await getRelatedTickets(id)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/knowledge/base">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {TICKET_CATEGORY_LABELS[article.category as TicketCategory] || article.category}
              </Badge>
              <VisibilityBadge visibility={article.visibility as ContentVisibility} size="sm" />
              {article.is_published ? (
                <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-xs">
                  公開中
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-600 text-xs">
                  下書き
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{article.title}</h1>
          </div>
        </div>
        <Link href={`/dashboard/knowledge/base/${id}/edit`}>
          <Button className="gap-2">
            <Edit className="h-4 w-4" />
            編集
          </Button>
        </Link>
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
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-purple-700">
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
                      <blockquote className="border-l-4 border-purple-300 pl-4 italic text-gray-600 my-4">
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
                <User className="h-4 w-4" />
                <span>作成者: {article.created_by_user?.display_name || '不明'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  作成日:{' '}
                  {format(new Date(article.created_at), 'yyyy/MM/dd', { locale: ja })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>
                  更新日:{' '}
                  {format(new Date(article.updated_at), 'yyyy/MM/dd HH:mm', {
                    locale: ja,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Eye className="h-4 w-4" />
                <span>閲覧数: {article.view_count}</span>
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

          {/* 関連チケット */}
          {relatedTickets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">関連チケット</CardTitle>
                <CardDescription>この記事に紐付けられたチケット</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {relatedTickets.map((ticket: { id: string; ticket_number: string; subject: string; status: string }) => (
                  <Link
                    key={ticket.id}
                    href={`/dashboard/knowledge/tickets/${ticket.id}`}
                    className="block"
                  >
                    <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 transition-colors">
                      <LinkIcon className="h-4 w-4 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {ticket.ticket_number}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {ticket.subject}
                        </p>
                      </div>
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
