'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_STATUSES = new Set([
  'リード',
  '見積中',
  '受注',
  '計上OK',
  '計上済み',
  '失注',
  'キャンセル',
])

interface UpdateProjectStatusParams {
  projectId: string
  status: string
}

export async function updateProjectStatus({ projectId, status }: UpdateProjectStatusParams) {
  if (!projectId || !status || !ALLOWED_STATUSES.has(status)) {
    return { success: false, message: '無効なステータスです。' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('projects')
    .update({ status })
    .eq('id', projectId)

  if (error) {
    console.error('Failed to update project status:', error)
    return { success: false, message: 'ステータスの更新に失敗しました。' }
  }

  revalidatePath('/dashboard/projects')
  return { success: true }
}
