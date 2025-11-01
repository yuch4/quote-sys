import { NextRequest, NextResponse } from 'next/server'
import { sendLongDelayAlertEmail } from '@/lib/email/send'

// Cron Jobから呼び出されるエンドポイント
// Vercel Cron、GitHub Actions、外部Cronサービスから利用可能
export async function GET(request: NextRequest) {
  try {
    // 認証トークンで保護（オプション）
    const authToken = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET
    
    if (expectedToken && authToken !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 長期未入荷アラートを送信
    const result = await sendLongDelayAlertEmail()

    return NextResponse.json({
      success: true,
      message: 'Long delay alert sent',
      result,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Failed to send alert', details: error },
      { status: 500 }
    )
  }
}

// POSTリクエストでも実行可能（手動トリガー用）
export async function POST(request: NextRequest) {
  return GET(request)
}
