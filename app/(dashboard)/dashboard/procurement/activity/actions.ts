'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface CreateProjectActivityInput {
  projectId: string
  activityDate: string
  subject: string
  details?: string
}

export async function createProjectActivity(input: CreateProjectActivityInput) {
  const supabase = await createClient()

  if (!input.projectId || !input.activityDate || !input.subject) {
    return { success: false, message: '必須項目を入力してください。' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: '認証情報が無効です。再度ログインしてください。' }
  }

  const payload = {
    project_id: input.projectId,
    activity_date: input.activityDate,
    subject: input.subject.trim(),
    details: input.details?.trim() || null,
    created_by: user.id,
  }

  const { error } = await supabase.from('project_activities').insert(payload)
  if (error) {
    console.error('Failed to create project activity:', error)
    return { success: false, message: '活動の登録に失敗しました。' }
  }

  revalidatePath('/dashboard/procurement/activity')
  revalidatePath(`/dashboard/projects/${input.projectId}`)
  return { success: true }
}
