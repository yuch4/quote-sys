import { createClient } from '@/lib/supabase/server'
import type {
  KnowledgeBase,
  CreateKnowledgeInput,
  UpdateKnowledgeInput,
  KnowledgeFilters,
} from '@/types/knowledge'

// ナレッジ一覧取得
export async function getKnowledgeArticles(filters?: KnowledgeFilters) {
  const supabase = await createClient()

  let query = supabase
    .from('knowledge_base')
    .select(`
      *,
      created_by_user:users!knowledge_base_created_by_fkey(id, display_name)
    `)
    .order('updated_at', { ascending: false })

  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }
  if (filters?.visibility && filters.visibility !== 'all') {
    query = query.eq('visibility', filters.visibility)
  }
  if (filters?.is_published !== undefined) {
    query = query.eq('is_published', filters.is_published)
  }
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
  }
  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags)
  }

  const { data, error } = await query

  if (error) throw error
  return data as KnowledgeBase[]
}

// ナレッジ詳細取得
export async function getKnowledgeArticle(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('knowledge_base')
    .select(`
      *,
      created_by_user:users!knowledge_base_created_by_fkey(id, display_name)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as KnowledgeBase
}

// ナレッジ作成
export async function createKnowledgeArticle(input: CreateKnowledgeInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('認証が必要です')

  const { data, error } = await supabase
    .from('knowledge_base')
    .insert({
      ...input,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error
  return data as KnowledgeBase
}

// ナレッジ更新
export async function updateKnowledgeArticle(id: string, input: UpdateKnowledgeInput) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('knowledge_base')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as KnowledgeBase
}

// ナレッジ削除
export async function deleteKnowledgeArticle(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('knowledge_base')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// 閲覧数インクリメント
export async function incrementViewCount(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('increment_knowledge_view_count', { article_id: id })

  // RPC関数がない場合のフォールバック
  if (error) {
    const { data: article } = await supabase
      .from('knowledge_base')
      .select('view_count')
      .eq('id', id)
      .single()

    if (article) {
      await supabase
        .from('knowledge_base')
        .update({ view_count: (article.view_count || 0) + 1 })
        .eq('id', id)
    }
  }
}

// チケットからナレッジ作成
export async function createKnowledgeFromTicket(ticketId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('認証が必要です')

  // チケット情報取得
  const { data: ticket, error: ticketError } = await supabase
    .from('knowledge_tickets')
    .select(`
      *,
      comments:ticket_comments(content, is_internal, created_at)
    `)
    .eq('id', ticketId)
    .single()

  if (ticketError || !ticket) throw new Error('チケットが見つかりません')

  // 対応履歴をまとめてコンテンツ作成
  const publicComments = ticket.comments
    ?.filter((c: { is_internal: boolean }) => !c.is_internal)
    ?.sort((a: { created_at: string }, b: { created_at: string }) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ) || []

  let content = `## 問題\n\n${ticket.description}\n\n`
  
  if (publicComments.length > 0) {
    content += `## 対応・解決策\n\n`
    publicComments.forEach((comment: { content: string }, index: number) => {
      content += `${index + 1}. ${comment.content}\n\n`
    })
  }

  // ナレッジ作成
  const { data: knowledge, error: knowledgeError } = await supabase
    .from('knowledge_base')
    .insert({
      title: ticket.title,
      content,
      category: ticket.category,
      visibility: 'customer',
      is_published: false,
      created_by: user.id,
    })
    .select()
    .single()

  if (knowledgeError) throw knowledgeError

  // 紐付け作成
  await supabase
    .from('ticket_knowledge_links')
    .insert({
      ticket_id: ticketId,
      knowledge_id: knowledge.id,
    })

  return knowledge as KnowledgeBase
}

// 顧客向け公開ナレッジ取得
export async function getPublicKnowledge(search?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('knowledge_base')
    .select('id, title, category, tags, view_count, updated_at')
    .eq('is_published', true)
    .in('visibility', ['customer', 'public'])
    .order('view_count', { ascending: false })

  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

// タグ一覧取得
export async function getAllTags() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('knowledge_base')
    .select('tags')

  if (error) throw error

  const tagSet = new Set<string>()
  data.forEach(article => {
    article.tags?.forEach((tag: string) => tagSet.add(tag))
  })

  return Array.from(tagSet).sort()
}
