import { createClient } from '@/lib/supabase/server'

interface SendEmailParams {
  type: 'quote_approval' | 'billing_request' | 'long_delay_alert'
  recipientEmail: string
  [key: string]: any
}

export async function sendEmail(params: SendEmailParams) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Email send failed:', error)
      return { success: false, error }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

// 見積承認通知を送信
export async function sendQuoteApprovalEmail(
  quoteId: string,
  status: '承認済み' | '却下',
  approverName: string,
  rejectReason?: string
) {
  const supabase = await createClient()

  // 見積情報を取得
  const { data: quote } = await supabase
    .from('quotes')
    .select(`
      *,
      project:projects(
        project_name,
        customer:customers(customer_name),
        sales_rep:users!projects_sales_rep_id_fkey(email, display_name)
      )
    `)
    .eq('id', quoteId)
    .single()

  if (!quote || !quote.project?.sales_rep?.email) {
    console.error('Quote or sales rep email not found')
    return { success: false, error: 'Email recipient not found' }
  }

  const quoteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/quotes/${quoteId}`

  return sendEmail({
    type: 'quote_approval',
    recipientEmail: quote.project.sales_rep.email,
    salesRepName: quote.project.sales_rep.display_name,
    quoteNumber: quote.quote_number,
    projectName: quote.project.project_name,
    customerName: quote.project.customer.customer_name,
    totalAmount: Number(quote.total_amount),
    status,
    approverName,
    rejectReason,
    quoteUrl,
  })
}

// 計上申請通知を送信
export async function sendBillingRequestEmail(
  billingRequestId: string,
  requestType: 'new' | 'approved' | 'rejected'
) {
  const supabase = await createClient()

  // 計上申請情報を取得
  const { data: billingRequest } = await supabase
    .from('billing_requests')
    .select(`
      *,
      quote:quotes(
        quote_number,
        total_amount,
        project:projects(
          project_name,
          customer:customers(customer_name),
          sales_rep:users!projects_sales_rep_id_fkey(email, display_name)
        )
      ),
      requester:users!billing_requests_requested_by_fkey(display_name),
      approver:users!billing_requests_approved_by_fkey(display_name)
    `)
    .eq('id', billingRequestId)
    .single()

  if (!billingRequest) {
    console.error('Billing request not found')
    return { success: false, error: 'Billing request not found' }
  }

  let recipientEmail = ''
  let recipientName = ''

  if (requestType === 'new') {
    // 新規申請: 営業事務へ通知
    const { data: adminUsers } = await supabase
      .from('users')
      .select('email, display_name')
      .in('role', ['営業事務', '管理者'])
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!adminUsers) {
      console.error('No admin user found')
      return { success: false, error: 'No admin user found' }
    }

    recipientEmail = adminUsers.email
    recipientName = adminUsers.display_name
  } else {
    // 承認/差戻し: 営業担当へ通知
    if (!billingRequest.quote?.project?.sales_rep?.email) {
      console.error('Sales rep email not found')
      return { success: false, error: 'Sales rep email not found' }
    }
    recipientEmail = billingRequest.quote.project.sales_rep.email
    recipientName = billingRequest.quote.project.sales_rep.display_name
  }

  const billingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing`

  return sendEmail({
    type: 'billing_request',
    recipientEmail,
    recipientName,
    requestType,
    projectName: billingRequest.quote?.project?.project_name || '',
    customerName: billingRequest.quote?.project?.customer?.customer_name || '',
    quoteNumber: billingRequest.quote?.quote_number || '',
    totalAmount: Number(billingRequest.quote?.total_amount || 0),
    requestDate: new Date(billingRequest.billing_date).toLocaleDateString('ja-JP'),
    requesterName: billingRequest.requester?.display_name,
    approverName: billingRequest.approver?.display_name,
    rejectReason: billingRequest.reject_reason,
    billingUrl,
  })
}

// 長期未入荷アラートを送信
export async function sendLongDelayAlertEmail() {
  const supabase = await createClient()

  // 14日以上未入荷の明細を取得
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const { data: longDelayItems } = await supabase
    .from('quote_items')
    .select(`
      *,
      quote:quotes!inner(
        quote_number,
        project:projects!inner(
          project_name,
          customer:customers(customer_name)
        )
      ),
      supplier:suppliers(supplier_name)
    `)
    .eq('procurement_status', '発注済')
    .lte('ordered_at', fourteenDaysAgo.toISOString())

  if (!longDelayItems || longDelayItems.length === 0) {
    return { success: true, message: 'No long delay items' }
  }

  // 営業事務・管理者にメール送信
  const { data: adminUsers } = await supabase
    .from('users')
    .select('email, display_name')
    .in('role', ['営業事務', '管理者'])
    .eq('is_active', true)

  if (!adminUsers || adminUsers.length === 0) {
    console.error('No admin users found')
    return { success: false, error: 'No admin users found' }
  }

  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/procurement`

  const items = longDelayItems.map((item: any) => {
    const orderedDate = new Date(item.ordered_at)
    const today = new Date()
    const daysElapsed = Math.floor((today.getTime() - orderedDate.getTime()) / (1000 * 60 * 60 * 24))

    return {
      productName: item.product_name,
      projectName: item.quote.project.project_name,
      customerName: item.quote.project.customer.customer_name,
      supplierName: item.supplier?.supplier_name || '未設定',
      orderedDate: orderedDate.toLocaleDateString('ja-JP'),
      daysElapsed,
    }
  })

  // 各管理者にメール送信
  const results = await Promise.all(
    adminUsers.map(user =>
      sendEmail({
        type: 'long_delay_alert',
        recipientEmail: user.email,
        recipientName: user.display_name,
        items,
        dashboardUrl,
      })
    )
  )

  return { success: true, results }
}
