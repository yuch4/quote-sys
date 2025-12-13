/**
 * PDF生成API
 * POST: 見積データからPDFを生成
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderTemplate, convertQuoteToPDFData } from '@/lib/pdf/template-engine'
import { generatePDFFromHTML } from '@/lib/pdf/puppeteer-generator'
import { DEFAULT_QUOTE_TEMPLATE_HTML, DEFAULT_QUOTE_TEMPLATE_CSS } from '@/lib/pdf/default-template'
import type { QuotePDFData, StampApplication } from '@/types/pdf-templates'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 60 // Vercel Pro/Enterprise: 60秒まで

interface GeneratePDFRequest {
  quoteId: string
  templateId?: string
  applyStamps?: boolean
  fileType?: 'draft' | 'final'
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body: GeneratePDFRequest = await request.json()
    const { quoteId, templateId, applyStamps = false, fileType = 'draft' } = body

    if (!quoteId) {
      return NextResponse.json({ error: '見積IDが必要です' }, { status: 400 })
    }

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

    // 最終版PDFは承認済みのみ
    if (fileType === 'final' && quote.approval_status !== '承認済み') {
      return NextResponse.json(
        { error: '承認済みの見積のみ最終版PDFを生成できます' },
        { status: 400 }
      )
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

    // テンプレート取得（指定がなければデフォルト）
    let htmlTemplate = DEFAULT_QUOTE_TEMPLATE_HTML
    let cssTemplate: string | null = DEFAULT_QUOTE_TEMPLATE_CSS
    let templateVersion = 1
    let usedTemplateId: string | null = null

    if (templateId) {
      const { data: template } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_active', true)
        .single()

      if (template) {
        htmlTemplate = template.html_content
        cssTemplate = template.css_content
        templateVersion = template.version
        usedTemplateId = template.id
      }
    } else {
      // デフォルトテンプレートを探す
      const { data: defaultTemplate } = await supabase
        .from('templates')
        .select('*')
        .eq('target_entity', 'quote')
        .eq('is_default', true)
        .eq('is_active', true)
        .single()

      if (defaultTemplate) {
        htmlTemplate = defaultTemplate.html_content
        cssTemplate = defaultTemplate.css_content
        templateVersion = defaultTemplate.version
        usedTemplateId = defaultTemplate.id
      }
    }

    // 見積データをPDF用に変換
    const pdfData: QuotePDFData = convertQuoteToPDFData(quote as any, companyInfo)

    // 押印処理（最終版のみ）
    const stampsApplied: StampApplication[] = []
    if (applyStamps && fileType === 'final') {
      // 承認履歴から押印情報を取得
      const { data: approvalInstance } = await supabase
        .from('quote_approval_instances')
        .select(`
          *,
          steps:quote_approval_instance_steps(
            *,
            approver:users(id, display_name)
          )
        `)
        .eq('quote_id', quoteId)
        .eq('status', 'approved')
        .single()

      if (approvalInstance?.steps) {
        const approvedSteps = (approvalInstance.steps as any[])
          .filter((step: any) => step.status === 'approved')
          .sort((a: any, b: any) => a.step_order - b.step_order)

        for (let i = 0; i < approvedSteps.length && i < 3; i++) {
          const step = approvedSteps[i]
          const userId = step.approver_user_id

          // ユーザーの印影を取得
          const { data: userStamp } = await supabase
            .from('user_stamps')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single()

          if (userStamp) {
            // 印影画像のURL生成
            const { data: signedUrl } = await supabase.storage
              .from('user-stamps')
              .createSignedUrl(userStamp.image_path, 300)

            const stampApplication: StampApplication = {
              slot: i + 1,
              user_id: userId,
              user_name: step.approver?.display_name,
              role: step.approver_role,
              stamp_type: 'user',
              stamp_id: userStamp.id,
              stamp_version: userStamp.version,
              image_url: signedUrl?.signedUrl,
              applied_at: new Date().toISOString(),
            }
            stampsApplied.push(stampApplication)

            // PDFデータに押印情報を追加
            if (!pdfData.stamps) pdfData.stamps = {}
            if (i === 0) pdfData.stamps.slot1 = stampApplication
            else if (i === 1) pdfData.stamps.slot2 = stampApplication
            else if (i === 2) pdfData.stamps.slot3 = stampApplication
          }
        }
      }

      // 角印を追加
      const { data: companySeal } = await supabase
        .from('stamp_assets')
        .select('*')
        .eq('stamp_type', 'company_seal')
        .eq('is_active', true)
        .single()

      if (companySeal) {
        const { data: signedUrl } = await supabase.storage
          .from('stamp-assets')
          .createSignedUrl(companySeal.image_path, 300)

        const sealApplication: StampApplication = {
          slot: 0,
          stamp_type: 'company_seal',
          stamp_id: companySeal.id,
          stamp_version: companySeal.version,
          image_url: signedUrl?.signedUrl,
          applied_at: new Date().toISOString(),
        }
        stampsApplied.push(sealApplication)

        if (!pdfData.stamps) pdfData.stamps = {}
        pdfData.stamps.companySeal = sealApplication
      }
    }

    // HTMLレンダリング
    const html = renderTemplate(htmlTemplate, cssTemplate, pdfData)

    // PDF生成
    const pdfBuffer = await generatePDFFromHTML(html, {
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
    })

    // SHA256ハッシュ計算
    const sha256Hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex')

    // ファイル名生成
    const fileName = `${quote.quote_number}_v${quote.version}${fileType === 'final' ? '_final' : ''}.pdf`
    const storagePath = `quotes/${quoteId}/${fileName}`

    // Storageにアップロード
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'PDFのアップロードに失敗しました' }, { status: 500 })
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath)

    // quote_filesに記録
    const { error: fileRecordError } = await supabase
      .from('quote_files')
      .upsert({
        quote_id: quoteId,
        file_type: fileType,
        storage_path: storagePath,
        file_name: fileName,
        file_size: pdfBuffer.length,
        sha256_hash: sha256Hash,
        template_id: usedTemplateId,
        template_version: templateVersion,
        stamps_applied: stampsApplied,
        generated_by: user.id,
        generated_at: new Date().toISOString(),
      }, {
        onConflict: 'quote_id,file_type',
      })

    if (fileRecordError) {
      console.error('File record error:', fileRecordError)
    }

    // quotesテーブルを更新（最終版の場合）
    if (fileType === 'final') {
      await supabase
        .from('quotes')
        .update({
          pdf_url: urlData.publicUrl,
          pdf_generated_at: new Date().toISOString(),
        })
        .eq('id', quoteId)
    }

    // 監査ログ記録
    await supabase.from('audit_logs').insert({
      event_type: 'pdf_generated',
      entity_type: 'quote',
      entity_id: quoteId,
      user_id: user.id,
      details: {
        file_type: fileType,
        template_id: usedTemplateId,
        template_version: templateVersion,
        stamps_applied: stampsApplied.length,
        sha256_hash: sha256Hash,
      },
    })

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      fileName,
      fileSize: pdfBuffer.length,
      sha256Hash,
      stampsApplied: stampsApplied.length,
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PDF生成に失敗しました' },
      { status: 500 }
    )
  }
}
