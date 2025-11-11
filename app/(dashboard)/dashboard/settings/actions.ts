'use server'

import { pdf } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { QuotePDF } from '@/components/quotes/quote-pdf'
import { PurchaseOrderPDF } from '@/components/purchase-orders/purchase-order-pdf'
import { mergeDocumentLayoutConfig } from '@/lib/document-layout'
import { firstRelation, ensureArrayRelation } from '@/lib/supabase/relations'
import type { DocumentTargetEntity } from '@/types/document-layout'

type PreviewResponse = {
  success: boolean
  message: string
  base64?: string
}

const buildPdfBase64 = async (doc: React.ReactElement<DocumentProps>) => {
  const blob = await pdf(doc).toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return buffer.toString('base64')
}

export async function previewDocumentLayout(target: DocumentTargetEntity): Promise<PreviewResponse> {
  const supabase = await createClient()

  if (target === 'quote') {
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
      .eq('approval_status', '承認済み')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !quote) {
      return { success: false, message: 'プレビューに利用できる承認済み見積がありません' }
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
      .eq('target_entity', 'quote')
      .maybeSingle()

    const layout = mergeDocumentLayoutConfig('quote', layoutData ?? undefined)
    const base64 = await buildPdfBase64(QuotePDF({ quote, companyInfo, layout }))
    return { success: true, message: 'プレビュー生成が完了しました', base64 }
  }

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
    .eq('approval_status', '承認済み')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !order) {
    return { success: false, message: 'プレビューに利用できる承認済み発注書がありません' }
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

  const layout = mergeDocumentLayoutConfig('purchase_order', layoutData ?? undefined)

  const supplier = firstRelation(order.supplier)
  const quoteRecordRaw = firstRelation(order.quote)
  const quoteProject = quoteRecordRaw ? firstRelation(quoteRecordRaw.project) : null
  const quoteCustomer = quoteProject ? firstRelation(quoteProject.customer) : null
  const quoteRecord = quoteRecordRaw
    ? {
        quote_number: quoteRecordRaw.quote_number ?? null,
        project: quoteProject
          ? {
              project_name: quoteProject.project_name ?? null,
              project_number: quoteProject.project_number ?? null,
              customer: quoteCustomer ? { customer_name: quoteCustomer.customer_name ?? null } : undefined,
            }
          : null,
      }
    : null
  const orderItems = ensureArrayRelation(order.items)
  const items = orderItems.map((item, index) => {
    const quoteItem = firstRelation(item.quote_item)
    return {
      line_number: quoteItem?.line_number ?? index + 1,
      name: item.manual_name || quoteItem?.product_name || `明細${index + 1}`,
      description: item.manual_description || quoteItem?.description || null,
      quantity: Number(item.quantity || 0),
      unit_cost: Number(item.unit_cost || 0),
      amount: Number(item.amount || 0),
    }
  })

  const base64 = await buildPdfBase64(
    PurchaseOrderPDF({
      order: {
        purchase_order_number: order.purchase_order_number,
        order_date: order.order_date,
        status: order.status,
        total_cost: Number(order.total_cost || 0),
        notes: order.notes,
        supplier: supplier
          ? {
              supplier_name: supplier.supplier_name ?? null,
              address: supplier.address ?? null,
              phone: supplier.phone ?? null,
              email: supplier.email ?? null,
            }
          : null,
        quote: quoteRecord || null,
      },
      companyInfo,
      items,
      layout,
    }),
  )

  return { success: true, message: 'プレビュー生成が完了しました', base64 }
}
