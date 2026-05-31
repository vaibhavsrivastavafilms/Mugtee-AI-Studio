'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Globe } from 'lucide-react'
import { CREATOR_WORLDS } from '@/lib/multiverse/creator-worlds'
import type { CreatorWorldId } from '@/lib/multiverse/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function WorldSelector({
  selected,
  onSelect,
  compact = false,
}: {
  selected: CreatorWorldId | null
  onSelect?: (world: CreatorWorldId) => void
  compact?: boolean
}) {
  const [saving, setSaving] = useState<string | null>(null)

  const handleSelect = async (worldId: CreatorWorldId) => {
    setSaving(worldId)
    try {
      const res = await fetch('/api/multiverse/world', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world: worldId }),
      })
      if (!res.ok) throw new Error('Failed to save world')
      onSelect?.(worldId)
      toast.success(`${CREATOR_WORLDS.find((w) => w.id === worldId)?.label} world selected`)
    } catch {
      toast.error('Could not save world selection')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      {!compact && (
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-gold-400" />
          <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/70">Choose your world</p>
        </div>
      )}
      <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2')}>
        {CREATOR_WORLDS.map((world) => {
          const active = selected === world.id
          const loading = saving === world.id
          return (
            <motion.button
              key={world.id}
              type="button"
              disabled={!!saving}
              onClick={() => void handleSelect(world.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                'relative text-left rounded-xl border p-3 sm:p-4 transition',
                'bg-gradient-to-br',
                world.accent,
                active ?
                  'border-gold-500/50 ring-1 ring-gold-500/20'
                : 'border-white/[0.06] hover:border-gold-500/25'
              )}
            >
              {active && (
                <span className="absolute top-2.5 right-2.5 text-gold-300">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
              <p className="text-sm font-medium text-luxe/90 pr-6">{world.label}</p>
              <p className="text-[11px] text-luxe/50 mt-0.5 leading-snug">{world.tagline}</p>
              {loading && (
                <p className="text-[9px] text-gold-300/70 mt-1 uppercase tracking-wider">Saving…</p>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
