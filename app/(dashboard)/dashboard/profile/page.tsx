import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProfileForm } from '@/components/profile/profile-form'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData, error } = await supabase.from('users').select('*').eq('id', user.id).single()

  if (error || !userData) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ユーザープロフィール</h1>
        <p className="text-gray-600 mt-2">氏名や部署などのプロフィール情報を更新できます。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>プロフィール編集</CardTitle>
          <CardDescription>最新の情報に更新してください</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initialData={{
              id: userData.id,
              display_name: userData.display_name,
              department: userData.department,
              email: user.email ?? '',
              role: userData.role,
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
