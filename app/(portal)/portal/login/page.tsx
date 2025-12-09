import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Lock, Mail, ArrowRight } from 'lucide-react'

export default function PortalLoginPage() {
  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/5 border border-border/50 p-8 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-[oklch(0.65_0.12_195_/_0.15)] to-[oklch(0.55_0.18_195_/_0.05)] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[oklch(0.65_0.12_195_/_0.2)]">
          <Lock className="w-10 h-10 text-[oklch(0.55_0.18_195)]" />
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-3">
          ログインが必要です
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          カスタマーポータルにアクセスするには、
          招待リンクからログインしてください。
        </p>
        
        <div className="p-4 rounded-xl bg-muted/50 border border-border/50 mb-6">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2 rounded-lg bg-[oklch(0.75_0.12_85_/_0.1)]">
              <Mail className="w-5 h-5 text-[oklch(0.65_0.15_85)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">招待メールを確認</p>
              <p className="text-xs text-muted-foreground">メール内のリンクからアクセスしてください</p>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground">
          招待リンクをお持ちでない場合は、<br />
          <span className="text-foreground font-medium">担当者にお問い合わせください</span>
        </p>
      </div>
    </div>
  )
}
