'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ChevronRight, Lightbulb, Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { quickCutStudioHref } from '@/lib/create/routes'
import {
  addQueueIdea,
  getCreatorQueue,
  nextQueueStatus,
  QUEUE_STATUS_LABEL,
  removeQueueItem,
  updateQueueItemStatus,
  type CreatorQueueItem,
  type CreatorQueueStatus,
} from '@/lib/creator/creator-queue'

const STATUS_STYLE: Record<CreatorQueueStatus, string> = {
  idea: 'border-white/[0.08] text-luxe/60',
  ready: 'border-gold-500/20 text-gold-300/80',
  in_progress: 'border-gold-500/35 text-gold-200 bg-gold-500/[0.06]',
  exported: 'border-emerald-500/25 text-emerald-300/80',
}

export function CreatorQueue({ className }: { className?: string }) {
  const { user } = useAuthHydration()
  const [items, setItems] = useState<CreatorQueueItem[]>([])
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)

  const refresh = useCallback(() => {
    if (!user?.id) {
      setItems([])
      return
    }
    setItems(getCreatorQueue(user.id))
  }, [user?.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleAdd = () => {
    if (!user?.id || draft.trim().length < 4) return
    addQueueIdea(user.id, { title: draft.trim().slice(0, 60), prompt: draft.trim() })
    setDraft('')
    setAdding(false)
    refresh()
  }

  const handleAdvance = (item: CreatorQueueItem) => {
    if (!user?.id) return
    const next = nextQueueStatus(item.status)
    if (next === item.status) return
    updateQueueItemStatus(user.id, item.id, next)
    refresh()
  }

  const handleRemove = (id: string) => {
    if (!user?.id) return
    removeQueueItem(user.id, id)
    refresh()
  }

  if (!user) return null

  const activeItems = items.filter((i) => i.status !== 'exported')
  const exportedItems = items.filter((i) => i.status === 'exported')

  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between gap-3 px-0.5">
        <div>
          <p className="text-[10px] tracking-[0.28em] uppercase text-gold-400/70">
            Creator Queue
          </p>
          <p className="text-xs text-luxe/45 mt-0.5">Ideas waiting for their moment</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-gold-300/80 hover:text-gold-200 transition-colors"
        >
          {adding ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {adding ? 'Cancel' : 'Add idea'}
        </button>
      </div>

      <AnimatePresence>
        {adding ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="A hook, a scene, a feeling — capture it before it fades…"
                rows={2}
                className={cn(
                  'w-full resize-none rounded-lg bg-black/40 border border-white/[0.06]',
                  'px-3 py-2 text-sm text-luxe placeholder:text-luxe/30',
                  'focus:outline-none focus:border-gold-500/30'
                )}
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={draft.trim().length < 4}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm',
                  'bg-gold-gradient text-black font-medium disabled:opacity-40'
                )}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                Save idea
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!activeItems.length && !exportedItems.length ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center">
          <Lightbulb className="w-7 h-7 text-gold-400/35 mx-auto mb-2" />
          <p className="text-sm text-luxe/50">Your queue is empty — save an idea for later.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeItems.map((item) => (
            <QueueRow
              key={item.id}
              item={item}
              onAdvance={() => handleAdvance(item)}
              onRemove={() => handleRemove(item.id)}
            />
          ))}
          {exportedItems.length > 0 ? (
            <p className="text-[10px] tracking-[0.2em] uppercase text-luxe/30 pt-3">
              Exported ({exportedItems.length})
            </p>
          ) : null}
          {exportedItems.slice(0, 3).map((item) => (
            <QueueRow
              key={item.id}
              item={item}
              onAdvance={() => handleAdvance(item)}
              onRemove={() => handleRemove(item.id)}
              muted
            />
          ))}
        </div>
      )}
    </section>
  )
}

function QueueRow({
  item,
  onAdvance,
  onRemove,
  muted = false,
}: {
  item: CreatorQueueItem
  onAdvance: () => void
  onRemove: () => void
  muted?: boolean
}) {
  const startHref = quickCutStudioHref({ topic: item.prompt })
  const canStart = item.status === 'idea' || item.status === 'ready'
  const canAdvance = item.status !== 'exported'

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-xl border p-3 transition-colors',
        STATUS_STYLE[item.status],
        muted && 'opacity-60'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[9px] tracking-[0.2em] uppercase mb-1">
          {QUEUE_STATUS_LABEL[item.status]}
        </p>
        <p className="text-sm text-luxe/85 line-clamp-2">{item.prompt}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {canStart ? (
          <Link
            href={startHref}
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px]',
              'tracking-[0.16em] uppercase bg-gold-500/15 text-gold-200',
              'hover:bg-gold-500/25 transition-colors'
            )}
          >
            Start <ArrowRight className="w-3 h-3" />
          </Link>
        ) : null}
        {canAdvance ? (
          <button
            type="button"
            onClick={onAdvance}
            title="Advance status"
            className="p-1.5 rounded-lg text-luxe/40 hover:text-gold-300 hover:bg-white/[0.04] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRemove}
          title="Remove"
          className="p-1.5 rounded-lg text-luxe/30 hover:text-red-300/80 hover:bg-white/[0.04] transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
