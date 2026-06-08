'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

type SceneVersionCompareProps = {
  currentUrl: string
  newUrl: string
  sceneLabel: string
  onKeepCurrent: () => void
  onAcceptNew: () => void
  className?: string
}

export function SceneVersionCompare({
  currentUrl,
  newUrl,
  sceneLabel,
  onKeepCurrent,
  onAcceptNew,
  className,
}: SceneVersionCompareProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gold-500/25 bg-gold-500/[0.04] p-3 space-y-3',
        className
      )}
      aria-label="Compare scene versions"
    >
      <p className="text-[10px] tracking-[0.18em] uppercase text-gold-300/75">
        Compare Versions · {sceneLabel}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <p className="text-[9px] uppercase tracking-wider text-luxe/45">Current Version</p>
          <div className="relative aspect-[9/16] max-h-[200px] rounded-lg overflow-hidden border border-white/10">
            <Image src={currentUrl} alt="Current version" fill sizes="160px" className="object-cover" unoptimized />
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-[9px] uppercase tracking-wider text-gold-200/80">New Version</p>
          <div className="relative aspect-[9/16] max-h-[200px] rounded-lg overflow-hidden border border-gold-500/30">
            <Image src={newUrl} alt="New version" fill sizes="160px" className="object-cover" unoptimized />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          onClick={onKeepCurrent}
          className="px-3 py-1.5 rounded-lg border border-white/15 text-[10px] uppercase tracking-wider text-luxe/70 hover:text-luxe"
        >
          Keep Current
        </button>
        <button
          type="button"
          onClick={onAcceptNew}
          className="px-3 py-1.5 rounded-lg border border-gold-500/35 bg-gold-500/15 text-[10px] uppercase tracking-wider text-gold-100 hover:bg-gold-500/25"
        >
          Accept New
        </button>
      </div>
    </div>
  )
}
