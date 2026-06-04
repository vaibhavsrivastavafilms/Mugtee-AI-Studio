'use client'

import { Clock, Smartphone } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  QUICK_DURATION_OPTIONS,
  QUICK_PLATFORM_OPTIONS,
  type QuickPlatformValue,
} from '@/lib/studio/quick-create-options'

type QuickCreateControlsProps = {
  duration: number
  platform: QuickPlatformValue
  onDurationChange: (seconds: number) => void
  onPlatformChange: (platform: QuickPlatformValue) => void
  className?: string
  disabled?: boolean
}

export function QuickCreateControls({
  duration,
  platform,
  onDurationChange,
  onPlatformChange,
  className,
  disabled,
}: QuickCreateControlsProps) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-2', className)}>
      <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2">
        <Clock className="w-3.5 h-3.5 text-violet-300/70 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] tracking-[0.2em] uppercase text-luxe/45">Duration</p>
          <Select
            value={String(duration)}
            onValueChange={(v) => onDurationChange(Number(v))}
            disabled={disabled}
          >
            <SelectTrigger className="h-7 border-0 bg-transparent p-0 text-xs text-luxe/90 focus:ring-0 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUICK_DURATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2">
        <Smartphone className="w-3.5 h-3.5 text-cyan-400/70 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] tracking-[0.2em] uppercase text-luxe/45">Platform</p>
          <Select
            value={platform}
            onValueChange={(v) => onPlatformChange(v as QuickPlatformValue)}
            disabled={disabled}
          >
            <SelectTrigger className="h-7 border-0 bg-transparent p-0 text-xs text-luxe/90 focus:ring-0 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUICK_PLATFORM_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
