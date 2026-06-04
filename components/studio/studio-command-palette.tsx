'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Command,
  Download,
  Film,
  Layers,
  Library,
  Mic,
  Palette,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  createEntryHref,
  createProjectHref,
  commandCenterWorkspaceHref,
  creatorModeFromPathname,
  directorWorkspaceHref,
  STUDIO,
} from '@/lib/create/routes'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'
import { workspaceStageToTab } from '@/lib/studio/workspace-stages'

type StudioCommand = {
  id: string
  label: string
  keywords: string[]
  icon: typeof Command
  run: () => void | Promise<void>
}

export function StudioCommandPalette() {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const isQuickMode = creatorModeFromPathname(pathname) === 'quick'
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)
  const resumeRenderPoll = useQuickCutGenerationStore((s) => s.resumeRenderPoll)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const setActiveStage = useStudioWorkspaceStore((s) => s.setActiveStage)
  const setActiveStageTab = useQuickCutGenerationStore((s) => s.setActiveStageTab)
  const setPanelPreferences = useStudioWorkspaceStore((s) => s.setPanelPreferences)
  const setContextSectionExpanded = useStudioWorkspaceStore((s) => s.setContextSectionExpanded)

  const openStyleDrawer = useCallback(() => {
    setContextSectionExpanded('system', true)
    window.dispatchEvent(new CustomEvent('mugtee:open-style-drawer'))
  }, [setContextSectionExpanded])

  const goStage = useCallback(
    (stage: Parameters<typeof setActiveStage>[0]) => {
      setActiveStage(stage)
      setActiveStageTab(workspaceStageToTab(stage), true)
    },
    [setActiveStage, setActiveStageTab]
  )

  const commands: StudioCommand[] = useMemo(
    () => [
      {
        id: 'create-reel',
        label: 'Create Reel',
        keywords: ['new', 'quick', 'start', 'project'],
        icon: Film,
        run: () => {
          resetQuickCutForFreshCreate()
          router.push(createEntryHref('quick'))
        },
      },
      {
        id: 'generate-storyboard',
        label: 'Generate Storyboard',
        keywords: ['visuals', 'images', 'scenes'],
        icon: Sparkles,
        run: () => goStage('storyboard'),
      },
      {
        id: 'change-creative-system',
        label: 'Change Creative System',
        keywords: ['preset', 'template', 'library', 'style', 'system'],
        icon: Palette,
        run: openStyleDrawer,
      },
      {
        id: 'export-mp4',
        label: 'Export MP4',
        keywords: ['video', 'render', 'download'],
        icon: Download,
        run: () => {
          goStage('export')
          if (!isGenerating) {
            void (renderPollUrl ? resumeRenderPoll() : retryVideoRender())
          }
        },
      },
      {
        id: 'open-creative-systems',
        label: 'Open Creative Systems',
        keywords: ['browse', 'templates', 'library', 'style'],
        icon: Library,
        run: openStyleDrawer,
      },
      {
        id: 'open-research',
        label: 'Open Research',
        keywords: ['deep', 'facts', 'sources', 'study'],
        icon: Sparkles,
        run: () => goStage('research'),
      },
      {
        id: 'timeline-agent-fit',
        label: 'Timeline: Fit to Screen',
        keywords: ['timeline', 'zoom', 'agent', 'track'],
        icon: Layers,
        run: () => {
          toast.message('Timeline Studio ships in Phase 6', {
            description: 'Use Export or Director scenes until multi-track editing lands.',
          })
        },
      },
      {
        id: 'timeline-agent-trim',
        label: 'Timeline: Trim Silence',
        keywords: ['timeline', 'audio', 'agent', 'edit'],
        icon: Layers,
        run: () => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mugtee:timeline-agent-stub', { detail: 'trim' }))
          }
        },
      },
      {
        id: 'rewrite-hook',
        label: 'Rewrite Hook',
        keywords: ['rewrite', 'opening', 'improve hook'],
        icon: Wand2,
        run: () => goStage('hook'),
      },
      {
        id: 'generate-voice',
        label: 'Generate Voice',
        keywords: ['voiceover', 'narration', 'elevenlabs'],
        icon: Mic,
        run: () => goStage('voice'),
      },
      {
        id: 'open-timeline',
        label: 'Open Timeline',
        keywords: ['timeline', 'tracks', 'edit'],
        icon: Layers,
        run: () => {
          if (savedProjectId) {
            router.push(directorWorkspaceHref(savedProjectId, { tab: 'motion' }))
            return
          }
          toast.message('Timeline Studio ships in Phase 6', {
            description: 'Generate a reel first, then open Director Mode for the full timeline.',
          })
        },
      },
      {
        id: 'open-director-mode',
        label: 'Open Director Mode',
        keywords: ['director', 'advanced', 'workspace'],
        icon: Film,
        run: () => {
          router.push(directorWorkspaceHref(savedProjectId ?? undefined))
        },
      },
      {
        id: 'export-assets',
        label: 'Export Assets',
        keywords: ['pack', 'mp3', 'docx', 'txt'],
        icon: Download,
        run: () => {
          setContextSectionExpanded('export', true)
          goStage('export')
        },
      },
      {
        id: 'director-panel',
        label: 'Open Director Panel',
        keywords: ['notes', 'continuity'],
        icon: Wand2,
        run: () => {
          setPanelPreferences({ directorPanelOpen: true })
          setContextSectionExpanded('director', true)
        },
      },
      {
        id: 'projects',
        label: 'All Projects',
        keywords: ['library', 'list'],
        icon: Film,
        run: () => router.push(STUDIO.projects),
      },
      ...(savedProjectId
        ? [
            {
              id: 'open-export-page',
              label: 'Open Export Page',
              keywords: ['publish', 'complete'],
              icon: Download,
              run: () => router.push(createProjectHref(savedProjectId, 'export')),
            },
            {
              id: 'workspace',
              label: 'Open Workspace',
              keywords: ['command', 'center'],
              icon: Film,
              run: () => router.push(commandCenterWorkspaceHref(savedProjectId)),
            },
          ]
        : []),
    ],
    [
      goStage,
      isGenerating,
      openStyleDrawer,
      renderPollUrl,
      resumeRenderPoll,
      retryVideoRender,
      router,
      savedProjectId,
      setContextSectionExpanded,
      setPanelPreferences,
    ]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.keywords.some((k) => k.includes(q) || q.includes(k))
    )
  }, [commands, query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const runCommand = useCallback(
    async (cmd: StudioCommand) => {
      setOpen(false)
      setQuery('')
      await cmd.run()
    },
    []
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/65 backdrop-blur-sm"
      role="dialog"
      aria-label="Studio command palette"
      onClick={() => setOpen(false)}
    >
      <div
        className={cn(
          'w-full max-w-lg rounded-xl border border-white/[0.08] bg-[#080808]/98',
          'shadow-[0_24px_80px_rgba(0,0,0,0.55)] overflow-hidden'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <Command
            className={cn(
              'h-3.5 w-3.5',
              isQuickMode ? 'text-violet-300/80' : 'text-gold-300/80'
            )}
          />
          <span className="text-[10px] tracking-[0.2em] uppercase text-luxe/55">Studio ⌘K</span>
        </div>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIndex((i) => Math.max(i - 1, 0))
            }
            if (e.key === 'Enter' && filtered[activeIndex]) {
              e.preventDefault()
              void runCommand(filtered[activeIndex])
            }
          }}
          placeholder="Create reel, creative system, research, export MP4…"
          className="w-full px-4 py-3 text-sm text-luxe bg-transparent border-0 focus:outline-none placeholder:text-luxe/35"
        />
        <ul className="max-h-[min(50vh,320px)] overflow-y-auto scrollbar-luxe py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-[11px] text-luxe/45 italic text-center">No matches</li>
          ) : (
            filtered.map((cmd, index) => {
              const Icon = cmd.icon
              return (
                <li key={cmd.id}>
                  <button
                    type="button"
                    onClick={() => void runCommand(cmd)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition',
                      index === activeIndex
                        ? isQuickMode
                          ? 'bg-violet-500/[0.1] text-violet-100'
                          : 'bg-gold-500/[0.1] text-gold-100'
                        : 'text-luxe/80 hover:bg-white/[0.03]'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-3.5 h-3.5 shrink-0',
                        isQuickMode ? 'text-violet-300/70' : 'text-gold-300/70'
                      )}
                    />
                    <span className="text-[12px]">{cmd.label}</span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
        <p className="px-4 py-2 border-t border-white/[0.06] text-[9px] text-luxe/40 tracking-wide">
          ↑↓ navigate · Enter run · Esc close
        </p>
      </div>
    </div>
  )
}
