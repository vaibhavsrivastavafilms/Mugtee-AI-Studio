'use client'

import Link from 'next/link'
import {
  Clapperboard,
  FileText,
  Film,
  Hash,
  ImageIcon,
  Loader2,
  Mic,
  Music,
  Package,
  Sparkles,
  Check,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { directorWorkspaceHref } from '@/lib/create/routes'
import type { SectionGenerationStatus } from '@/lib/cinematic/section-generation-status'
import type { QuickCutStageTab } from '@/lib/cinematic/quick-cut/stage-tabs'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

type AssetStatus = 'pending' | 'generating' | 'ready' | 'failed'

type QuickAssetDef = {
  id: string
  label: string
  icon: typeof ImageIcon
  meta: (ctx: AssetContext) => string
  resolveStatus: (ctx: AssetContext) => AssetStatus
  stageTab?: QuickCutStageTab
}

type AssetContext = {
  section: (key: string) => SectionGenerationStatus | undefined
  isGenerating: boolean
  isComplete: boolean
  generationStep: string
  scenesCount: number
  hasThumb: boolean
  hasVoice: boolean
  hasScript: boolean
  hashtagCount: number
  exportReady: boolean
}

function mapSection(status: SectionGenerationStatus | undefined, hasData: boolean): AssetStatus {
  if (status === 'failed') return 'failed'
  if (status === 'generating') return 'generating'
  if (status === 'completed' || hasData) return 'ready'
  if (status === 'idle') return 'pending'
  return 'pending'
}

const ASSETS: QuickAssetDef[] = [
  {
    id: 'thumbnail',
    label: 'Thumbnail',
    icon: ImageIcon,
    meta: () => 'JPG · 1080×1920',
    resolveStatus: (c) => mapSection(c.section('thumbnail'), c.hasThumb),
    stageTab: 'visuals',
  },
  {
    id: 'caption',
    label: 'Caption',
    icon: FileText,
    meta: () => 'TXT',
    resolveStatus: (c) => mapSection(c.section('captions'), c.hasScript),
    stageTab: 'complete',
  },
  {
    id: 'voiceover',
    label: 'Voiceover',
    icon: Mic,
    meta: (c) => (c.hasVoice ? 'MP3 · ready' : 'MP3'),
    resolveStatus: (c) => mapSection(c.section('voice'), c.hasVoice),
    stageTab: 'voice',
  },
  {
    id: 'music',
    label: 'Music',
    icon: Music,
    meta: () => 'Licensed Track',
    resolveStatus: (c) =>
      c.exportReady || c.hasVoice ? 'ready' : c.isGenerating ? 'generating' : 'pending',
    stageTab: 'complete',
  },
  {
    id: 'hashtags',
    label: 'Hashtags',
    icon: Hash,
    meta: (c) => `${c.hashtagCount || 12} Hashtags`,
    resolveStatus: (c) => mapSection(c.section('captions'), c.hashtagCount > 0),
    stageTab: 'complete',
  },
  {
    id: 'storyboard',
    label: 'Storyboard',
    icon: Clapperboard,
    meta: (c) => `${c.scenesCount || 0} scenes`,
    resolveStatus: (c) => mapSection(c.section('storyboard'), c.scenesCount > 0),
    stageTab: 'visuals',
  },
  {
    id: 'script',
    label: 'Script',
    icon: FileText,
    meta: () => 'Full script',
    resolveStatus: (c) => mapSection(c.section('script'), c.hasScript),
    stageTab: 'script',
  },
  {
    id: 'scenes',
    label: 'Scenes',
    icon: Film,
    meta: (c) => `${c.scenesCount || 0} beats`,
    resolveStatus: (c) => mapSection(c.section('visualDirection'), c.scenesCount > 0),
    stageTab: 'scenes',
  },
  {
    id: 'motion',
    label: 'Motion Plan',
    icon: Sparkles,
    meta: () => 'Ken Burns · drift',
    resolveStatus: (c) => {
      if (c.generationStep === 'motion') return 'generating'
      if (c.scenesCount > 0 && (c.isComplete || c.section('storyboard') === 'completed'))
        return 'ready'
      if (c.isGenerating && c.scenesCount > 0) return 'generating'
      return 'pending'
    },
    stageTab: 'motion',
  },
  {
    id: 'export',
    label: 'Export Package',
    icon: Package,
    meta: () => 'MP4 + assets',
    resolveStatus: (c) => mapSection(c.section('export'), c.exportReady),
    stageTab: 'complete',
  },
]

function StatusPill({ status }: { status: AssetStatus }) {
  if (status === 'generating') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-cyan-300/90">
        <Loader2 className="w-3 h-3 animate-spin" />
        Generating
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-red-300/90">
        <AlertCircle className="w-3 h-3" />
        Failed
      </span>
    )
  }
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/95">
        <Check className="w-3 h-3" />
        Ready
      </span>
    )
  }
  return <span className="text-[10px] text-luxe/35">Pending</span>
}

type QuickModeAssetCardsProps = {
  projectId?: string
  className?: string
  compact?: boolean
}

export function QuickModeAssetCards({ projectId, className, compact }: QuickModeAssetCardsProps) {
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const sectionStatus = useQuickCutGenerationStore((s) => s.sectionStatus)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const script = useQuickCutGenerationStore((s) => s.script)
  const exportPackageReady = useQuickCutGenerationStore((s) => s.exportPackageReady)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const setActiveStageTab = useQuickCutGenerationStore((s) => s.setActiveStageTab)

  const pid = projectId ?? savedProjectId
  const thumbUrl = scenes.find((s) => s.imageUrl)?.imageUrl
  const hashtagCount = Math.max(3, Math.min(12, script.split('#').length - 1 || 12))

  const ctx: AssetContext = {
    section: (key) => sectionStatus[key as keyof typeof sectionStatus],
    isGenerating,
    isComplete,
    generationStep,
    scenesCount: scenes.length,
    hasThumb: Boolean(thumbUrl),
    hasVoice: Boolean(voiceUrl?.trim()),
    hasScript: Boolean(script?.trim()),
    hashtagCount,
    exportReady: Boolean(exportPackageReady || videoUrl?.trim()),
  }

  const visible = ASSETS.filter((a) => {
    const st = a.resolveStatus(ctx)
    return st !== 'pending' || isGenerating || isComplete
  })

  const handleOpen = (tab?: QuickCutStageTab) => {
    if (tab) setActiveStageTab(tab, true)
    if (pid && tab) {
      window.location.href = directorWorkspaceHref(pid, { tab })
    }
  }

  return (
    <div className={cn('space-y-2', className)} aria-label="Generated assets">
      {visible.map((asset) => {
        const Icon = asset.icon
        const status = asset.resolveStatus(ctx)
        const showThumb = asset.id === 'thumbnail' && thumbUrl

        return (
          <button
            key={asset.id}
            type="button"
            onClick={() => handleOpen(asset.stageTab)}
            className={cn(
              'w-full flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition',
              'border-white/[0.06] bg-black/30 hover:border-violet-400/25 hover:bg-violet-500/[0.04]',
              compact && 'py-1.5'
            )}
          >
            {showThumb ? (
              <span className="relative h-10 w-8 shrink-0 overflow-hidden rounded-md border border-white/[0.08]">
                <img src={thumbUrl!} alt="" className="h-full w-full object-cover" />
              </span>
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-violet-300/80">
                <Icon className="w-4 h-4" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium text-luxe/90">{asset.label}</span>
              <span className="block text-[10px] text-luxe/40 truncate">{asset.meta(ctx)}</span>
            </span>
            <StatusPill status={status} />
          </button>
        )
      })}
      {pid ? (
        <p className="text-[10px] text-luxe/40 pt-1">
          <Link
            href={directorWorkspaceHref(pid)}
            className="text-violet-300/90 hover:text-violet-200 underline-offset-2 hover:underline"
          >
            Open Director Mode
          </Link>{' '}
          for timeline &amp; advanced edits
        </p>
      ) : null}
    </div>
  )
}
