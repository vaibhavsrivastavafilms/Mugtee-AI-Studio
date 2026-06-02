'use client'

import { useLayoutEffect, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Trash2, X as XIcon } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

const PANEL_WIDTH = 360

export type NotificationItem = {
  id: string
  title: string
  message?: string | null
  created_at: string
  read: boolean
  link?: string | null
}

type NotificationPanelProps = {
  open: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
  notifications: NotificationItem[]
  unreadCount: number
  markAllRead: () => void
  deleteNotification: (id: string) => void
  onNotifClick: (n: NotificationItem) => void
  showTimestamps?: boolean
}

export function NotificationPanel({
  open,
  onClose,
  anchorRef,
  notifications,
  unreadCount,
  markAllRead,
  deleteNotification,
  onNotifClick,
  showTimestamps = false,
}: NotificationPanelProps) {
  const [desktopPos, setDesktopPos] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  useLayoutEffect(() => {
    if (!open) {
      setDesktopPos(null)
      return
    }

    const update = () => {
      const anchor = anchorRef.current
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches
      if (!anchor || !isDesktop) {
        setDesktopPos(null)
        return
      }
      const rect = anchor.getBoundingClientRect()
      const width = Math.min(PANEL_WIDTH, window.innerWidth - 16)
      const left = Math.min(
        Math.max(8, rect.right - width),
        window.innerWidth - width - 8
      )
      setDesktopPos({
        top: rect.bottom + 8,
        left,
        width,
      })
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, anchorRef])

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <AnimatePresence>
        {open ? (
          <motion.button
            key="notif-backdrop"
            type="button"
            aria-label="Close notifications"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm lg:hidden"
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="notif-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={
              desktopPos
                ? {
                    top: desktopPos.top,
                    left: desktopPos.left,
                    width: desktopPos.width,
                    maxHeight: 'min(70vh, calc(100dvh - 5rem))',
                  }
                : undefined
            }
            className={cn(
              'fixed z-[100] isolate overflow-hidden flex flex-col',
              'rounded-2xl lg:rounded-xl border border-white/[0.08]',
              'bg-zinc-950 shadow-cinema',
              desktopPos
                ? undefined
                : 'left-2 right-2 top-[68px] max-h-[80vh] lg:max-h-[70vh]'
            )}
          >
            <div className="flex items-center justify-between p-3 border-b border-white/[0.06] shrink-0 bg-zinc-950">
              <div className="text-sm font-medium">Notifications</div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => markAllRead()}
                    className="text-[11px] text-gold-300 hover:text-gold-200 inline-flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-gold-500/10 min-h-[32px]"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-white/5 text-muted-foreground hover:text-luxe"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto scrollbar-luxe flex-1 overscroll-contain bg-zinc-950">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">All caught up.</div>
              ) : (
                notifications.slice(0, 30).map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'group flex items-start gap-2 px-3 py-3 sm:py-2.5 border-b border-white/[0.04]',
                      !n.read && 'bg-gold-500/[0.04]'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onNotifClick(n)}
                      className="flex flex-1 min-w-0 items-start gap-2 text-left hover:bg-white/[0.03] -my-2.5 py-2.5 -ml-3 pl-3 rounded-none"
                    >
                      <div
                        className={cn(
                          'mt-1 w-1.5 h-1.5 rounded-full shrink-0',
                          n.read ? 'bg-transparent' : 'bg-gold-400 shadow-gold-glow'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{n.title}</div>
                        {n.message ? (
                          <div className="text-xs text-muted-foreground line-clamp-2 sm:truncate">
                            {n.message}
                          </div>
                        ) : null}
                        {showTimestamps ? (
                          <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                            {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true })}
                          </div>
                        ) : null}
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-label="Delete notification"
                      onClick={() => deleteNotification(n.id)}
                      className="p-2 rounded hover:bg-white/5 text-muted-foreground hover:text-red-300 shrink-0 lg:opacity-0 lg:group-hover:opacity-100 min-w-[36px] min-h-[36px] inline-flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>,
    document.body
  )
}
