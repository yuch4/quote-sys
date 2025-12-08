import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function PortalLoginPage() {
  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          ログインが必要です
        </h1>
        <p className="text-gray-600 mb-6">
          カスタマーポータルにアクセスするには、
          招待リンクからログインしてください。
        </p>
        <p className="text-sm text-gray-500">
          招待リンクをお持ちでない場合は、
          担当者にお問い合わせください。
        </p>
      </div>
    </div>
  )
}
