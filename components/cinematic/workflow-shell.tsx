'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Check, Loader2, RefreshCw } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { TRUST_COPY } from '@/lib/creator/trust-copy'
import {
  restoreWorkflowScroll,
  saveWorkflowScroll,
} from '@/lib/creator/workflow-continuity'
import { cn } from '@/lib/utils'
import {
  relSavedLabel,
  useCinematicProjectStore,
  type CinematicProjectStatus,
} from '@/stores/cinematic-project'
import {
  CinematicContentSkeleton,
  CinematicHydrationGate,
} from '@/components/cinematic/cinematic-states'
import { CinematicWorkspaceShell } from '@/components/cinematic/cinematic-workspace-shell'
import { CinematicOperatingShell } from '@/components/cinematic/cinematic-operating-shell'
import { MasterCinematicEnvironment } from '@/components/cinematic/master-cinematic-environment'
import { CinematicWorkflowAtmosphere } from '@/components/cinematic/cinematic-workflow-atmosphere'
import { DirectingEnvironmentComposer } from '@/components/cinematic/directing-environment-composer'
import { EmotionalWorkflowPresence } from '@/components/cinematic/emotional-workflow-presence'
import { CinematicProjectEnvironment } from '@/components/cinematic/cinematic-project-environment'
import { CinematicMobileMode } from '@/components/cinematic/execution/cinematic-mobile-mode'

export function withProjectQuery(
  href: string,
  projectId?: string | null
): string {
  if (!projectId) return href
  return `${href}${href.includes('?') ? '&' : '?'}project=${projectId}`
}

const STEPS: { status: CinematicProjectStatus; href: string; label: string }[] = [
  { status: 'create', href: '/cinematic/create', label: 'Create' },
  { status: 'generating', href: '/cinematic/generating', label: 'Generating' },
  { status: 'preview', href: '/cinematic/preview', label: 'Preview' },
  { status: 'director', href: '/cinematic/director', label: 'Director' },
  { status: 'scenes', href: '/cinematic/scenes', label: 'Scenes' },
  { status: 'voiceover', href: '/cinematic/voiceover', label: 'Voiceover' },
  { status: 'compile', href: '/cinematic/compile', label: 'Compile' },
]

export function CinematicWorkflowShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode
  title: string
  subtitle?: string
}) {
  const pathname = usePathname()
  const projectId = useCinematicProjectStore(
    useShallow((s) => s.persistedId || s.id)
  )
  const { isHydrating } = useCinematicProjectStore(
    useShallow((s) => ({ isHydrating: s.isHydrating }))
  )

  useEffect(() => {
    const step = pathname?.split('/').pop() || 'create'
    const y = restoreWorkflowScroll(step)
    if (y != null) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior })
      })
    }
    return () => {
      saveWorkflowScroll(step, window.scrollY)
    }
  }, [pathname])

  return (
    <CinematicWorkspaceShell>
    <CinematicOperatingShell>
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,72,22,0.22),transparent_45%)] pointer-events-none" />

      <header className="relative z-20 border-b border-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3 sm:gap-4">
          <Link href={withProjectQuery('/cinematic/create', projectId)} className="flex items-center gap-3 shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-[#D4AF37] text-black flex items-center justify-center font-bold text-lg">
              M
            </div>
            <span className="text-[#E7C56A] text-2xl font-semibold tracking-tight hidden sm:inline">
              Mugtee
            </span>
          </Link>

          <nav className="hidden xl:flex items-center gap-1 overflow-x-auto">
            {STEPS.map((step) => {
              const active = pathname === step.href
              return (
                <Link
                  key={step.href}
                  href={withProjectQuery(step.href, projectId)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-[11px] tracking-[0.18em] uppercase transition-all whitespace-nowrap',
                    active
                      ? 'bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#E7C56A]'
                      : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                  )}
                >
                  {step.label}
                </Link>
              )
            })}
          </nav>

          <Link
            href="/dashboard"
            className="text-sm text-white/60 hover:text-[#E7C56A] transition shrink-0 min-h-[44px] inline-flex items-center"
          >
            Your studio
          </Link>

          <div className="min-w-[72px] sm:min-w-[120px] flex justify-end">
            <CinematicSaveIndicator />
          </div>
        </div>
      </header>

      <main className="relative z-10 px-4 sm:px-6 py-10 sm:py-16 pb-32 sm:pb-16 keyboard-safe-bottom sm:keyboard-safe-bottom-0 directing-focus-glow cinematic-master-atmosphere">
        <CinematicWorkflowAtmosphere />
        <DirectingEnvironmentComposer>
        <CinematicMobileMode className="max-w-5xl mx-auto">
        <div className="relative emotional-directing-depth rounded-none sm:rounded-sm visual-composition-weight">
          <div className="mb-8 sm:mb-10 text-center min-h-[120px] sm:min-h-[140px] flex flex-col justify-end screenplay-rhythm-spacing">
            <p className="text-[#C8A24E] uppercase tracking-[0.35em] text-[10px] sm:text-xs mb-3 sm:mb-4">
              Cinematic Creator
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#F4E7C1]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-3 sm:mt-4 text-white/65 text-base sm:text-lg leading-7 sm:leading-8 max-w-2xl mx-auto">
                {subtitle}
              </p>
            ) : null}
            <EmotionalWorkflowPresence />
          </div>
          <CinematicProjectEnvironment />
          <CinematicHydrationGate>
            {isHydrating ? (
              <CinematicContentSkeleton />
            ) : (
              <MasterCinematicEnvironment>
                <div key={pathname ?? 'cinematic'} className="cinematic-stage-transition">
                  {children}
                </div>
              </MasterCinematicEnvironment>
            )}
          </CinematicHydrationGate>
        </div>
        </CinematicMobileMode>
        </DirectingEnvironmentComposer>
      </main>
    </div>
    </CinematicOperatingShell>
    </CinematicWorkspaceShell>
  )
}

function CinematicSaveIndicator() {
  const { saveState, lastPersistedAt, isHydrating } = useCinematicProjectStore(
    useShallow((s) => ({
      saveState: s.saveState,
      lastPersistedAt: s.lastPersistedAt,
      isHydrating: s.isHydrating,
    }))
  )
  const pathname = usePathname()
  const onScenesStep = pathname?.includes('/cinematic/scenes')

  if (isHydrating) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] tracking-[0.14em] uppercase text-white/45 max-w-[140px] sm:max-w-none">
        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
        <span className="truncate">{TRUST_COPY.restoring}</span>
      </span>
    )
  }

  if (saveState === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] tracking-[0.14em] uppercase text-white/55 min-w-[72px]">
        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
        <span className="hidden sm:inline">{TRUST_COPY.saving}</span>
        <span className="sm:hidden">Saving…</span>
      </span>
    )
  }

  if (saveState === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-200/95 text-[10px] sm:text-[11px] tracking-[0.12em] uppercase transition-opacity duration-300 max-w-[180px] sm:max-w-none">
        <Check className="w-2.5 h-2.5 shrink-0" />
        <span className="truncate">
          {onScenesStep ? TRUST_COPY.scenesSynced : TRUST_COPY.saved}
        </span>
      </span>
    )
  }

  if (saveState === 'error') {
    return (
      <button
        type="button"
        onClick={() => void useCinematicProjectStore.getState().persistProject({ silent: true })}
        className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] tracking-[0.12em] uppercase text-amber-300/90 hover:text-amber-200 transition max-w-[120px] sm:max-w-none"
        title="Tap to retry — your draft is safe locally"
      >
        <RefreshCw className="w-3 h-3 shrink-0" />
        <span className="truncate">{TRUST_COPY.savePaused}</span>
      </button>
    )
  }

  if (lastPersistedAt) {
    return (
      <span
        className="inline text-[10px] sm:text-[11px] tracking-[0.12em] uppercase text-white/45 max-w-[100px] sm:max-w-none truncate"
        title={new Date(lastPersistedAt).toLocaleString()}
      >
        {relSavedLabel(lastPersistedAt)}
      </span>
    )
  }

  return null
}

export function CinematicStepNav({
  backHref,
  nextHref,
  nextLabel = 'Continue',
  backLabel = 'Back',
  onNext,
  nextDisabled,
}: {
  backHref?: string
  nextHref?: string
  nextLabel?: string
  backLabel?: string
  onNext?: () => void
  nextDisabled?: boolean
}) {
  const projectId = useCinematicProjectStore(
    useShallow((s) => s.persistedId || s.id)
  )

  return (
    <div className="mt-8 sm:mt-10 flex flex-col-reverse sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-4 sm:static fixed bottom-0 inset-x-0 z-20 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-0 bg-gradient-to-t from-black via-black/95 to-transparent sm:from-transparent sm:via-transparent pointer-events-none sm:pointer-events-auto">
      {backHref ? (
        <Link
          href={withProjectQuery(backHref, projectId)}
          className="pointer-events-auto px-6 py-3.5 sm:py-3 rounded-2xl border border-white/10 text-white/75 hover:text-white hover:border-[#D4AF37]/30 transition text-center min-h-[48px] inline-flex items-center justify-center"
        >
          {backLabel}
        </Link>
      ) : null}
      {nextHref ? (
        <Link
          href={withProjectQuery(nextHref, projectId)}
          onClick={onNext}
          aria-disabled={nextDisabled}
          className={cn(
            'pointer-events-auto px-6 py-3.5 sm:py-3 rounded-2xl bg-[#D4AF37] text-black font-medium hover:bg-[#E7C56A] transition shadow-xl shadow-yellow-500/10 text-center min-h-[48px] inline-flex items-center justify-center',
            nextDisabled && 'pointer-events-none opacity-50'
          )}
        >
          {nextLabel}
        </Link>
      ) : null}
    </div>
  )
}
