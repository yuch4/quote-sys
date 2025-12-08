import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import type { CustomerPortalSession, CustomerPortalInvite } from '@/types/knowledge'

const PORTAL_SESSION_COOKIE = 'portal_session'

// 招待トークン検証
export async function verifyInviteToken(token: string): Promise<CustomerPortalInvite | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customer_portal_invites')
    .select(`
      *,
      customer:customers(id, customer_name, email)
    `)
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) {
    return null
  }

  return data as CustomerPortalInvite
}

// セッション作成
export async function createPortalSession(invite: CustomerPortalInvite): Promise<CustomerPortalSession | null> {
  const supabase = await createClient()

  // 招待を使用済みにマーク
  const { error: updateError } = await supabase
    .from('customer_portal_invites')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)

  if (updateError) {
    console.error('Failed to mark invite as used:', updateError)
    return null
  }

  // セッショントークン生成
  const sessionToken = generateSessionToken()

  // 顧客情報取得
  const { data: customer } = await supabase
    .from('customers')
    .select('customer_name, email')
    .eq('id', invite.customer_id)
    .single()

  if (!customer) {
    return null
  }

  // セッション作成
  const { data: session, error: sessionError } = await supabase
    .from('customer_portal_sessions')
    .insert({
      session_token: sessionToken,
      invite_id: invite.id,
      customer_id: invite.customer_id,
      customer_name: customer.customer_name,
      customer_email: invite.email,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24時間
    })
    .select()
    .single()

  if (sessionError) {
    console.error('Failed to create portal session:', sessionError)
    return null
  }

  return session as CustomerPortalSession
}

// セッショントークン生成
function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// セッション検証
export async function verifyPortalSession(): Promise<CustomerPortalSession | null> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(PORTAL_SESSION_COOKIE)?.value

  if (!sessionToken) {
    return null
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customer_portal_sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) {
    return null
  }

  return data as CustomerPortalSession
}

// セッションCookie設定
export async function setPortalSessionCookie(sessionToken: string) {
  const cookieStore = await cookies()
  cookieStore.set(PORTAL_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24時間
    path: '/portal',
  })
}

// セッションCookie削除
export async function clearPortalSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(PORTAL_SESSION_COOKIE)
}

// 招待作成
export async function createInvite(customerId: string, email: string): Promise<CustomerPortalInvite> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('認証が必要です')

  // トークン生成
  const token = generateInviteToken()

  const { data, error } = await supabase
    .from('customer_portal_invites')
    .insert({
      token,
      customer_id: customerId,
      email,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error
  return data as CustomerPortalInvite
}

// 招待トークン生成
function generateInviteToken(): string {
  const array = new Uint8Array(24)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// 顧客の招待一覧取得
export async function getCustomerInvites(customerId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customer_portal_invites')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as CustomerPortalInvite[]
}

// 招待URL生成
export function getInviteUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  return `${baseUrl}/portal/invite/${token}`
}
