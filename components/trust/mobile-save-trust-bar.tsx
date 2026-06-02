'use client'

import { SaveStatusIndicator } from '@/components/quick-cut/generation-save-indicator'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

/**
 * Persistent save confidence on mobile — survives app switch and network blips.
 * Fixed below the app header; desktop uses StudioStatusBar instead.
 */
export function MobileSaveTrustBar({ className }: { className?: string }) {
  const hasWork =
    useQuickCutGenerationStore(
      (s) =>
        Boolean(s.savedProjectId) ||
        Boolean(s.script.trim()) ||
        Boolean(s.hook.trim()) ||
        s.scenes.length > 0 ||
        s.isGenerating
    )

  if (!hasWork) return null

  return (
    <div
      className={cn(
        'lg:hidden sticky top-0 z-30 shrink-0',
        'border-b border-gold-500/10 bg-black/88 backdrop-blur-md',
        'px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]',
        'py-1.5 flex items-center justify-center min-w-0',
        className
      )}
      aria-label="Save status"
    >
      <SaveStatusIndicator persistent compact />
    </div>
  )
}
