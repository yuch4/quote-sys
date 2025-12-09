import '@/app/globals.css'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'カスタマーポータル | Quote System',
  description: 'お問い合わせチケットの確認とナレッジベースの閲覧',
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* ヘッダー */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[oklch(0.65_0.12_195)] via-[oklch(0.55_0.15_195)] to-[oklch(0.50_0.18_210)] rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 transform hover:scale-105 transition-transform duration-200">
                <span className="text-white font-bold text-xl">Q</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  カスタマーポータル
                </h1>
                <p className="text-xs text-muted-foreground">Quote System</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="page-enter">
          {children}
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-card/50 backdrop-blur-sm border-t border-border/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[oklch(0.65_0.12_195)] to-[oklch(0.55_0.18_195)] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">Q</span>
              </div>
              <span className="text-sm font-medium text-muted-foreground">Quote System</span>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} Quote System. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
