import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const resolveRedirectUrl = (request: Request) => {
  const origin = request.headers.get('origin')
  if (origin) {
    return new URL('/login', origin)
  }
  const requestUrl = new URL(request.url)
  return new URL('/login', `${requestUrl.protocol}//${requestUrl.host}`)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(resolveRedirectUrl(request), { status: 303 })
}
