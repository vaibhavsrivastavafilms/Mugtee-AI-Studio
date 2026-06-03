'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Brain } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STUDIO } from '@/lib/create/routes'
import { useCreatorMemoryStore } from '@/stores/creator-memory-store'
import { RelationshipBadge } from '@/components/memory/relationship-badge'
import { topNodesByType } from '@/lib/memory/knowledge-graph'
import { ProjectMemoryTimeline } from '@/components/memory/project-memory-timeline'

type MemoryPanelProps = {
  className?: string
  brandSlug?: string
}

/** Compact memory strip for MugteeOS Command Center director column */
export function MemoryPanel({ className, brandSlug }: MemoryPanelProps) {
  const profile = useCreatorMemoryStore((s) => s.profile)
  const hydrate = useCreatorMemoryStore((s) => s.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const hooks = topNodesByType(profile.memoryGraph, 'hook', 2)
  const brands = topNodesByType(profile.memoryGraph, 'brand', 2)

  return (
    <div
      className={cn(
        'rounded-xl border border-gold-500/15 bg-gold-500/[0.03] p-3 space-y-3',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-gold-400" />
          <span className="text-[9px] tracking-[0.2em] uppercase text-gold-400/80">
            Creator Twin
          </span>
        </div>
        <RelationshipBadge
          level={profile.relationshipLevel}
          score={profile.relationshipScore}
          size="sm"
        />
      </div>

      {hooks.length > 0 ? (
        <p className="text-[11px] text-luxe/60 leading-snug">
          Hooks: {hooks.map((h) => h.label).join(' · ')}
        </p>
      ) : (
        <p className="text-[11px] text-luxe/45 italic">
          Memory builds as you create — export a reel to teach Mugtee your style.
        </p>
      )}

      {brands.length > 0 ? (
        <p className="text-[10px] text-luxe/50">
          Brands: {brands.map((b) => b.label).join(', ')}
        </p>
      ) : null}

      <ProjectMemoryTimeline brandSlug={brandSlug} limit={4} />

      <Link
        href={STUDIO.memory}
        className="block text-center text-[10px] tracking-wide text-gold-400/90 hover:text-gold-300 py-1"
      >
        Open Memory Dashboard
      </Link>
    </div>
  )
}
