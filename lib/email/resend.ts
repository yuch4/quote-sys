import { Resend } from 'resend'

// Resendクライアントの初期化
const resend = new Resend(process.env.RESEND_API_KEY)

export { resend }

// メール送信の基本設定
export const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev'
export const SYSTEM_NAME = '見積システム'
export const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
