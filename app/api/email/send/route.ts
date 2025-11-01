import { NextRequest, NextResponse } from 'next/server'
import { resend, EMAIL_FROM } from '@/lib/email/resend'
import { generateQuoteApprovalEmail, generateBillingRequestEmail, generateLongDelayAlertEmail } from '@/lib/email/templates'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...data } = body

    let html = ''
    let subject = ''
    let to = ''

    switch (type) {
      case 'quote_approval':
        html = generateQuoteApprovalEmail(data)
        subject = `【${data.status}】見積承認通知 - ${data.quoteNumber}`
        to = data.recipientEmail
        break

      case 'billing_request':
        html = generateBillingRequestEmail(data)
        const requestTypeText = data.requestType === 'new' ? '新規申請' : 
                                data.requestType === 'approved' ? '承認' : '差戻し'
        subject = `【計上${requestTypeText}】${data.projectName}`
        to = data.recipientEmail
        break

      case 'long_delay_alert':
        html = generateLongDelayAlertEmail(data)
        subject = `【アラート】長期未入荷明細 (${data.items.length}件)`
        to = data.recipientEmail
        break

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        )
    }

    const { data: emailData, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Email send error:', error)
      return NextResponse.json(
        { error: 'Failed to send email', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: emailData })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
