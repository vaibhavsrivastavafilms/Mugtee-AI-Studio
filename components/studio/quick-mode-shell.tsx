'use client'

import { Suspense, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SessionContinuityGuard } from '@/components/trust/session-continuity-guard'
import { MobileSaveTrustBar } from '@/components/trust/mobile-save-trust-bar'

type QuickModeShellProps = {
  children: ReactNode
  projectId?: string
  className?: string
}

function QuickModeShellInner({ children, projectId, className }: QuickModeShellProps) {
  return (
    <div
      className={cn(
        '-mx-3 sm:-mx-5 lg:-mx-6 -my-4 sm:-my-5 lg:-my-6 min-h-[calc(100dvh-4rem)] min-w-0 overflow-x-hidden flex flex-col',
        className
      )}
    >
      <SessionContinuityGuard projectId={projectId} />
      <MobileSaveTrustBar />
      {children}
    </div>
  )
}

/** Minimal Quick Mode layout — prompt → generate → export only. */
export function QuickModeShell(props: QuickModeShellProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
          Opening Quick Mode…
        </div>
      }
    >
      <QuickModeShellInner {...props} />
    </Suspense>
  )
}
