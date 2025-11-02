/**
 * Supabaseユーザー確認スクリプト
 * 
 * 使用方法:
 * TEST_USER_EMAIL="y.hisano@mail.rinnet.co.jp" TEST_USER_PASSWORD="rinnetadmin" node check-users.mjs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('環境変数が設定されていません')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '[設定済み]' : '[未設定]')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkLogin() {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD

  console.log('\n=== ログインテスト ===')
  console.log(`Email: ${email}`)
  console.log(`Password: ${'*'.repeat(password?.length || 0)}`)

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('\n❌ ログイン失敗')
    console.error('エラー:', error.message)
    console.error('詳細:', error)
    return false
  }

  console.log('\n✅ ログイン成功')
  console.log('ユーザーID:', data.user?.id)
  console.log('Email:', data.user?.email)
  
  // public.usersテーブルからユーザー情報を取得
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (userError) {
    console.error('\n⚠️  public.usersテーブルにユーザーが見つかりません')
    console.error('エラー:', userError.message)
    return false
  }

  console.log('\n✅ public.usersテーブルのユーザー情報:')
  console.log('表示名:', userData.display_name)
  console.log('役割:', userData.role)
  console.log('部署:', userData.department)
  console.log('アクティブ:', userData.is_active)

  return true
}

async function main() {
  console.log('=== Supabaseユーザー確認 ===\n')
  console.log('Supabase URL:', supabaseUrl)

  const users = [
    { email: 'y.hisano@mail.rinnet.co.jp', role: '基本ユーザー' },
    { email: 'hsnyk9094@gmail.com', role: '営業担当者' },
    { email: 'yuukihisano@gmail.com', role: '承認者' },
    { email: 'soc-team@mail.rinnet.co.jp', role: '管理者' },
  ]

  for (const user of users) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`${user.role}: ${user.email}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━`)
    
    process.env.TEST_USER_EMAIL = user.email
    process.env.TEST_USER_PASSWORD = 'rinnetadmin'
    
    await checkLogin()
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

main().catch(console.error)
