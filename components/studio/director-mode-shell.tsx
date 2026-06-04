'use client'

import { Suspense, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SessionContinuityGuard } from '@/components/trust/session-continuity-guard'
import { MobileSaveTrustBar } from '@/components/trust/mobile-save-trust-bar'

type DirectorModeShellProps = {
  children: ReactNode
  projectId?: string
  className?: string
}

function DirectorModeShellInner({ children, projectId, className }: DirectorModeShellProps) {
  return (
    <div
      className={cn(
        '-mx-3 sm:-mx-5 lg:-mx-6 -my-4 sm:-my-5 lg:-my-6 min-h-[calc(100dvh-4rem)] min-w-0 overflow-x-hidden flex flex-col bg-[#060606]',
        className
      )}
    >
      <SessionContinuityGuard projectId={projectId} />
      <MobileSaveTrustBar />
      {children}
    </div>
  )
}

/** Full Director Mode layout — workflow rail, workspace, inspector. */
export function DirectorModeShell(props: DirectorModeShellProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
          Opening Director Mode…
        </div>
      }
    >
      <DirectorModeShellInner {...props} />
    </Suspense>
  )
}
