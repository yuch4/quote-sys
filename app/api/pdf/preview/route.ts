/**
 * PDFプレビューAPI
 * GET: HTMLプレビュー取得
 * POST: テンプレート＋サンプルデータでプレビュー生成
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderTemplate, convertQuoteToPDFData } from '@/lib/pdf/template-engine'
import { DEFAULT_QUOTE_TEMPLATE_HTML, DEFAULT_QUOTE_TEMPLATE_CSS } from '@/lib/pdf/default-template'
import { SAMPLE_QUOTE_DATA } from '@/types/pdf-templates'
import type { QuotePDFData } from '@/types/pdf-templates'

export const runtime = 'nodejs'

interface PreviewRequest {
  quoteId?: string
  templateId?: string
  htmlTemplate?: string
  cssTemplate?: string
  useSampleData?: boolean
}

/**
 * POST: プレビューHTML生成
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body: PreviewRequest = await request.json()
    const { quoteId, templateId, htmlTemplate, cssTemplate, useSampleData = false } = body

    // テンプレート決定
    let html = htmlTemplate || DEFAULT_QUOTE_TEMPLATE_HTML
    let css = cssTemplate || DEFAULT_QUOTE_TEMPLATE_CSS

    if (templateId && !htmlTemplate) {
      const { data: template } = await supabase
        .from('templates')
        .select('html_content, css_content')
        .eq('id', templateId)
        .single()

      if (template) {
        html = template.html_content
        css = template.css_content
      }
    }

    // データ準備
    let pdfData: QuotePDFData = SAMPLE_QUOTE_DATA

    if (quoteId && !useSampleData) {
      // 見積データ取得
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          *,
          project:projects(
            *,
            customer:customers(*),
            sales_rep:users!projects_sales_rep_id_fkey(*)
          ),
          items:quote_items(
            *,
            supplier:suppliers(supplier_name)
          )
        `)
        .eq('id', quoteId)
        .single()

      if (quoteError || !quote) {
        return NextResponse.json({ error: '見積データの取得に失敗しました' }, { status: 404 })
      }

      // 会社情報取得
      const { data: companyProfile } = await supabase
        .from('company_profile')
        .select('company_name, company_address')
        .maybeSingle()

      const companyInfo = {
        name: companyProfile?.company_name ?? '自社名未設定',
        address: companyProfile?.company_address ?? '住所未設定',
      }

      pdfData = convertQuoteToPDFData(quote as any, companyInfo)
    }

    // HTMLレンダリング
    const renderedHtml = renderTemplate(html, css, pdfData)

    return NextResponse.json({
      success: true,
      html: renderedHtml,
    })
  } catch (error) {
    console.error('Preview generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'プレビュー生成に失敗しました' },
      { status: 500 }
    )
  }
}
