import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '見積システム',
  description: '見積・案件管理システム',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
