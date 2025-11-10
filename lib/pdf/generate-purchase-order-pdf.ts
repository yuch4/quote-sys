'use server'

import { pdf } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { PurchaseOrderPDF } from '@/components/purchase-orders/purchase-order-pdf'
import { mergeDocumentLayoutConfig } from '@/lib/document-layout'

export async function generatePurchaseOrderPDF(purchaseOrderId: string) {
  const supabase = await createClient()

  try {
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
      throw new Error('発注書の取得に失敗しました')
    }

    if (order.approval_status !== '承認済み') {
      return {
        success: false,
        message: '承認済みの発注書のみPDFを生成できます',
      }
    }

    const { data: companyProfile } = await supabase
      .from('company_profile')
      .select('company_name, company_address')
      .maybeSingle()

    const companyInfo = {
      name: companyProfile?.company_name ?? '自社名未設定',
      address: companyProfile?.company_address ?? '住所未設定',
    }

    const { data: layoutData } = await supabase
      .from('document_layout_settings')
      .select('sections, table_columns')
      .eq('target_entity', 'purchase_order')
      .maybeSingle()

    const layoutConfig = mergeDocumentLayoutConfig('purchase_order', layoutData ?? undefined)

    const items = (order.items || []).map((item, index) => ({
      line_number: item.quote_item?.line_number ?? index + 1,
      name: item.manual_name || item.quote_item?.product_name || `明細${index + 1}`,
      description: item.manual_description || item.quote_item?.description || null,
      quantity: Number(item.quantity || 0),
      unit_cost: Number(item.unit_cost || 0),
      amount: Number(item.amount || 0),
    }))

    const pdfDoc = PurchaseOrderPDF({
      order: {
        purchase_order_number: order.purchase_order_number,
        order_date: order.order_date,
        status: order.status,
        total_cost: Number(order.total_cost || 0),
        notes: order.notes,
        supplier: order.supplier || null,
        quote: order.quote || null,
      },
      companyInfo,
      items,
      layout: layoutConfig,
    })

    const blob = await pdf(pdfDoc).toBlob()
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const fileName = `${order.purchase_order_number}.pdf`
    const filePath = `purchase-orders/${purchaseOrderId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      throw new Error('PDFのアップロードに失敗しました')
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)

    const { error: updateError } = await supabase
      .from('purchase_orders')
      .update({
        pdf_url: urlData.publicUrl,
        pdf_generated_at: new Date().toISOString(),
      })
      .eq('id', purchaseOrderId)

    if (updateError) {
      throw new Error('PDF URLの保存に失敗しました')
    }

    return {
      success: true,
      message: 'PDF生成が完了しました',
      url: urlData.publicUrl,
    }
  } catch (error) {
    console.error('PurchaseOrder PDF生成エラー:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'PDF生成に失敗しました',
    }
  }
}
