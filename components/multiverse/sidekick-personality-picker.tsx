'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { SIDEKICK_PERSONALITY_PRESETS } from '@/lib/multiverse/sidekick-evolution'
import type { SidekickPersonality, SidekickPersonalityPreset } from '@/lib/multiverse/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function SidekickPersonalityPicker({
  value,
  onChange,
  className,
}: {
  value?: SidekickPersonality
  onChange?: (personality: SidekickPersonality) => void
  className?: string
}) {
  const [selected, setSelected] = useState<SidekickPersonalityPreset>(
    value?.preset ?? 'wise_mentor'
  )
  const [saving, setSaving] = useState(false)

  const handleSelect = async (preset: SidekickPersonalityPreset) => {
    setSelected(preset)
    setSaving(true)
    try {
      const res = await fetch('/api/multiverse/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sidekickPersonality: { preset } }),
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      onChange?.(data.profile.sidekickPersonality)
      toast.success('Sidekick personality updated')
    } catch {
      toast.error('Could not save personality')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/70 mb-1">Sidekick personality</p>
        <p className="text-[11px] text-luxe/50">Shapes commentary tone across generation and dashboard.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SIDEKICK_PERSONALITY_PRESETS.map((preset) => {
          const active = selected === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              disabled={saving}
              onClick={() => void handleSelect(preset.id)}
              className={cn(
                'relative text-left rounded-xl border p-3 transition',
                active ?
                  'border-gold-500/45 bg-gold-500/[0.08]'
                : 'border-white/[0.06] bg-white/[0.02] hover:border-gold-500/25'
              )}
            >
              {active && (
                <Check className="absolute top-2.5 right-2.5 w-3.5 h-3.5 text-gold-300" />
              )}
              <p className="text-sm font-medium text-luxe/85 pr-6">{preset.label}</p>
              <p className="text-[11px] text-luxe/50 mt-0.5 leading-snug">{preset.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
