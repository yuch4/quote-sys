import { createClient } from '@/lib/supabase/server'
import type {
  KnowledgeTicket,
  TicketComment,
  CreateTicketInput,
  UpdateTicketInput,
  CreateCommentInput,
  TicketFilters,
  TicketAnalytics,
} from '@/types/knowledge'

// チケット一覧取得
export async function getTickets(filters?: TicketFilters) {
  const supabase = await createClient()

  let query = supabase
    .from('knowledge_tickets')
    .select(`
      *,
      customer:customers(id, customer_name, email),
      group_company:group_companies(id, company_name),
      assigned_user:users!knowledge_tickets_assigned_to_fkey(id, display_name, email),
      created_by_user:users!knowledge_tickets_created_by_fkey(id, display_name, email)
    `)
    .order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters?.priority && filters.priority !== 'all') {
    query = query.eq('priority', filters.priority)
  }
  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }
  if (filters?.customer_id) {
    query = query.eq('customer_id', filters.customer_id)
  }
  if (filters?.group_company_id) {
    query = query.eq('group_company_id', filters.group_company_id)
  }
  if (filters?.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to)
  }
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return data as KnowledgeTicket[]
}

// チケット詳細取得
export async function getTicket(id: string) {
  const supabase = await createClient()

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

  if (error) throw error

  // コメントを作成日順にソート
  if (data?.comments) {
    data.comments = data.comments.sort(
      (a: TicketComment, b: TicketComment) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }

  return data as KnowledgeTicket
}

// チケット作成
export async function createTicket(input: CreateTicketInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('認証が必要です')

  const { data, error } = await supabase
    .from('knowledge_tickets')
    .insert({
      ...input,
      created_by: user.id,
    })
    .select(`
      *,
      customer:customers(id, customer_name, email)
    `)
    .single()

  if (error) throw error
  return data as KnowledgeTicket
}

// チケット更新
export async function updateTicket(id: string, input: UpdateTicketInput) {
  const supabase = await createClient()

  // ステータス変更時の日時更新
  const updates: Record<string, unknown> = { ...input }
  if (input.status === 'resolved') {
    updates.resolved_at = new Date().toISOString()
  } else if (input.status === 'closed') {
    updates.closed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('knowledge_tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as KnowledgeTicket
}

// コメント追加
export async function addComment(input: CreateCommentInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('認証が必要です')

  const { data, error } = await supabase
    .from('ticket_comments')
    .insert({
      ...input,
      user_id: user.id,
    })
    .select(`
      *,
      user:users(id, display_name, email)
    `)
    .single()

  if (error) throw error
  return data as TicketComment
}

// 顧客別チケット取得（ポータル用）
export async function getCustomerTickets(customerId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('knowledge_tickets')
    .select(`
      *,
      assigned_user:users!knowledge_tickets_assigned_to_fkey(id, display_name)
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as KnowledgeTicket[]
}

// チケット統計取得
export async function getTicketStats() {
  const supabase = await createClient()

  const { data: tickets, error } = await supabase
    .from('knowledge_tickets')
    .select('id, status, priority, category, customer_id, group_company_id, created_at, resolved_at')

  if (error) throw error

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    pending: tickets.filter(t => t.status === 'pending').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
    urgent: tickets.filter(t => t.priority === 'urgent').length,
    high: tickets.filter(t => t.priority === 'high').length,
  }

  return stats
}

// 分析データ取得
export async function getTicketAnalytics(): Promise<TicketAnalytics> {
  const supabase = await createClient()

  // 全チケット取得
  const { data: tickets, error: ticketsError } = await supabase
    .from('knowledge_tickets')
    .select(`
      *,
      customer:customers(id, customer_name),
      group_company:group_companies(id, company_name)
    `)

  if (ticketsError) throw ticketsError

  // 平均解決時間計算（時間単位）
  const resolvedTickets = tickets.filter(t => t.resolved_at)
  const avgResolutionTime = resolvedTickets.length > 0
    ? resolvedTickets.reduce((sum, t) => {
        const created = new Date(t.created_at).getTime()
        const resolved = new Date(t.resolved_at!).getTime()
        return sum + (resolved - created) / (1000 * 60 * 60)
      }, 0) / resolvedTickets.length
    : 0

  // カテゴリ別集計
  const categoryCount: Record<string, number> = {}
  tickets.forEach(t => {
    categoryCount[t.category] = (categoryCount[t.category] || 0) + 1
  })

  // 優先度別集計
  const priorityCount: Record<string, number> = {}
  tickets.forEach(t => {
    priorityCount[t.priority] = (priorityCount[t.priority] || 0) + 1
  })

  // 会社別集計
  const companyCount: Record<string, { name: string; count: number }> = {}
  tickets.forEach(t => {
    if (t.customer) {
      const id = t.customer.id
      if (!companyCount[id]) {
        companyCount[id] = { name: t.customer.customer_name, count: 0 }
      }
      companyCount[id].count++
    } else if (t.group_company) {
      const id = t.group_company.id
      if (!companyCount[id]) {
        companyCount[id] = { name: t.group_company.company_name, count: 0 }
      }
      companyCount[id].count++
    }
  })

  // 日別集計（過去30日）
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const dailyCount: Record<string, number> = {}
  tickets
    .filter(t => new Date(t.created_at) >= thirtyDaysAgo)
    .forEach(t => {
      const date = t.created_at.split('T')[0]
      dailyCount[date] = (dailyCount[date] || 0) + 1
    })

  return {
    total_tickets: tickets.length,
    open_tickets: tickets.filter(t => t.status === 'open').length,
    in_progress_tickets: tickets.filter(t => t.status === 'in_progress').length,
    resolved_tickets: tickets.filter(t => t.status === 'resolved').length,
    closed_tickets: tickets.filter(t => t.status === 'closed').length,
    average_resolution_time_hours: Math.round(avgResolutionTime * 10) / 10,
    tickets_by_category: Object.entries(categoryCount).map(([category, count]) => ({
      category: category as any,
      count,
    })),
    tickets_by_priority: Object.entries(priorityCount).map(([priority, count]) => ({
      priority: priority as any,
      count,
    })),
    tickets_by_company: Object.entries(companyCount)
      .map(([company_id, { name, count }]) => ({ company_id, company_name: name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    tickets_over_time: Object.entries(dailyCount)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }
}
