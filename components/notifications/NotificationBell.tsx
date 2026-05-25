'use client'
// components/notifications/NotificationBell.tsx
// Real-time notification bell for the protected layout header.
// Subscribes to Supabase Realtime INSERT on notifications for the current user.

import { useEffect, useState, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { markNotificationRead, markAllNotificationsRead } from '@/lib/notifications/actions'
import type { Notification } from '@/types/notifications'

interface Props {
  initialNotifications: Notification[]
  userId: string
}

export function NotificationBell({ initialNotifications, userId }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [open, setOpen] = useState(false)

  const unread = notifications.filter((n) => !n.read_at).length

  // Supabase Realtime subscription for new notifications
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 10))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const handleMarkRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    )
    await markNotificationRead(id)
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    await markAllNotificationsRead()
  }, [])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-[6px] text-navy-mid hover:bg-paper-border transition-colors"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-[340px] bg-surface border border-paper-border rounded-[8px] shadow-card z-30 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-paper-border">
              <span className="text-[13px] font-semibold text-navy-950">Notifications</span>
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[12px] text-navy-mid hover:text-navy-950 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-[13px] text-navy-mid">
                No notifications
              </div>
            ) : (
              <ul className="divide-y divide-paper-border max-h-[360px] overflow-y-auto">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`px-4 py-3 flex gap-3 items-start ${!n.read_at ? 'bg-paper/60' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      {n.link ? (
                        <Link
                          href={n.link}
                          className="text-[13px] font-medium text-navy-950 hover:underline line-clamp-1"
                          onClick={() => setOpen(false)}
                        >
                          {n.title}
                        </Link>
                      ) : (
                        <p className="text-[13px] font-medium text-navy-950 line-clamp-1">{n.title}</p>
                      )}
                      {n.body && (
                        <p className="text-[12px] text-navy-mid mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[11px] text-navy-mid/60 mt-1">
                        {new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {!n.read_at && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="flex-shrink-0 text-[11px] text-navy-mid hover:text-navy-950 transition-colors mt-0.5"
                        aria-label="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
