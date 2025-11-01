import { BASE_URL, SYSTEM_NAME } from './resend'

interface QuoteApprovalEmailProps {
  salesRepName: string
  quoteNumber: string
  projectName: string
  customerName: string
  totalAmount: number
  status: '承認済み' | '却下'
  approverName: string
  rejectReason?: string
  quoteUrl: string
}

export function generateQuoteApprovalEmail({
  salesRepName,
  quoteNumber,
  projectName,
  customerName,
  totalAmount,
  status,
  approverName,
  rejectReason,
  quoteUrl,
}: QuoteApprovalEmailProps): string {
  const statusText = status === '承認済み' ? '承認されました' : '却下されました'
  const statusColor = status === '承認済み' ? '#10b981' : '#ef4444'

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { padding: 20px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; }
          .status-badge { display: inline-block; padding: 8px 16px; border-radius: 6px; font-weight: bold; color: white; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .info-row { margin: 10px 0; padding: 10px; background: #f9fafb; border-radius: 4px; }
          .label { font-weight: bold; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #111827;">📧 ${SYSTEM_NAME}</h1>
            <p style="margin: 10px 0 0 0; color: #6b7280;">見積承認通知</p>
          </div>
          
          <div class="content">
            <p>${salesRepName} 様</p>
            
            <p>見積が<span class="status-badge" style="background-color: ${statusColor};">${statusText}</span></p>
            
            <div class="info-row">
              <div><span class="label">見積番号:</span> ${quoteNumber}</div>
            </div>
            <div class="info-row">
              <div><span class="label">案件名:</span> ${projectName}</div>
            </div>
            <div class="info-row">
              <div><span class="label">顧客名:</span> ${customerName}</div>
            </div>
            <div class="info-row">
              <div><span class="label">合計金額:</span> ¥${totalAmount.toLocaleString()}</div>
            </div>
            <div class="info-row">
              <div><span class="label">承認者:</span> ${approverName}</div>
            </div>
            
            ${rejectReason ? `
              <div style="margin-top: 20px; padding: 15px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
                <div style="font-weight: bold; color: #991b1b; margin-bottom: 5px;">却下理由:</div>
                <div style="color: #7f1d1d;">${rejectReason}</div>
              </div>
            ` : ''}
            
            <a href="${quoteUrl}" class="button">見積詳細を確認</a>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              <p>このメールは${SYSTEM_NAME}から自動送信されています。</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

interface BillingRequestEmailProps {
  recipientName: string
  requestType: 'new' | 'approved' | 'rejected'
  projectName: string
  customerName: string
  quoteNumber: string
  totalAmount: number
  requestDate: string
  requesterName?: string
  approverName?: string
  rejectReason?: string
  billingUrl: string
}

export function generateBillingRequestEmail({
  recipientName,
  requestType,
  projectName,
  customerName,
  quoteNumber,
  totalAmount,
  requestDate,
  requesterName,
  approverName,
  rejectReason,
  billingUrl,
}: BillingRequestEmailProps): string {
  let title = ''
  let message = ''
  let statusColor = '#3b82f6'

  switch (requestType) {
    case 'new':
      title = '計上申請が提出されました'
      message = `${requesterName} より計上申請が提出されました。`
      statusColor = '#3b82f6'
      break
    case 'approved':
      title = '計上申請が承認されました'
      message = `${approverName} により計上申請が承認されました。`
      statusColor = '#10b981'
      break
    case 'rejected':
      title = '計上申請が差戻しされました'
      message = `${approverName} により計上申請が差戻しされました。`
      statusColor = '#ef4444'
      break
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { padding: 20px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; }
          .status-badge { display: inline-block; padding: 8px 16px; border-radius: 6px; font-weight: bold; color: white; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .info-row { margin: 10px 0; padding: 10px; background: #f9fafb; border-radius: 4px; }
          .label { font-weight: bold; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #111827;">📧 ${SYSTEM_NAME}</h1>
            <p style="margin: 10px 0 0 0; color: #6b7280;">計上申請通知</p>
          </div>
          
          <div class="content">
            <p>${recipientName} 様</p>
            
            <div style="padding: 15px; background: ${statusColor}15; border-left: 4px solid ${statusColor}; border-radius: 4px; margin: 20px 0;">
              <div style="font-weight: bold; color: ${statusColor}; font-size: 18px;">${title}</div>
              <div style="margin-top: 5px; color: #374151;">${message}</div>
            </div>
            
            <div class="info-row">
              <div><span class="label">案件名:</span> ${projectName}</div>
            </div>
            <div class="info-row">
              <div><span class="label">顧客名:</span> ${customerName}</div>
            </div>
            <div class="info-row">
              <div><span class="label">見積番号:</span> ${quoteNumber}</div>
            </div>
            <div class="info-row">
              <div><span class="label">計上金額:</span> ¥${totalAmount.toLocaleString()}</div>
            </div>
            <div class="info-row">
              <div><span class="label">計上予定日:</span> ${requestDate}</div>
            </div>
            
            ${rejectReason ? `
              <div style="margin-top: 20px; padding: 15px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
                <div style="font-weight: bold; color: #991b1b; margin-bottom: 5px;">差戻し理由:</div>
                <div style="color: #7f1d1d;">${rejectReason}</div>
              </div>
            ` : ''}
            
            <a href="${billingUrl}" class="button">詳細を確認</a>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              <p>このメールは${SYSTEM_NAME}から自動送信されています。</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

interface LongDelayAlertEmailProps {
  recipientName: string
  items: Array<{
    productName: string
    projectName: string
    customerName: string
    supplierName: string
    orderedDate: string
    daysElapsed: number
  }>
  dashboardUrl: string
}

export function generateLongDelayAlertEmail({
  recipientName,
  items,
  dashboardUrl,
}: LongDelayAlertEmailProps): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { padding: 20px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; }
          .alert { padding: 15px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .item { margin: 15px 0; padding: 15px; background: #fef2f2; border-radius: 6px; }
          .label { font-weight: bold; color: #6b7280; }
          .days { display: inline-block; padding: 4px 8px; background: #dc2626; color: white; border-radius: 4px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #111827;">⚠️ ${SYSTEM_NAME}</h1>
            <p style="margin: 10px 0 0 0; color: #6b7280;">長期未入荷アラート</p>
          </div>
          
          <div class="content">
            <p>${recipientName} 様</p>
            
            <div class="alert">
              <div style="font-weight: bold; color: #991b1b; font-size: 18px;">14日以上未入荷の明細があります</div>
              <div style="margin-top: 5px; color: #7f1d1d;">以下の発注明細の入荷確認をお願いします。</div>
            </div>
            
            <div style="margin-top: 20px;">
              <h3 style="color: #111827;">未入荷明細一覧 (${items.length}件)</h3>
              ${items.map(item => `
                <div class="item">
                  <div style="margin-bottom: 10px;">
                    <span class="label">品名:</span> ${item.productName}
                  </div>
                  <div style="margin-bottom: 10px;">
                    <span class="label">案件:</span> ${item.projectName} - ${item.customerName}
                  </div>
                  <div style="margin-bottom: 10px;">
                    <span class="label">仕入先:</span> ${item.supplierName}
                  </div>
                  <div style="margin-bottom: 10px;">
                    <span class="label">発注日:</span> ${item.orderedDate}
                  </div>
                  <div>
                    <span class="label">経過日数:</span> <span class="days">${item.daysElapsed}日</span>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <a href="${dashboardUrl}" class="button">発注ダッシュボードを確認</a>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              <p>このメールは${SYSTEM_NAME}から自動送信されています。</p>
              <p>仕入先への納期確認をお願いします。</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}
