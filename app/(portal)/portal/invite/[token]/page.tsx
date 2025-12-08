import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { verifyInviteToken, createPortalSession } from '@/lib/knowledge/portal-auth'
import { PortalAuthForm } from './auth-form'

interface PageParams {
  token: string
}

async function getInviteDetails(token: string) {
  const supabase = await createClient()

  const { data: invite } = await supabase
    .from('customer_portal_invites')
    .select(`
      *,
      customer:customers(id, name, email, group_company_id),
      invited_by_user:users!customer_portal_invites_invited_by_fkey(display_name)
    `)
    .eq('token', token)
    .single()

  return invite
}

export default async function PortalInvitePage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { token } = await params
  const invite = await getInviteDetails(token)

  if (!invite) {
    notFound()
  }

  // 既に使用済み
  if (invite.used_at) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            この招待リンクは使用済みです
          </h1>
          <p className="text-gray-600 mb-6">
            既にこの招待リンクでポータルにアクセスしています。
            新しい招待リンクが必要な場合は、担当者にお問い合わせください。
          </p>
        </div>
      </div>
    )
  }

  // 期限切れ
  if (new Date(invite.expires_at) < new Date()) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            招待リンクの有効期限が切れています
          </h1>
          <p className="text-gray-600 mb-6">
            この招待リンクは有効期限（30日）を過ぎています。
            新しい招待リンクが必要な場合は、担当者にお問い合わせください。
          </p>
        </div>
      </div>
    )
  }

  // 有効な招待 - 認証フォームを表示
  const customerName = invite.customer?.name || 'お客様'

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            カスタマーポータルへようこそ
          </h1>
          <p className="text-gray-600">
            {customerName}様、{invite.invited_by_user?.display_name || '担当者'}より
            ポータルへの招待を受けています。
          </p>
        </div>

        <PortalAuthForm token={token} customerEmail={invite.customer?.email || ''} />
      </div>
    </div>
  )
}
