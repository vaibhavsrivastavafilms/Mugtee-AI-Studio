'use client'

import { CreatorEnvironmentMemory } from '@/components/cinematic/creator-environment-memory'
import { DirectingPresenceFade } from '@/components/cinematic/directing-presence-fade'
import { cn } from '@/lib/utils'

export function WorkflowAtmosphereMemory({
  style,
  niche,
  className,
}: {
  style?: string | null
  niche?: string | null
  className?: string
}) {
  return (
    <DirectingPresenceFade
      className={cn('py-2 px-3 rounded-xl bg-black/20 border border-white/[0.04]', className)}
    >
      <CreatorEnvironmentMemory style={style} niche={niche} />
    </DirectingPresenceFade>
  )
}
