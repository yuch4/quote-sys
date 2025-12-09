'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowRight, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError('メールアドレスまたはパスワードが正しくありません')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      console.error('ログインエラー:', error)
      setError('ログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[oklch(0.22_0.04_250)] via-[oklch(0.28_0.05_245)] to-[oklch(0.20_0.06_260)]">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full" 
                 style={{
                   backgroundImage: `
                     radial-gradient(circle at 20% 20%, oklch(0.65 0.12 195 / 0.4) 0%, transparent 40%),
                     radial-gradient(circle at 80% 80%, oklch(0.75 0.12 85 / 0.3) 0%, transparent 40%),
                     radial-gradient(circle at 40% 70%, oklch(0.55 0.18 195 / 0.2) 0%, transparent 30%)
                   `
                 }} 
            />
          </div>
          {/* Geometric Pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="space-y-8 max-w-lg">
            {/* Logo Mark */}
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[oklch(0.65_0.12_195)] to-[oklch(0.55_0.18_195)] flex items-center justify-center shadow-2xl shadow-cyan-500/20">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
            </div>
            
            <h1 className="text-5xl font-bold tracking-tight leading-tight">
              見積管理を
              <br />
              <span className="bg-gradient-to-r from-[oklch(0.65_0.12_195)] via-[oklch(0.75_0.12_85)] to-[oklch(0.65_0.12_195)] bg-clip-text text-transparent">
                もっとスマートに
              </span>
            </h1>
            
            <p className="text-lg text-white/70 leading-relaxed">
              案件管理から見積作成、承認フローまで。
              ビジネスの効率化をサポートする
              オールインワンソリューション。
            </p>
            
            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3 pt-4">
              {['案件管理', '見積作成', '承認フロー', '請求連携'].map((feature, i) => (
                <span 
                  key={feature}
                  className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium text-white/90 border border-white/10"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
          
          {/* Bottom Decoration */}
          <div className="absolute bottom-8 left-16 right-16 flex items-center gap-4 text-white/40 text-sm">
            <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
            <span>Quote System</span>
            <div className="h-px flex-1 bg-gradient-to-l from-white/20 to-transparent" />
          </div>
        </div>
      </div>
      
      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gradient-to-br from-background via-background to-muted/30">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-foreground">Quote System</span>
            </div>
          </div>
          
          <Card className="border-0 shadow-2xl shadow-black/5 bg-card/80 backdrop-blur-xl">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl font-bold tracking-tight">
                おかえりなさい
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                アカウントにログインして作業を続けましょう
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5" aria-busy={loading}>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    メールアドレス
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 px-4 bg-muted/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    パスワード
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 px-4 bg-muted/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
                
                {error && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    {error}
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary via-primary to-[oklch(0.40_0.08_250)] hover:opacity-90 transition-all duration-300 shadow-lg shadow-primary/25 group" 
                  disabled={loading} 
                  aria-busy={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                      ログイン中...
                    </>
                  ) : (
                    <>
                      ログイン
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Quote System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
