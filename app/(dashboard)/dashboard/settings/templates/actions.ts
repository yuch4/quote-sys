'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { renderTemplate } from '@/lib/pdf/template-engine'
import { SAMPLE_QUOTE_DATA } from '@/types/pdf-templates'
import type { Template } from '@/types/pdf-templates'

export interface TemplateFormData {
  id?: string
  name: string
  description?: string
  target_entity: 'quote' | 'purchase_order'
  html_content: string
  css_content?: string
  settings_json?: string | null
  is_active: boolean
  is_default: boolean
}

export async function getTemplates() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch templates:', error)
    return []
  }

  return data as Template[]
}

export async function getTemplate(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Failed to fetch template:', error)
    return null
  }

  return data as Template
}

export async function createTemplate(formData: TemplateFormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: '認証が必要です' }
  }

  // デフォルトを設定する場合、既存のデフォルトを解除
  if (formData.is_default) {
    await supabase
      .from('templates')
      .update({ is_default: false })
      .eq('target_entity', formData.target_entity)
      .eq('is_default', true)
  }

  const { data, error } = await supabase
    .from('templates')
    .insert({
      name: formData.name,
      description: formData.description || null,
      target_entity: formData.target_entity,
      html_content: formData.html_content,
      css_content: formData.css_content || null,
      settings_json: formData.settings_json || null,
      is_active: formData.is_active,
      is_default: formData.is_default,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create template:', error)
    return { success: false, message: 'テンプレートの作成に失敗しました' }
  }

  revalidatePath('/dashboard/settings')
  return { success: true, message: 'テンプレートを作成しました', data }
}

export async function updateTemplate(formData: TemplateFormData) {
  const supabase = await createClient()
  
  if (!formData.id) {
    return { success: false, message: 'テンプレートIDが必要です' }
  }

  // デフォルトを設定する場合、既存のデフォルトを解除
  if (formData.is_default) {
    await supabase
      .from('templates')
      .update({ is_default: false })
      .eq('target_entity', formData.target_entity)
      .eq('is_default', true)
      .neq('id', formData.id)
  }

  // バージョンをインクリメント
  const { data: current } = await supabase
    .from('templates')
    .select('version')
    .eq('id', formData.id)
    .single()

  const newVersion = (current?.version || 0) + 1

  const { data, error } = await supabase
    .from('templates')
    .update({
      name: formData.name,
      description: formData.description || null,
      target_entity: formData.target_entity,
      html_content: formData.html_content,
      css_content: formData.css_content || null,
      settings_json: formData.settings_json || null,
      is_active: formData.is_active,
      is_default: formData.is_default,
      version: newVersion,
    })
    .eq('id', formData.id)
    .select()
    .single()

  if (error) {
    console.error('Failed to update template:', error)
    return { success: false, message: 'テンプレートの更新に失敗しました' }
  }

  revalidatePath('/dashboard/settings')
  return { success: true, message: 'テンプレートを更新しました', data }
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Failed to delete template:', error)
    return { success: false, message: 'テンプレートの削除に失敗しました' }
  }

  revalidatePath('/dashboard/settings')
  return { success: true, message: 'テンプレートを削除しました' }
}

export async function duplicateTemplate(id: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: '認証が必要です' }
  }

  // 元のテンプレートを取得
  const { data: original, error: fetchError } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !original) {
    return { success: false, message: 'テンプレートが見つかりません' }
  }

  // 複製を作成
  const { data, error } = await supabase
    .from('templates')
    .insert({
      name: `${original.name} (コピー)`,
      description: original.description,
      target_entity: original.target_entity,
      html_content: original.html_content,
      css_content: original.css_content,
      is_active: false,
      is_default: false,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to duplicate template:', error)
    return { success: false, message: 'テンプレートの複製に失敗しました' }
  }

  revalidatePath('/dashboard/settings')
  return { success: true, message: 'テンプレートを複製しました', data }
}

export async function previewTemplate(
  htmlContent: string,
  cssContent: string | null,
  targetEntity: 'quote' | 'purchase_order'
) {
  try {
    // 直接renderTemplateを呼び出してHTMLを生成
    const renderedHtml = renderTemplate(
      htmlContent,
      cssContent || '',
      SAMPLE_QUOTE_DATA
    )
    return { success: true, message: 'プレビュー生成完了', html: renderedHtml }
  } catch (error) {
    console.error('Preview error:', error)
    return { success: false, message: 'プレビュー生成に失敗しました', html: '' }
  }
}
