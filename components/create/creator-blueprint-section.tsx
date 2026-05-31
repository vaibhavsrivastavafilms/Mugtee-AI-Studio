'use client'

import { cn } from '@/lib/utils'
import {
  CREATOR_BLUEPRINT_CATEGORIES,
  type CreatorBlueprint,
  type CreatorBlueprintCategory,
} from '@/lib/cinematic/creator-blueprints'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const triggerClassName =
  'h-9 text-xs bg-black/30 border-white/[0.08] text-luxe/85 hover:border-gold-500/25 focus:ring-gold-500/20'

function categorySelectId(name: CreatorBlueprintCategory): string {
  return `creator-blueprint-${name.toLowerCase().replace(/\s+/g, '-')}`
}

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
    <section className={cn('space-y-3', className)} aria-labelledby="creator-blueprint-heading">
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

      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        role="group"
        aria-label="Creator blueprint categories"
      >
        {CREATOR_BLUEPRINT_CATEGORIES.map((category) => {
          const selectId = categorySelectId(category.name)
          const selectedInCategory = category.blueprints.find(
            (blueprint) => blueprint.id === selectedBlueprintId
          )

          return (
            <div key={category.name} className="space-y-1.5 min-w-0">
              <label
                htmlFor={selectId}
                className="text-[9px] tracking-[0.24em] uppercase text-luxe/45"
              >
                {category.name}
              </label>
              <Select
                value={selectedInCategory?.id}
                onValueChange={(id) => {
                  const blueprint = category.blueprints.find((item) => item.id === id)
                  if (blueprint) onSelectBlueprint(blueprint)
                }}
              >
                <SelectTrigger
                  id={selectId}
                  aria-label={`${category.name} blueprint`}
                  className={cn(
                    triggerClassName,
                    selectedInCategory && 'border-gold-500/50 text-gold-200'
                  )}
                >
                  <SelectValue placeholder="Choose workflow" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-white/[0.08] text-luxe/90">
                  {category.blueprints.map((blueprint) => (
                    <SelectItem
                      key={blueprint.id}
                      value={blueprint.id}
                      className="text-xs focus:bg-gold-500/10 focus:text-gold-200"
                    >
                      {blueprint.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        })}
      </div>
    </section>
  )
}
