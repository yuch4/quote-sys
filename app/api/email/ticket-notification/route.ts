import { NextRequest, NextResponse } from 'next/server'
import { resend, EMAIL_FROM, SYSTEM_NAME, BASE_URL } from '@/lib/email/resend'
import { createClient } from '@/lib/supabase/server'
import type { KnowledgeTicket } from '@/types/knowledge'
import { TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS, TICKET_CATEGORY_LABELS } from '@/types/knowledge'

interface TicketNotificationRequest {
  type: 'ticket_created' | 'ticket_updated' | 'ticket_resolved' | 'ticket_comment' | 'ticket_assigned'
  ticketId: string
  recipientEmail: string
  recipientName?: string
  additionalInfo?: {
    commentContent?: string
    assignedBy?: string
    statusChange?: string
    updatedBy?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: TicketNotificationRequest = await request.json()
    const { type, ticketId, recipientEmail, recipientName, additionalInfo } = body

    // チケット情報を取得
    const supabase = await createClient()
    const { data: ticket, error } = await supabase
      .from('knowledge_tickets')
      .select(`
        *,
        customer:customers(customer_name),
        group_company:group_companies(company_name),
        assigned_user:users!knowledge_tickets_assigned_to_fkey(display_name),
        created_by_user:users!knowledge_tickets_created_by_fkey(display_name)
      `)
      .eq('id', ticketId)
      .single()

    if (error || !ticket) {
      return NextResponse.json(
        { error: 'チケットが見つかりません' },
        { status: 404 }
      )
    }

    const ticketUrl = `${BASE_URL}/portal/tickets/${ticketId}`
    const companyName = ticket.customer?.customer_name || ticket.group_company?.company_name || '未設定'

    let subject: string
    let htmlContent: string

    switch (type) {
      case 'ticket_created':
        subject = `【${SYSTEM_NAME}】チケットを受付しました - ${ticket.ticket_number}`
        htmlContent = generateCreatedEmail(ticket, ticketUrl, companyName, recipientName)
        break

      case 'ticket_updated':
        subject = `【${SYSTEM_NAME}】チケットが更新されました - ${ticket.ticket_number}`
        htmlContent = generateUpdatedEmail(ticket, ticketUrl, companyName, additionalInfo?.statusChange, additionalInfo?.updatedBy)
        break

      case 'ticket_resolved':
        subject = `【${SYSTEM_NAME}】チケットが解決されました - ${ticket.ticket_number}`
        htmlContent = generateResolvedEmail(ticket, ticketUrl, companyName, recipientName)
        break

      case 'ticket_comment':
        subject = `【${SYSTEM_NAME}】チケットにコメントが追加されました - ${ticket.ticket_number}`
        htmlContent = generateCommentEmail(ticket, ticketUrl, companyName, additionalInfo?.commentContent)
        break

      case 'ticket_assigned':
        subject = `【${SYSTEM_NAME}】チケットの担当者が割り当てられました - ${ticket.ticket_number}`
        htmlContent = generateAssignedEmail(ticket, ticketUrl, companyName, additionalInfo?.assignedBy)
        break

      default:
        return NextResponse.json(
          { error: '不正な通知タイプです' },
          { status: 400 }
        )
    }

    // メール送信
    const { data, error: sendError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: recipientEmail,
      subject,
      html: htmlContent,
    })

    if (sendError) {
      console.error('Failed to send ticket notification email:', sendError)
      return NextResponse.json(
        { error: 'メール送信に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, messageId: data?.id })
  } catch (error) {
    console.error('Ticket notification error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// ベーススタイル
const baseStyles = `
  body { font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, #1E2938 0%, #2d3a4a 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
  .header h1 { margin: 0; font-size: 24px; }
  .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
  .ticket-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
  .ticket-info table { width: 100%; border-collapse: collapse; }
  .ticket-info td { padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
  .ticket-info td:first-child { font-weight: 600; color: #666; width: 120px; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
  .status-open { background: #fef3c7; color: #92400e; }
  .status-in_progress { background: #dbeafe; color: #1e40af; }
  .status-pending { background: #f1f5f9; color: #475569; }
  .status-resolved { background: #ccfbf1; color: #0f766e; }
  .status-closed { background: #f3f4f6; color: #374151; }
  .priority-low { color: #6b7280; }
  .priority-normal { color: #2563eb; }
  .priority-high { color: #ea580c; }
  .priority-urgent { color: #dc2626; font-weight: bold; }
  .btn { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
  .btn:hover { background: #0284c7; }
  .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  .description { background: #fff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 15px 0; }
`

function generateCreatedEmail(ticket: KnowledgeTicket, ticketUrl: string, companyName: string, recipientName?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📩 お問い合わせを受け付けました</h1>
        </div>
        <div class="content">
          <p>${recipientName ? `${recipientName} 様` : 'お客様'}</p>
          <p>この度はお問い合わせいただきありがとうございます。<br>以下の内容でチケットを作成いたしました。</p>
          
          <div class="ticket-info">
            <table>
              <tr><td>チケット番号</td><td><strong>${ticket.ticket_number}</strong></td></tr>
              <tr><td>件名</td><td>${ticket.title}</td></tr>
              <tr><td>会社名</td><td>${companyName}</td></tr>
              <tr><td>カテゴリ</td><td>${TICKET_CATEGORY_LABELS[ticket.category as keyof typeof TICKET_CATEGORY_LABELS] || ticket.category}</td></tr>
              <tr><td>優先度</td><td class="priority-${ticket.priority}">${TICKET_PRIORITY_LABELS[ticket.priority]}</td></tr>
              <tr><td>ステータス</td><td><span class="status-badge status-${ticket.status}">${TICKET_STATUS_LABELS[ticket.status]}</span></td></tr>
            </table>
          </div>

          <div class="description">
            <strong>お問い合わせ内容:</strong><br>
            ${ticket.description.replace(/\n/g, '<br>')}
          </div>

          <p>担当者が確認次第、順次対応させていただきます。</p>
          
          <a href="${ticketUrl}" class="btn">チケットを確認する →</a>
        </div>
        <div class="footer">
          <p>このメールは${SYSTEM_NAME}から自動送信されています。</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateUpdatedEmail(ticket: KnowledgeTicket, ticketUrl: string, companyName: string, statusChange?: string, updatedBy?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔄 チケットが更新されました</h1>
        </div>
        <div class="content">
          <p>チケットの内容が更新されました。</p>
          
          <div class="ticket-info">
            <table>
              <tr><td>チケット番号</td><td><strong>${ticket.ticket_number}</strong></td></tr>
              <tr><td>件名</td><td>${ticket.title}</td></tr>
              <tr><td>会社名</td><td>${companyName}</td></tr>
              <tr><td>ステータス</td><td><span class="status-badge status-${ticket.status}">${TICKET_STATUS_LABELS[ticket.status]}</span></td></tr>
              ${statusChange ? `<tr><td>変更内容</td><td>${statusChange}</td></tr>` : ''}
              ${updatedBy ? `<tr><td>更新者</td><td>${updatedBy}</td></tr>` : ''}
            </table>
          </div>
          
          <a href="${ticketUrl}" class="btn">チケットを確認する →</a>
        </div>
        <div class="footer">
          <p>このメールは${SYSTEM_NAME}から自動送信されています。</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateResolvedEmail(ticket: KnowledgeTicket, ticketUrl: string, companyName: string, recipientName?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);">
          <h1>✅ チケットが解決されました</h1>
        </div>
        <div class="content">
          <p>${recipientName ? `${recipientName} 様` : 'お客様'}</p>
          <p>お問い合わせいただいた件について、対応が完了いたしました。</p>
          
          <div class="ticket-info">
            <table>
              <tr><td>チケット番号</td><td><strong>${ticket.ticket_number}</strong></td></tr>
              <tr><td>件名</td><td>${ticket.title}</td></tr>
              <tr><td>会社名</td><td>${companyName}</td></tr>
              <tr><td>ステータス</td><td><span class="status-badge status-resolved">解決済み</span></td></tr>
            </table>
          </div>

          <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
          
          <a href="${ticketUrl}" class="btn">チケットを確認する →</a>
        </div>
        <div class="footer">
          <p>このメールは${SYSTEM_NAME}から自動送信されています。</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateCommentEmail(ticket: KnowledgeTicket, ticketUrl: string, companyName: string, commentContent?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💬 新しいコメントが追加されました</h1>
        </div>
        <div class="content">
          <p>チケットに新しいコメントが追加されました。</p>
          
          <div class="ticket-info">
            <table>
              <tr><td>チケット番号</td><td><strong>${ticket.ticket_number}</strong></td></tr>
              <tr><td>件名</td><td>${ticket.title}</td></tr>
              <tr><td>会社名</td><td>${companyName}</td></tr>
            </table>
          </div>

          ${commentContent ? `
          <div class="description">
            <strong>コメント内容:</strong><br>
            ${commentContent.replace(/\n/g, '<br>')}
          </div>
          ` : ''}
          
          <a href="${ticketUrl}" class="btn">チケットを確認する →</a>
        </div>
        <div class="footer">
          <p>このメールは${SYSTEM_NAME}から自動送信されています。</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateAssignedEmail(ticket: KnowledgeTicket, ticketUrl: string, companyName: string, assignedBy?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>👤 担当者が割り当てられました</h1>
        </div>
        <div class="content">
          <p>チケットの担当者が割り当てられました。</p>
          
          <div class="ticket-info">
            <table>
              <tr><td>チケット番号</td><td><strong>${ticket.ticket_number}</strong></td></tr>
              <tr><td>件名</td><td>${ticket.title}</td></tr>
              <tr><td>会社名</td><td>${companyName}</td></tr>
              <tr><td>担当者</td><td><strong>${ticket.assigned_user?.display_name || '未設定'}</strong></td></tr>
              ${assignedBy ? `<tr><td>割当者</td><td>${assignedBy}</td></tr>` : ''}
            </table>
          </div>
          
          <a href="${ticketUrl}" class="btn">チケットを確認する →</a>
        </div>
        <div class="footer">
          <p>このメールは${SYSTEM_NAME}から自動送信されています。</p>
        </div>
      </div>
    </body>
    </html>
  `
}
