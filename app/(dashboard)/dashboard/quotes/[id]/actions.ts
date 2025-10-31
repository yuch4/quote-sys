'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 承認依頼を送信
export async function requestApproval(quoteId: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('quotes')
      .update({
        approval_status: '承認待ち',
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('approval_status', '下書き')

    if (error) throw error

    revalidatePath(`/dashboard/quotes/${quoteId}`)
    revalidatePath('/dashboard/quotes')

    return { success: true, message: '承認依頼を送信しました' }
  } catch (error) {
    console.error('承認依頼エラー:', error)
    return { success: false, message: '承認依頼の送信に失敗しました' }
  }
}

// 見積を承認
export async function approveQuote(quoteId: string, userId: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('quotes')
      .update({
        approval_status: '承認済み',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('approval_status', '承認待ち')

    if (error) throw error

    revalidatePath(`/dashboard/quotes/${quoteId}`)
    revalidatePath('/dashboard/quotes')

    return { success: true, message: '見積を承認しました' }
  } catch (error) {
    console.error('承認エラー:', error)
    return { success: false, message: '見積の承認に失敗しました' }
  }
}

// 見積を却下
export async function rejectQuote(quoteId: string, userId: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('quotes')
      .update({
        approval_status: '却下',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('approval_status', '承認待ち')

    if (error) throw error

    revalidatePath(`/dashboard/quotes/${quoteId}`)
    revalidatePath('/dashboard/quotes')

    return { success: true, message: '見積を却下しました' }
  } catch (error) {
    console.error('却下エラー:', error)
    return { success: false, message: '見積の却下に失敗しました' }
  }
}

// 下書きに戻す
export async function returnToDraft(quoteId: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('quotes')
      .update({
        approval_status: '下書き',
        approved_by: null,
        approved_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('approval_status', '却下')

    if (error) throw error

    revalidatePath(`/dashboard/quotes/${quoteId}`)
    revalidatePath('/dashboard/quotes')

    return { success: true, message: '下書きに戻しました' }
  } catch (error) {
    console.error('下書きに戻すエラー:', error)
    return { success: false, message: '下書きに戻す処理に失敗しました' }
  }
}
