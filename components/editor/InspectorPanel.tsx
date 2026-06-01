'use client'

import { cn } from '@/lib/utils'
import type { TimelineSceneClip, TimelineTransition, TimelineCaptionStyle } from '@/types/timeline'
import { MOTION_PRESET_LIST, type MotionPresetId } from '@/lib/motion/motion-presets'

const TRANSITIONS: TimelineTransition[] = [
  'fade',
  'slide',
  'zoom',
  'crossDissolve',
  'cut',
]

type InspectorPanelProps = {
  scene: TimelineSceneClip | null
  captionStyle: TimelineCaptionStyle
  onCaptionStyleChange: (style: TimelineCaptionStyle) => void
  onDurationChange: (durationSec: number) => void
  onTransitionChange: (transition: TimelineTransition) => void
  onMotionPresetChange: (presetId: MotionPresetId) => void
  className?: string
}

export function InspectorPanel({
  scene,
  captionStyle,
  onCaptionStyleChange,
  onDurationChange,
  onTransitionChange,
  onMotionPresetChange,
  className,
}: InspectorPanelProps) {
  if (!scene) {
    return (
      <div
        className={cn(
          'rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-[11px] text-luxe/45',
          className
        )}
      >
        Select a scene on the timeline to inspect.
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-4',
        className
      )}
    >
      <div>
        <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/70 mb-2">
          Inspector
        </p>
        <p className="text-sm text-luxe/90 font-medium truncate">{scene.title}</p>
      </div>

      <label className="block space-y-1">
        <span className="text-[10px] text-luxe/50">Duration (sec)</span>
        <input
          type="number"
          min={1.5}
          max={15}
          step={0.5}
          value={scene.durationSec}
          onChange={(e) => onDurationChange(Number(e.target.value))}
          className="w-full rounded border border-white/[0.08] bg-black/40 px-2 py-1.5 text-sm text-luxe/90"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] text-luxe/50">Transition</span>
        <select
          value={scene.transition}
          onChange={(e) =>
            onTransitionChange(e.target.value as TimelineTransition)
          }
          className="w-full rounded border border-white/[0.08] bg-black/40 px-2 py-1.5 text-sm text-luxe/90"
        >
          {TRANSITIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] text-luxe/50">Motion preset</span>
        <select
          value={scene.motionPresetId ?? 'historical_push_in'}
          onChange={(e) =>
            onMotionPresetChange(e.target.value as MotionPresetId)
          }
          className="w-full rounded border border-white/[0.08] bg-black/40 px-2 py-1.5 text-sm text-luxe/90"
        >
          {MOTION_PRESET_LIST.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] text-luxe/50">Caption style</span>
        <select
          value={captionStyle}
          onChange={(e) =>
            onCaptionStyleChange(e.target.value as TimelineCaptionStyle)
          }
          className="w-full rounded border border-white/[0.08] bg-black/40 px-2 py-1.5 text-sm text-luxe/90"
        >
          <option value="tiktok">TikTok (word highlight)</option>
          <option value="minimal">Minimal</option>
        </select>
        <p className="text-[9px] text-luxe/40 italic">
          Global caption style for export preview (MVP).
        </p>
      </label>
    </div>
  )
}
