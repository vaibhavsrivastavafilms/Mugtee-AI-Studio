'use client'

import { Lock, Unlock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StoryBible, StoryBibleLocks } from '@/lib/cinematic/story-bible'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

function LockToggle({
  label,
  locked,
  onToggle,
}: {
  label: string
  locked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'inline-flex items-center gap-1.5 text-[10px] tracking-[0.16em] uppercase transition-colors',
        locked ? 'text-gold-300/90' : 'text-luxe/45 hover:text-gold-300/70'
      )}
      title={locked ? `Unlock ${label}` : `Lock ${label}`}
    >
      {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
      {label}
    </button>
  )
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
}) {
  const shared =
    'w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-[12px] text-[#F4E7C1] placeholder:text-luxe/35 focus:border-gold-500/35 focus:outline-none'
  return (
    <label className="block space-y-1">
      <span className="text-[9px] tracking-[0.2em] uppercase text-gold-300/70">{label}</span>
      {multiline ? (
        <textarea
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(shared, 'resize-y min-h-[52px]')}
        />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={shared} />
      )}
    </label>
  )
}

const ANIMATION_STYLES = [
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'documentary', label: 'Documentary' },
  { id: 'dynamic', label: 'Dynamic' },
  { id: 'subtle', label: 'Subtle' },
] as const

const CONSISTENCY_LEVELS = [
  { id: 'strict', label: 'Strict' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'loose', label: 'Loose' },
] as const

export function StoryboardContinuityPanel({ className }: { className?: string }) {
  const storyBible = useQuickCutGenerationStore((s) => s.storyBible)
  const updateStoryBible = useQuickCutGenerationStore((s) => s.updateStoryBible)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const outputAlignmentControls = useQuickCutGenerationStore((s) => s.outputAlignmentControls)
  const setOutputAlignmentControls = useQuickCutGenerationStore(
    (s) => s.setOutputAlignmentControls
  )

  if (!storyBible && scenes.length === 0) return null

  const bible = storyBible ?? {
    characterProfile: {},
    visualStyle: '',
    colorPalette: '',
    environment: '',
    cameraLanguage: '',
    mood: '',
    locks: {},
  }

  const setLock = (key: keyof StoryBibleLocks, next: boolean) => {
    updateStoryBible({
      locks: { ...bible.locks, [key]: next },
    })
  }

  return (
    <section
      className={cn(
        'glass rounded-2xl border border-gold-500/25 bg-gold-500/[0.04] p-4 space-y-4',
        className
      )}
      aria-label="Cinematic Continuity"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base text-[#F4E7C1]">Cinematic Continuity</h3>
          <p className="text-[11px] text-luxe/55 mt-0.5 leading-relaxed">
            Story bible locks character, world, and palette across storyboard frames.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <LockToggle
            label="Character"
            locked={Boolean(bible.locks?.character)}
            onToggle={() => setLock('character', !bible.locks?.character)}
          />
          <LockToggle
            label="Environment"
            locked={Boolean(bible.locks?.environment)}
            onToggle={() => setLock('environment', !bible.locks?.environment)}
          />
          <LockToggle
            label="Palette"
            locked={Boolean(bible.locks?.palette)}
            onToggle={() => setLock('palette', !bible.locks?.palette)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Character appearance"
          value={bible.characterProfile.appearance ?? ''}
          multiline
          onChange={(appearance) =>
            updateStoryBible({ characterProfile: { ...bible.characterProfile, appearance } })
          }
        />
        <Field
          label="Character name"
          value={bible.characterProfile.name ?? ''}
          onChange={(name) =>
            updateStoryBible({ characterProfile: { ...bible.characterProfile, name } })
          }
        />
        <Field
          label="Environment"
          value={bible.environment}
          multiline
          onChange={(environment) => updateStoryBible({ environment })}
        />
        <Field
          label="Color palette"
          value={bible.colorPalette}
          onChange={(colorPalette) => updateStoryBible({ colorPalette })}
        />
        <Field
          label="Mood"
          value={bible.mood}
          onChange={(mood) => updateStoryBible({ mood })}
        />
        <Field
          label="Camera language"
          value={bible.cameraLanguage}
          onChange={(cameraLanguage) => updateStoryBible({ cameraLanguage })}
        />
        <Field
          label="Visual style"
          value={bible.visualStyle}
          multiline
          onChange={(visualStyle) => updateStoryBible({ visualStyle })}
        />
      </div>

      <div className="border-t border-white/[0.06] pt-4 space-y-3">
        <div>
          <h4 className="text-[11px] tracking-[0.18em] uppercase text-gold-300/80">
            Output alignment
          </h4>
          <p className="text-[10px] text-luxe/50 mt-1 leading-relaxed">
            Tune visuals and motion without regenerating the full project. Changes apply on next
            scene image or motion refresh.
          </p>
        </div>
        <Field
          label="Visual style note"
          value={outputAlignmentControls.visualStyle ?? ''}
          onChange={(visualStyle) => setOutputAlignmentControls({ visualStyle })}
        />
        <Field
          label="Camera language"
          value={outputAlignmentControls.cameraLanguage ?? ''}
          onChange={(cameraLanguage) => setOutputAlignmentControls({ cameraLanguage })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-[9px] tracking-[0.2em] uppercase text-gold-300/70">
              Character consistency
            </span>
            <select
              value={outputAlignmentControls.characterConsistency ?? 'balanced'}
              onChange={(e) =>
                setOutputAlignmentControls({
                  characterConsistency: e.target.value as 'strict' | 'balanced' | 'loose',
                })
              }
              className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-[12px] text-[#F4E7C1] focus:border-gold-500/35 focus:outline-none"
            >
              {CONSISTENCY_LEVELS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[9px] tracking-[0.2em] uppercase text-gold-300/70">
              Animation style
            </span>
            <select
              value={outputAlignmentControls.animationStyle ?? 'cinematic'}
              onChange={(e) =>
                setOutputAlignmentControls({
                  animationStyle: e.target.value as
                    | 'cinematic'
                    | 'documentary'
                    | 'dynamic'
                    | 'subtle',
                })
              }
              className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-[12px] text-[#F4E7C1] focus:border-gold-500/35 focus:outline-none"
            >
              {ANIMATION_STYLES.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  )
}
