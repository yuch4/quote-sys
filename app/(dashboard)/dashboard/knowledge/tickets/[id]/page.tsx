'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { TicketStatusBadge } from '@/components/knowledge/ticket-status-badge'
import { TicketPriorityBadge } from '@/components/knowledge/ticket-priority-badge'
import { VisibilityBadge } from '@/components/knowledge/visibility-badge'
import { TicketTimeline } from '@/components/knowledge/ticket-timeline'
import { FileUpload, type UploadedFile } from '@/components/knowledge/file-upload'
import {
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS,
  type KnowledgeTicket,
  type TicketStatus,
  type TicketPriority,
  type TicketCategory,
} from '@/types/knowledge'
import {
  ArrowLeft,
  Loader2,
  Send,
  User,
  Building2,
  Calendar,
  Tag,
  Lock,
  Paperclip,
  FileText,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface User {
  id: string
  display_name: string
}

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [ticket, setTicket] = useState<KnowledgeTicket | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [sendingComment, setSendingComment] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [showFileUpload, setShowFileUpload] = useState(false)

  const [newComment, setNewComment] = useState('')
  const [isInternalComment, setIsInternalComment] = useState(false)

  const loadTicket = useCallback(async () => {
    const { data, error } = await supabase
      .from('knowledge_tickets')
      .select(`
        *,
        customer:customers(id, customer_name, email),
        group_company:group_companies(id, company_name),
        assigned_user:users!knowledge_tickets_assigned_to_fkey(id, display_name, email),
        created_by_user:users!knowledge_tickets_created_by_fkey(id, display_name, email),
        comments:ticket_comments(
          *,
          user:users(id, display_name, email),
          attachments:ticket_attachments(*)
        ),
        attachments:ticket_attachments(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Failed to load ticket:', error)
      toast.error('チケットの読み込みに失敗しました')
      return
    }

    // コメントを作成日順にソート
    if (data?.comments) {
      data.comments = data.comments.sort(
        (a: { created_at: string }, b: { created_at: string }) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }

    setTicket(data as KnowledgeTicket)
    setLoading(false)
  }, [supabase, id])

  const loadUsers = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select('id, display_name')
      .eq('is_active', true)
      .order('display_name')

    if (data) setUsers(data)
  }, [supabase])

  useEffect(() => {
    loadTicket()
    loadUsers()
  }, [loadTicket, loadUsers])

  const updateStatus = async (newStatus: TicketStatus) => {
    if (!ticket) return
    setUpdating(true)

    try {
      const updates: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'resolved') {
        updates.resolved_at = new Date().toISOString()
      } else if (newStatus === 'closed') {
        updates.closed_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('knowledge_tickets')
        .update(updates)
        .eq('id', ticket.id)

      if (error) throw error

      toast.success(`ステータスを「${TICKET_STATUS_LABELS[newStatus]}」に更新しました`)
      loadTicket()
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('ステータスの更新に失敗しました')
    } finally {
      setUpdating(false)
    }
  }

  const updateAssignee = async (userId: string | null) => {
    if (!ticket) return
    setUpdating(true)

    try {
      const { error } = await supabase
        .from('knowledge_tickets')
        .update({ assigned_to: userId })
        .eq('id', ticket.id)

      if (error) throw error

      toast.success('担当者を更新しました')
      loadTicket()
    } catch (error) {
      console.error('Failed to update assignee:', error)
      toast.error('担当者の更新に失敗しました')
    } finally {
      setUpdating(false)
    }
  }

  const updatePriority = async (priority: TicketPriority) => {
    if (!ticket) return
    setUpdating(true)

    try {
      const { error } = await supabase
        .from('knowledge_tickets')
        .update({ priority })
        .eq('id', ticket.id)

      if (error) throw error

      toast.success('優先度を更新しました')
      loadTicket()
    } catch (error) {
      console.error('Failed to update priority:', error)
      toast.error('優先度の更新に失敗しました')
    } finally {
      setUpdating(false)
    }
  }

  const addComment = async () => {
    if (!ticket || !newComment.trim()) return
    setSendingComment(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('認証が必要です')

      const { error } = await supabase.from('ticket_comments').insert({
        ticket_id: ticket.id,
        user_id: user.id,
        content: newComment,
        is_internal: isInternalComment,
      })

      if (error) throw error

      toast.success(isInternalComment ? '社内メモを追加しました' : 'コメントを追加しました')
      setNewComment('')
      setIsInternalComment(false)
      loadTicket()
    } catch (error) {
      console.error('Failed to add comment:', error)
      toast.error('コメントの追加に失敗しました')
    } finally {
      setSendingComment(false)
    }
  }

  const handleFileUploadComplete = (file: UploadedFile) => {
    loadTicket()
    setShowFileUpload(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">チケットが見つかりません</p>
        <Link href="/dashboard/knowledge/tickets">
          <Button variant="link">一覧に戻る</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/knowledge/tickets">
            <Button variant="ghost" size="icon" className="mt-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {ticket.ticket_number}
              </span>
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
              <VisibilityBadge visibility={ticket.visibility} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
          </div>
        </div>

        {/* ステータス変更ボタン */}
        <div className="flex gap-2">
          {ticket.status === 'open' && (
            <Button
              variant="outline"
              onClick={() => updateStatus('in_progress')}
              disabled={updating}
            >
              対応開始
            </Button>
          )}
          {ticket.status === 'in_progress' && (
            <>
              <Button
                variant="outline"
                onClick={() => updateStatus('pending')}
                disabled={updating}
              >
                保留
              </Button>
              <Button
                onClick={() => updateStatus('resolved')}
                disabled={updating}
                className="bg-teal-600 hover:bg-teal-700"
              >
                解決
              </Button>
            </>
          )}
          {ticket.status === 'pending' && (
            <Button
              variant="outline"
              onClick={() => updateStatus('in_progress')}
              disabled={updating}
            >
              対応再開
            </Button>
          )}
          {ticket.status === 'resolved' && (
            <>
              <Button
                variant="outline"
                onClick={() => updateStatus('in_progress')}
                disabled={updating}
              >
                再オープン
              </Button>
              <Button
                onClick={() => updateStatus('closed')}
                disabled={updating}
              >
                クローズ
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-6">
          {/* 問い合わせ内容 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">問い合わせ内容</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
                {ticket.description}
              </div>
              
              {/* 添付ファイル */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Paperclip className="h-4 w-4" />
                    添付ファイル ({ticket.attachments.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ticket.attachments.map((file) => (
                      <Button
                        key={file.id}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        {file.file_name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 対応履歴 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">対応履歴</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketTimeline
                comments={ticket.comments || []}
                ticketCreatedAt={ticket.created_at}
                ticketCreatedBy={ticket.created_by_user || { display_name: '不明' }}
              />
            </CardContent>
          </Card>

          {/* コメント追加 */}
          {ticket.status !== 'closed' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">コメント追加</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="コメントを入力..."
                  rows={4}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="internal"
                        checked={isInternalComment}
                        onCheckedChange={(checked) => setIsInternalComment(checked as boolean)}
                      />
                      <label
                        htmlFor="internal"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                      >
                        <Lock className="h-3 w-3" />
                        社内メモ（顧客には非公開）
                      </label>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFileUpload(!showFileUpload)}
                    >
                      <Paperclip className="h-4 w-4 mr-1" />
                      添付
                    </Button>
                  </div>
                  <Button
                    onClick={addComment}
                    disabled={sendingComment || !newComment.trim()}
                  >
                    {sendingComment ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    送信
                  </Button>
                </div>

                {showFileUpload && (
                  <FileUpload
                    ticketId={ticket.id}
                    onUploadComplete={handleFileUploadComplete}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* チケット情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">チケット情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-gray-500">顧客/会社</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">
                    {ticket.customer?.customer_name ||
                      ticket.group_company?.company_name ||
                      '未設定'}
                  </span>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-xs text-gray-500">カテゴリ</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Tag className="h-4 w-4 text-gray-400" />
                  <span>
                    {TICKET_CATEGORY_LABELS[ticket.category as TicketCategory] || ticket.category}
                  </span>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-xs text-gray-500">優先度</Label>
                <Select
                  value={ticket.priority}
                  onValueChange={(value) => updatePriority(value as TicketPriority)}
                  disabled={updating}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <Label className="text-xs text-gray-500">担当者</Label>
                <Select
                  value={ticket.assigned_to || ''}
                  onValueChange={(value) => updateAssignee(value || null)}
                  disabled={updating}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="未割当" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">未割当</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <Label className="text-xs text-gray-500">作成者</Label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{ticket.created_by_user?.display_name || '不明'}</span>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-xs text-gray-500">作成日時</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    {format(new Date(ticket.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                  </span>
                </div>
              </div>

              {ticket.resolved_at && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-xs text-gray-500">解決日時</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-teal-500" />
                      <span className="text-sm text-teal-600">
                        {format(new Date(ticket.resolved_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ナレッジ化ボタン */}
          {(ticket.status === 'resolved' || ticket.status === 'closed') && (
            <Card>
              <CardContent className="pt-6">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/dashboard/knowledge/base/new?from_ticket=${ticket.id}`}>
                    <FileText className="mr-2 h-4 w-4" />
                    ナレッジ化する
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
