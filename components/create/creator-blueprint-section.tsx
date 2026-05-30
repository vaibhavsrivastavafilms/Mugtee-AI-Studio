'use client'

import { cn } from '@/lib/utils'
import {
  CREATOR_BLUEPRINT_CATEGORIES,
  type CreatorBlueprint,
} from '@/lib/cinematic/creator-blueprints'

export function CreatorBlueprintSection({
  onSelectBlueprint,
  selectedBlueprintId,
  className,
}: {
  onSelectBlueprint: (blueprint: CreatorBlueprint) => void
  selectedBlueprintId?: string | null
  className?: string
}) {
  return (
    <section className={cn('space-y-4', className)} aria-labelledby="creator-blueprint-heading">
      <div className="text-center px-1">
        <h2
          id="creator-blueprint-heading"
          className="text-[10px] tracking-[0.28em] uppercase text-gold-400/70"
        >
          Start With A Creator Blueprint
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-luxe/55 leading-relaxed">
          Pick a proven workflow — edit the prompt, then generate when ready.
        </p>
      </div>

      <div className="space-y-4">
        {CREATOR_BLUEPRINT_CATEGORIES.map((category) => (
          <div key={category.name} className="space-y-2">
            <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/60 px-0.5">
              {category.name}
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {category.blueprints.map((blueprint) => {
                const selected = selectedBlueprintId === blueprint.id
                return (
                  <button
                    key={blueprint.id}
                    type="button"
                    onClick={() => onSelectBlueprint(blueprint)}
                    {...(selected
                      ? { 'aria-pressed': 'true' as const }
                      : { 'aria-pressed': 'false' as const })}
                    className={cn(
                      'inline-flex items-center px-3 py-1.5 rounded-full border text-[11px] sm:text-[11.5px] tracking-wide transition',
                      selected
                        ? 'bg-gold-500/15 border-gold-500/50 text-gold-200'
                        : 'bg-white/[0.025] border-white/[0.06] hover:bg-gold-500/10 hover:border-gold-500/40 text-luxe/80 hover:text-gold-200'
                    )}
                  >
                    {blueprint.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
