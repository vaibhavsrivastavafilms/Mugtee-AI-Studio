'use client'

import { Suspense, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { useStore } from '@/lib/store'
import { directorWorkspaceHref } from '@/lib/create/routes'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { SessionContinuityGuard } from '@/components/trust/session-continuity-guard'
import { MobileSaveTrustBar } from '@/components/trust/mobile-save-trust-bar'
import { StudioWorkspaceTopbar } from '@/components/studio/studio-workspace-topbar'

type QuickModeShellProps = {
  children: ReactNode
  projectId?: string
  className?: string
}

function QuickModeShellInner({ children, projectId, className }: QuickModeShellProps) {
  const { user } = useAuthHydration()
  const { userName } = useStore()
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const pid = projectId ?? savedProjectId

  const shellUser = {
    email: user?.email ?? null,
    user_metadata: {
      full_name: userName || user?.user_metadata?.full_name,
      name: userName || user?.user_metadata?.name,
    },
  }

  return (
    <div
      className={cn(
        '-mx-3 sm:-mx-5 lg:-mx-6 -my-3 sm:-my-4 lg:-my-5 min-h-[calc(100dvh-3rem)] min-w-0 overflow-hidden flex flex-col bg-[#050505]',
        className
      )}
    >
      <SessionContinuityGuard projectId={projectId} />
      <StudioWorkspaceTopbar user={shellUser} variant="quick" />
      <MobileSaveTrustBar />
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overscroll-y-contain xl:overflow-hidden">
        {children}
      </div>

      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-white/[0.06] bg-[#0D0D0D]/90">
        <p className="text-[11px] sm:text-xs text-luxe/55 max-w-2xl leading-relaxed">
          Switch to Director Mode for advanced editing, timeline, and full creative control.
        </p>
        <Link
          href={pid ? directorWorkspaceHref(pid) : directorWorkspaceHref()}
          className={cn(
            'inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl text-xs font-medium',
            'border border-white/[0.1] bg-white/[0.04] text-luxe/90 hover:border-violet-400/35 hover:bg-violet-500/[0.08] transition shrink-0'
          )}
        >
          Open Director Mode
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}

/** Quick Mode — two-column create + results, no workflow rail. */
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
