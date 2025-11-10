'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  link_url: string | null
  is_read: boolean
  created_at: string
}

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const loadNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.is_read).length)
    }
  }, [supabase, userId])

  useEffect(() => {
    loadNotifications()

    // リアルタイム購読
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadNotifications, supabase, userId])

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    loadNotifications()
  }

  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    loadNotifications()
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case '見積承認':
        return 'bg-green-100 text-green-800'
      case '見積差戻':
        return 'bg-red-100 text-red-800'
      case '計上承認':
        return 'bg-blue-100 text-blue-800'
      case '計上差戻':
        return 'bg-yellow-100 text-yellow-800'
      case '入荷完了':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 text-gray-600 hover:text-gray-900">
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>通知</SheetTitle>
          <SheetDescription>
            {unreadCount > 0 ? `${unreadCount}件の未読通知があります` : '新しい通知はありません'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="w-full"
            >
              すべて既読にする
            </Button>
          )}

          <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">通知はありません</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    notification.is_read ? 'bg-white' : 'bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="secondary"
                          className={getTypeColor(notification.type)}
                        >
                          {notification.type}
                        </Badge>
                        {!notification.is_read && (
                          <span className="text-xs text-blue-600 font-semibold">NEW</span>
                        )}
                      </div>
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notification.created_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        既読
                      </Button>
                    )}
                  </div>
                  {notification.link_url && (
                    <Link
                      href={notification.link_url}
                      className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                      onClick={() => {
                        markAsRead(notification.id)
                        setOpen(false)
                      }}
                    >
                      詳細を見る →
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
