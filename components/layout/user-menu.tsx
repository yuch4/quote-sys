'use client'

import { useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type UserMenuProps = {
  userId: string
  name: string
  email?: string | null
  role?: string | null
}

export function UserMenu({ userId, name, email, role }: UserMenuProps) {
  const router = useRouter()
  const logoutFormRef = useRef<HTMLFormElement>(null)
  const initials = useMemo(() => {
    if (!name) return '?'
    const [first, second] = name.trim().split(/\s+/)
    const chars = `${first?.charAt(0) ?? ''}${second?.charAt(0) ?? ''}`
    return chars.toUpperCase() || name.charAt(0).toUpperCase()
  }, [name])

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-200 transition hover:bg-gray-200"
            aria-label="ユーザーメニューを開く"
          >
            {initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900">{name || 'ユーザー'}</span>
              {email ? <span className="text-xs text-gray-500">{email}</span> : null}
            </div>
          </DropdownMenuLabel>
          {role ? <p className="px-2 text-xs text-gray-500">{role}</p> : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              router.push('/dashboard/profile')
            }}
          >
            <Settings className="size-4" />
            ユーザー設定
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              logoutFormRef.current?.requestSubmit()
            }}
          >
            <LogOut className="size-4" />
            ログアウト
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <form ref={logoutFormRef} action="/api/auth/logout" method="POST" className="hidden">
        <input type="hidden" name="userId" value={userId} />
      </form>
    </>
  )
}
