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
        '-mx-3 sm:-mx-5 lg:-mx-6 -my-4 sm:-my-5 lg:-my-6 min-h-[calc(100dvh-4rem)] min-w-0 overflow-x-clip flex flex-col bg-[#090A0F] text-white',
        'bg-[radial-gradient(ellipse_70%_40%_at_50%_-8%,rgba(212,175,55,0.12),transparent_58%),radial-gradient(ellipse_40%_30%_at_90%_10%,rgba(85,124,255,0.10),transparent_60%)]',
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
