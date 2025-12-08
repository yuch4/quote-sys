import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 招待トークン検証とセッション作成
export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json()

    if (!token || !email) {
      return NextResponse.json(
        { error: 'トークンとメールアドレスが必要です' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 招待トークン検証
    const { data: invite, error: inviteError } = await supabase
      .from('customer_portal_invites')
      .select(`
        *,
        customer:customers(id, customer_name, email)
      `)
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: '招待リンクが無効または期限切れです' },
        { status: 400 }
      )
    }

    // メールアドレス確認
    const inviteEmail = invite.customer?.email || invite.email
    if (email.toLowerCase() !== inviteEmail?.toLowerCase()) {
      return NextResponse.json(
        { error: 'メールアドレスが一致しません' },
        { status: 400 }
      )
    }

    // 招待を使用済みにマーク
    await supabase
      .from('customer_portal_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invite.id)

    // セッショントークン生成
    const sessionToken = generateSessionToken()

    // セッション作成
    const { data: session, error: sessionError } = await supabase
      .from('customer_portal_sessions')
      .insert({
        session_token: sessionToken,
        invite_id: invite.id,
        customer_id: invite.customer_id,
        customer_name: invite.customer?.customer_name || '',
        customer_email: inviteEmail,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7日間
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Failed to create session:', sessionError)
      return NextResponse.json(
        { error: 'セッション作成に失敗しました' },
        { status: 500 }
      )
    }

    // レスポンスにCookieを設定
    const response = NextResponse.json({
      success: true,
      session: {
        session_token: session.session_token,
        customer_name: session.customer_name,
      },
    })

    response.cookies.set('portal_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7日間
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Portal auth error:', error)
    return NextResponse.json(
      { error: '認証処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}
