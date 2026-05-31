'use client'

import { MOTION_PRESET_LIST, motionPresetLabel, type MotionPresetId } from '@/lib/motion/motion-presets'
import { cn } from '@/lib/utils'

export function MotionPresetBadge({
  presetId,
  className,
}: {
  presetId?: MotionPresetId | null
  className?: string
}) {
  if (!presetId) return null
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5',
        'border border-gold-500/25 bg-gold-500/10',
        'text-[8px] tracking-[0.14em] uppercase text-gold-200/85',
        className
      )}
    >
      {motionPresetLabel(presetId)}
    </span>
  )
}

export function MotionPresetSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value?: MotionPresetId | null
  onChange?: (presetId: MotionPresetId) => void
  disabled?: boolean
  className?: string
}) {
  if (!onChange) {
    return <MotionPresetBadge presetId={value} className={className} />
  }

  return (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as MotionPresetId)}
      className={cn(
        'max-w-[120px] rounded border border-white/10 bg-black/60',
        'text-[9px] tracking-wide uppercase text-gold-200/90 px-1.5 py-0.5',
        'focus:outline-none focus:border-gold-500/40',
        className
      )}
      aria-label="Scene motion preset"
    >
      {MOTION_PRESET_LIST.map((preset) => (
        <option key={preset.id} value={preset.id}>
          {preset.name}
        </option>
      ))}
    </select>
  )
}
