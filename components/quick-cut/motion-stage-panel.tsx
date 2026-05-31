'use client'

import { Film } from 'lucide-react'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { MOTION_PRESET_LIST, type MotionPresetId } from '@/lib/motion/motion-presets'
import { motionPresetLabel } from '@/lib/motion/motion-presets'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { cn } from '@/lib/utils'
import { MotionPresetBadge } from '@/components/quick-cut/motion-preset-control'

const ARCHITECT_PRESETS: MotionPresetId[] = [
  'documentary_drift',
  'historical_push_in',
  'battle_tracking',
  'luxury_reveal',
  'emotional_close_up',
  'ancient_civilization',
]

export function MotionStagePanel({
  scenes,
  className,
}: {
  scenes: GeneratedScene[]
  className?: string
}) {
  const sceneMotion = useQuickCutGenerationStore((s) => s.sceneMotion)
  const setSceneMotionPreset = useQuickCutGenerationStore((s) => s.setSceneMotionPreset)

  if (scenes.length < 1) {
    return (
      <p className="text-[12px] text-luxe/55 italic text-center py-4">
        Motion presets apply after storyboard stills are ready.
      </p>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-[10px] text-luxe/50 leading-relaxed">
        Slow Ken Burns, drift, and parallax — tuned per scene. Changes update preview and export.
      </p>
      <ul className="space-y-2 max-h-[min(380px,45vh)] overflow-y-auto scrollbar-luxe">
        {scenes.map((scene, i) => {
          const id = scene.id || `scene-${i + 1}`
          const entry = sceneMotion[id]
          const presetId = entry?.presetId ?? scene.motionPresetId

          return (
            <li
              key={id}
              className="rounded-lg border border-gold-500/15 bg-black/45 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] tracking-[0.18em] uppercase text-gold-300/75">
                  SCENE {String(i + 1).padStart(2, '0')}
                </span>
                <MotionPresetBadge presetId={presetId} />
              </div>
              <p className="text-[11px] text-luxe/80 line-clamp-1 mb-2">
                {scene.title || `Beat ${i + 1}`}
              </p>
              <label className="flex flex-col gap-1">
                <span className="text-[9px] tracking-[0.2em] uppercase text-gold-300/60">
                  Camera motion
                </span>
                <select
                  value={presetId ?? 'documentary_drift'}
                  onChange={(e) => setSceneMotionPreset(id, e.target.value as MotionPresetId)}
                  className="w-full rounded-md border border-white/10 bg-black/60 text-[11px] text-luxe/90 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gold-500/40"
                >
                  <optgroup label="Cinematic presets">
                    {ARCHITECT_PRESETS.map((pid) => (
                      <option key={pid} value={pid}>
                        {motionPresetLabel(pid)}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Utility">
                    {MOTION_PRESET_LIST.filter((p) => !ARCHITECT_PRESETS.includes(p.id)).map(
                      (p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      )
                    )}
                  </optgroup>
                </select>
              </label>
              {entry?.particleType && entry.particleType !== 'none' ? (
                <p className="text-[9px] text-luxe/45 mt-1.5 capitalize">
                  Atmosphere: {entry.particleType.replace('_', ' ')}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function MotionStageShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 p-4 min-h-[120px]',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85 mb-3">
        <Film className="w-3 h-3" />
        Cinematic motion
      </div>
      {children}
    </div>
  )
}
