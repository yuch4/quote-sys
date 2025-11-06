'use server'

import { createClient } from '@/lib/supabase/server'
import { pdf } from '@react-pdf/renderer'
import { QuotePDF } from '@/components/quotes/quote-pdf'

export async function generateQuotePDF(quoteId: string) {
  const supabase = await createClient()

  try {
    // 見積データ取得
    const { data: quote, error } = await supabase
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

    if (error || !quote) {
      throw new Error('見積データの取得に失敗しました')
    }

    if (quote.approval_status !== '承認済み') {
      return {
        success: false,
        message: '承認済みの見積のみPDFを生成できます',
      }
    }

    // PDF生成
    const pdfDoc = QuotePDF({ quote })
    const blob = await pdf(pdfDoc).toBlob()

    // BlobをArrayBufferに変換
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Supabase Storageにアップロード
    const fileName = `${quote.quote_number}_v${quote.version}.pdf`
    const filePath = `quotes/${quoteId}/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      throw new Error('PDFのアップロードに失敗しました')
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)

    // 見積レコードにPDF URLを保存
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        pdf_url: urlData.publicUrl,
        pdf_generated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)

    if (updateError) {
      throw new Error('PDF URLの保存に失敗しました')
    }

    return {
      success: true,
      message: 'PDF生成が完了しました',
      url: urlData.publicUrl,
    }
  } catch (error) {
    console.error('PDF生成エラー:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'PDF生成に失敗しました',
    }
  }
}
