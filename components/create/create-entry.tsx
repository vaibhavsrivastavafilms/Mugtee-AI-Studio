'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Clapperboard, Search, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createEntryHref, directorWorkspaceHref, STUDIO, type CreatorMode } from '@/lib/create/routes'
import { storeCreatorMode } from '@/lib/create/mode-selection'
import { isDirectorCutLocked } from '@/lib/features/director-cut-lock'
import { UnifiedCreatorShell } from '@/components/create/unified-creator-shell'
import { UnifiedProjectsGrid, type ProjectCardModel } from '@/components/create/unified-projects-grid'
import { ProjectsInsightsPanel } from '@/components/create/projects-insights-panel'
import { ProjectsLibrarySection } from '@/components/create/projects-library-section'
import { KnowledgeBaseView } from '@/components/create/knowledge-base-view'
import { LockedDirectorCutModeCard } from '@/components/mugtee-portal/locked-director-cut-mode-card'
import { HelpShapeMugteeBanner } from '@/components/shell/help-shape-mugtee-banner'

function ModeCard({
  mode,
  title,
  description,
  icon: Icon,
  primary,
}: {
  mode: CreatorMode
  title: string
  description: string
  icon: typeof Zap
  primary?: boolean
}) {
  return (
    <Link
      href={createEntryHref(mode)}
      className={cn(
        'group flex flex-col rounded-2xl border p-5 transition-all h-full',
        primary
          ? 'border-gold-500/35 bg-gold-500/[0.08] hover:border-gold-500/50'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-gold-500/25'
      )}
    >
      <div
        className={cn(
          'mb-4 flex h-10 w-10 items-center justify-center rounded-xl',
          primary ? 'bg-gold-gradient text-black' : 'border border-white/[0.08] text-gold-300'
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="font-display text-lg text-luxe group-hover:text-gold-100 transition-colors">
        {title}
      </div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-gold-300">
        Start <ArrowRight className="w-3 h-3" />
      </span>
    </Link>
  )
}

function CreateEntryInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = (searchParams?.get('mode') as CreatorMode | null) ?? null
  const tab = searchParams?.get('tab')
  const isProjectsTab = tab === 'projects' || tab === 'exports'
  const isKnowledgeTab = tab === 'knowledge'
  const isScriptOrStoryboardTab = tab === 'scripts' || tab === 'storyboards'
  const [gallerySearch, setGallerySearch] = useState('')
  const [selectedProject, setSelectedProject] = useState<ProjectCardModel | null>(null)

  useEffect(() => {
    setGallerySearch('')
  }, [tab])

  useEffect(() => {
    if (tab !== 'exports') return
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('tab', 'projects')
    router.replace(`${STUDIO.create}?${params.toString()}`)
  }, [tab, router, searchParams])

  useEffect(() => {
    if (mode === 'quick') {
      storeCreatorMode('quick')
      const qs = new URLSearchParams(searchParams?.toString() ?? '')
      qs.delete('mode')
      const q = qs.toString()
      router.replace(q ? `/studio/quick?${q}` : '/studio/quick')
      return
    }
    if (mode === 'director') {
      router.replace(directorWorkspaceHref())
    }
  }, [mode, router, searchParams])

  if (mode === 'quick' || mode === 'director') {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
        Opening {mode === 'quick' ? 'Quick Mode' : 'Director Mode'}…
      </div>
    )
  }

  const sectionTitle =
    tab === 'scripts'
      ? 'Scripts'
      : tab === 'storyboards'
        ? 'Storyboards'
        : isKnowledgeTab
          ? 'Knowledge Base'
          : isProjectsTab
            ? 'Projects'
            : undefined

  const sectionSubtitle =
    tab === 'scripts' || tab === 'storyboards'
      ? 'Scripts and storyboards in your project library.'
      : isKnowledgeTab
        ? 'Topics, series, and themes from your project history — no extra AI cost.'
        : isProjectsTab
          ? 'Continue, preview, or refine any reel.'
          : undefined

  return (
    <UnifiedCreatorShell
      title={isProjectsTab ? undefined : sectionTitle}
      subtitle={isProjectsTab ? undefined : sectionSubtitle}
    >
      {!tab ? (
        <>
        <HelpShapeMugteeBanner />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 min-w-0 overflow-x-hidden">
          <ModeCard
            mode="quick"
            title="Quick Cut"
            description="One-click cinematic generation from a single idea."
            icon={Zap}
            primary
          />
          {isDirectorCutLocked ? (
            <LockedDirectorCutModeCard description="Scene-by-scene control through the full cinematic pipeline." />
          ) : (
            <ModeCard
              mode="director"
              title="Director Cut"
              description="Scene-by-scene control through the full cinematic pipeline."
              icon={Clapperboard}
            />
          )}
        </div>
        </>
      ) : null}

      {isKnowledgeTab ? (
        <KnowledgeBaseView />
      ) : isProjectsTab ? (
        <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
          <div className="flex-1 min-w-0">
            <ProjectsLibrarySection
              limit={24}
              showActions
              galleryMode
              selectedId={selectedProject?.id ?? null}
              onSelectProject={setSelectedProject}
            />
          </div>
          <ProjectsInsightsPanel project={selectedProject} className="xl:w-72 shrink-0" />
        </div>
      ) : (
        <>
          {isScriptOrStoryboardTab ? (
            <div className="mb-6">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-400/50" />
                <input
                  value={gallerySearch}
                  onChange={(e) => setGallerySearch(e.target.value)}
                  placeholder="Search projects..."
                  className={cn(
                    'w-full h-10 pl-10 pr-3 rounded-xl text-sm',
                    'bg-black/40 border border-white/[0.08] text-luxe',
                    'focus:outline-none focus:border-gold-500/40 focus:shadow-[0_0_20px_-8px_rgba(212,175,55,0.35)]'
                  )}
                />
              </div>
            </div>
          ) : null}
          <UnifiedProjectsGrid limit={16} showActions searchQuery={gallerySearch} />
        </>
      )}
    </UnifiedCreatorShell>
  )
}

export function CreateEntry() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
          Loading creator…
        </div>
      }
    >
      <CreateEntryInner />
    </Suspense>
  )
}
