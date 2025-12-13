'use server'

/**
 * 発注書PDF生成 Server Action
 * HTML/CSS + Puppeteer方式でPDFを生成
 */

import { createClient } from '@/lib/supabase/server'
import { renderTemplate } from '@/lib/pdf/template-engine'
import { generatePDFFromHTML } from '@/lib/pdf/puppeteer-generator'
import { 
  DEFAULT_PURCHASE_ORDER_TEMPLATE_HTML, 
  DEFAULT_PURCHASE_ORDER_TEMPLATE_CSS 
} from '@/lib/pdf/default-template'
import type { PurchaseOrderItem, QuoteItem } from '@/types/database'
import crypto from 'crypto'

const toSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }
  return value ?? null
}

interface GeneratePurchaseOrderPDFOptions {
  applyStamps?: boolean
  templateId?: string
}

interface GeneratePurchaseOrderPDFResult {
  success: boolean
  message: string
  url?: string
  fileName?: string
  fileSize?: number
  sha256Hash?: string
}

interface PurchaseOrderPDFData {
  purchaseOrderNo: string
  orderDate: string
  supplierName: string
  supplierAddress?: string
  quoteNumber?: string
  projectName?: string
  items: {
    lineNumber: number
    productName: string
    description?: string
    quantity: number
    unitCost: number
    amount: number
  }[]
  total: number
  notes?: string
  companyName: string
  companyAddress: string
  stamps?: {
    slot1?: { image_url: string; approved_by?: string }
    slot2?: { image_url: string; approved_by?: string }
    companySeal?: { image_url: string }
  }
}

/**
 * 発注書データをPDF用のデータ形式に変換
 */
function convertPurchaseOrderToPDFData(
  order: any,
  companyInfo: { name: string; address: string },
  stamps?: PurchaseOrderPDFData['stamps']
): PurchaseOrderPDFData {
  const supplier = toSingle(order.supplier) as any
  const quoteRaw = toSingle(order.quote) as any
  const projectRaw = quoteRaw?.project ? toSingle(quoteRaw.project) : null
  
  const items = ((order.items || []) as Array<PurchaseOrderItem & { quote_item?: QuoteItem | QuoteItem[] | null }>)
    .map((item, index) => {
      const relatedQuoteItem = toSingle(item.quote_item)
      return {
        lineNumber: relatedQuoteItem?.line_number ?? index + 1,
        productName: item.manual_name || relatedQuoteItem?.product_name || `明細${index + 1}`,
        description: item.manual_description || relatedQuoteItem?.description || undefined,
        quantity: Number(item.quantity || 0),
        unitCost: Number(item.unit_cost || 0),
        amount: Number(item.amount || 0),
      }
    })

  return {
    purchaseOrderNo: order.purchase_order_number || '',
    orderDate: order.order_date 
      ? new Date(order.order_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
      : '',
    supplierName: supplier?.supplier_name || '仕入先未設定',
    supplierAddress: supplier?.address || undefined,
    quoteNumber: quoteRaw?.quote_number || undefined,
    projectName: projectRaw?.project_name || undefined,
    items,
    total: Number(order.total_cost || 0),
    notes: order.notes || undefined,
    companyName: companyInfo.name,
    companyAddress: companyInfo.address,
    stamps,
  }
}

export async function generatePurchaseOrderPDF(
  purchaseOrderId: string,
  options: GeneratePurchaseOrderPDFOptions = {}
): Promise<GeneratePurchaseOrderPDFResult> {
  const { applyStamps = false, templateId } = options
  const supabase = await createClient()

  try {
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, message: '認証が必要です' }
    }

    // 発注書データ取得
    const { data: order, error } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        purchase_order_number,
        order_date,
        status,
        approval_status,
        total_cost,
        notes,
        supplier:suppliers(
          supplier_name,
          address,
          phone,
          email
        ),
        quote:quotes(
          quote_number,
          project:projects(
            project_name,
            project_number,
            customer:customers(customer_name)
          )
        ),
        items:purchase_order_items(
          id,
          quantity,
          unit_cost,
          amount,
          manual_name,
          manual_description,
          quote_item:quote_items(
            line_number,
            product_name,
            description
          )
        )
      `)
      .eq('id', purchaseOrderId)
      .single()

    if (error || !order) {
      return { success: false, message: '発注書の取得に失敗しました' }
    }

    if (order.approval_status !== '承認済み') {
      return {
        success: false,
        message: '承認済みの発注書のみPDFを生成できます',
      }
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

    // テンプレート取得
    let htmlTemplate = DEFAULT_PURCHASE_ORDER_TEMPLATE_HTML
    let cssTemplate: string | null = DEFAULT_PURCHASE_ORDER_TEMPLATE_CSS
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
        .eq('target_entity', 'purchase_order')
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

    // 押印情報取得
    let stamps: PurchaseOrderPDFData['stamps'] | undefined
    if (applyStamps) {
      // 発注書の承認履歴から押印情報を取得
      const { data: approvalInstance } = await supabase
        .from('purchase_order_approval_instances')
        .select(`
          *,
          steps:purchase_order_approval_instance_steps(
            *,
            approver:users(id, display_name)
          )
        `)
        .eq('purchase_order_id', purchaseOrderId)
        .eq('status', 'approved')
        .maybeSingle()

      if (approvalInstance?.steps) {
        const approvedSteps = (approvalInstance.steps as any[])
          .filter((step: any) => step.status === 'approved')
          .sort((a: any, b: any) => a.step_order - b.step_order)

        stamps = {}
        for (let i = 0; i < approvedSteps.length && i < 2; i++) {
          const step = approvedSteps[i]
          const slotKey = `slot${i + 1}` as 'slot1' | 'slot2'
          
          // ユーザーの印鑑画像を取得
          const { data: stampData } = await supabase
            .from('user_stamps')
            .select('image_url')
            .eq('user_id', step.approver?.id)
            .eq('is_active', true)
            .maybeSingle()

          if (stampData?.image_url) {
            stamps[slotKey] = {
              image_url: stampData.image_url,
              approved_by: step.approver?.display_name || '',
            }
          }
        }

        // 角印取得
        const { data: companySeal } = await supabase
          .from('company_seals')
          .select('image_url')
          .eq('is_active', true)
          .maybeSingle()

        if (companySeal?.image_url) {
          stamps.companySeal = { image_url: companySeal.image_url }
        }
      }
    }

    // 発注書データをPDF用に変換
    const pdfData = convertPurchaseOrderToPDFData(order as any, companyInfo, stamps)

    // HTML生成（CSS込みの完全なHTMLを生成）
    const html = renderTemplate(htmlTemplate, cssTemplate, pdfData as any)
    
    // PDF生成
    const pdfBuffer = await generatePDFFromHTML(html, {
      format: 'A4',
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    })

    // SHA256ハッシュ計算
    const sha256Hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex')

    // ファイル名生成
    const fileName = `${order.purchase_order_number}.pdf`
    const filePath = `purchase-orders/${purchaseOrderId}/${fileName}`

    // Supabase Storageにアップロード
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { success: false, message: 'PDFのアップロードに失敗しました' }
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)

    // 発注書テーブル更新
    const { error: updateError } = await supabase
      .from('purchase_orders')
      .update({
        pdf_url: urlData.publicUrl,
        pdf_generated_at: new Date().toISOString(),
      })
      .eq('id', purchaseOrderId)

    if (updateError) {
      console.error('Update error:', updateError)
      return { success: false, message: 'PDF URLの保存に失敗しました' }
    }

    // PDF生成履歴を記録（テーブルが存在する場合）
    await supabase
      .from('pdf_generation_logs')
      .insert({
        entity_type: 'purchase_order',
        entity_id: purchaseOrderId,
        template_id: usedTemplateId,
        template_version: templateVersion,
        pdf_url: urlData.publicUrl,
        file_size: pdfBuffer.length,
        sha256_hash: sha256Hash,
        generated_by: user.id,
      })
      .then(() => {}) // ログエラーは無視

    return {
      success: true,
      message: 'PDF生成が完了しました',
      url: urlData.publicUrl,
      fileName,
      fileSize: pdfBuffer.length,
      sha256Hash,
    }
  } catch (error) {
    console.error('PurchaseOrder PDF生成エラー:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'PDF生成に失敗しました',
    }
  }
}
