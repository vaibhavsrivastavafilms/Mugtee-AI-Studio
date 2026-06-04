'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Maximize2, Sparkles, Wand2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { studioBtnOutline } from '@/lib/studio/studio-design-tokens'
import { RewriteProvider } from '@/components/director/rewrite-provider'
import { RewriteToolbar } from '@/components/director/rewrite-toolbar'
import { GenerationStagePanel } from '@/components/quick-cut/generation-stage-panel'
import { MotionStagePanel } from '@/components/quick-cut/motion-stage-panel'
import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'
import { useRewriteStore } from '@/stores/rewrite-store'
import type { QuickCutStageTab } from '@/lib/cinematic/quick-cut/stage-tabs'

export type DirectorEditorTab = 'script' | 'storyboard' | 'motion' | 'voice'

const TAB_TO_STAGE: Record<DirectorEditorTab, QuickCutStageTab> = {
  script: 'script',
  storyboard: 'visuals',
  motion: 'motion',
  voice: 'voice',
}

type MainWorkspaceTabsProps = {
  projectId?: string
  className?: string
}

export function MainWorkspaceTabs({ projectId, className }: MainWorkspaceTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeSceneIndex = useStudioWorkspaceStore((s) => s.activeSceneIndex)
  const setActiveStage = useStudioWorkspaceStore((s) => s.setActiveStage)

  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const script = useQuickCutGenerationStore((s) => s.script)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const title = useQuickCutGenerationStore((s) => s.title)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const style = useQuickCutGenerationStore((s) => s.style)
  const language = useQuickCutGenerationStore((s) => s.language)
  const storyBible = useQuickCutGenerationStore((s) => s.storyBible)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const setActiveStageTab = useQuickCutGenerationStore((s) => s.setActiveStageTab)
  const activeStageTab = useQuickCutGenerationStore((s) => s.activeStageTab)

  const [tab, setTab] = useState<DirectorEditorTab>('script')

  const activeScene = scenes[activeSceneIndex] ?? scenes[0]
  const sceneScript = activeScene?.description?.trim() || ''

  useEffect(() => {
    if (activeStageTab === 'visuals') setTab('storyboard')
    else if (activeStageTab === 'motion') setTab('motion')
    else if (activeStageTab === 'voice') setTab('voice')
    else if (activeStageTab === 'script' || activeStageTab === 'scenes') setTab('script')
  }, [activeStageTab])

  const onTabChange = useCallback(
    (value: string) => {
      const next = value as DirectorEditorTab
      setTab(next)
      setActiveStageTab(TAB_TO_STAGE[next], true)
      const stageMap = {
        script: 'script',
        storyboard: 'storyboard',
        motion: 'motion',
        voice: 'voice',
      } as const
      setActiveStage(stageMap[next])
    },
    [setActiveStage, setActiveStageTab]
  )

  const applySceneRewrite = useRewriteStore((s) => s.applyDirectorRewrite)

  const rewriteContext = useMemo(
    () => ({
      full_text: [hook, script].filter(Boolean).join('\n\n'),
      title: title || undefined,
      niche: niche || undefined,
      tone: style || undefined,
      storyBible,
      language: language || undefined,
    }),
    [hook, script, title, niche, style, storyBible, language]
  )

  const focusSceneScript = useCallback(() => {
    containerRef.current?.querySelector('textarea')?.focus()
  }, [])

  return (
    <RewriteProvider containerRef={containerRef}>
      <div
        ref={containerRef}
        className={cn('flex flex-col flex-1 min-h-0 min-w-0 bg-[#060606]', className)}
      >
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06]">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.18em] uppercase text-luxe/40">
              Scene {String((activeSceneIndex >= 0 ? activeSceneIndex : 0) + 1).padStart(2, '0')}
            </p>
            <h2 className="text-[15px] font-semibold text-luxe truncate">
              {activeScene?.title || 'Select a scene'}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={focusSceneScript} className={studioBtnOutline}>
              <Sparkles className="w-3.5 h-3.5" />
              AI Rewrite
            </button>
            <button
              type="button"
              className="p-2 rounded-lg border border-white/[0.08] text-luxe/50 hover:text-luxe transition"
              aria-label="Expand workspace"
              onClick={() => document.documentElement.requestFullscreen?.()}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={onTabChange} className="flex flex-col flex-1 min-h-0">
          <TabsList className="shrink-0 mx-4 mt-2 h-9 bg-white/[0.03] border border-white/[0.06] p-0.5 rounded-xl">
            {(['script', 'storyboard', 'motion', 'voice'] as const).map((id) => (
              <TabsTrigger
                key={id}
                value={id}
                className="flex-1 rounded-lg text-[11px] tracking-[0.1em] uppercase data-[state=active]:bg-studio-primary data-[state=active]:text-white"
              >
                {id === 'storyboard' ? 'Storyboard' : id.charAt(0).toUpperCase() + id.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="script" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
            <div className="flex flex-col h-full min-h-[200px] px-4 py-3 gap-3">
              <textarea
                data-rewrite-type="scene"
                value={sceneScript}
                onChange={(e) => {
                  if (!activeScene?.id) return
                  const next = e.target.value
                  useQuickCutGenerationStore.setState((s) => ({
                    scenes: s.scenes.map((sc) =>
                      sc.id === activeScene.id ? { ...sc, description: next } : sc
                    ),
                  }))
                }}
                placeholder="Scene narration and beats…"
                className="flex-1 min-h-[140px] w-full resize-none rounded-2xl border border-white/[0.08] bg-[#0D0D0D] px-4 py-3 text-[13px] text-luxe/90 leading-relaxed focus:outline-none focus:border-studio-primary/40 scrollbar-luxe"
              />
              <RewriteToolbar
                containerRef={containerRef}
                context={rewriteContext}
                defaultContentType="scene"
                projectId={projectId ?? savedProjectId}
                onReplace={async ({ original, replacement, variant, contentType }) => {
                  if (!activeScene?.id) return
                  applySceneRewrite({
                    original,
                    replacement,
                    variant,
                    contentType,
                    projectId: savedProjectId,
                  })
                  useQuickCutGenerationStore.setState((s) => ({
                    scenes: s.scenes.map((sc) =>
                      sc.id === activeScene.id ? { ...sc, description: replacement } : sc
                    ),
                  }))
                }}
              />
              {scenes.length > 0 ? (
                <div className="shrink-0 flex gap-2 overflow-x-auto scrollbar-luxe pb-1">
                  {scenes.map((scene, i) => {
                    const url =
                      scene.imageUrl?.trim() ||
                      scene.variationImageUrl?.trim() ||
                      resolveScenePreviewUrl(scene, i)
                    const selected = i === (activeSceneIndex >= 0 ? activeSceneIndex : 0)
                    return (
                      <button
                        key={scene.id || i}
                        type="button"
                        onClick={() => useStudioWorkspaceStore.getState().setActiveSceneIndex(i)}
                        className={cn(
                          'relative shrink-0 w-20 h-14 rounded-lg overflow-hidden border transition',
                          selected
                            ? 'border-studio-primary ring-1 ring-studio-primary/50'
                            : 'border-white/[0.08] opacity-70 hover:opacity-100'
                        )}
                      >
                        {url ? (
                          <Image src={url} alt="" fill sizes="80px" className="object-cover" unoptimized />
                        ) : (
                          <span className="absolute inset-0 bg-white/[0.04]" />
                        )}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent
            value="storyboard"
            className="flex-1 min-h-0 mt-0 overflow-y-auto scrollbar-luxe data-[state=inactive]:hidden"
          >
            <GenerationStagePanel tab="visuals" className="px-2 py-2" />
          </TabsContent>

          <TabsContent
            value="motion"
            className="flex-1 min-h-0 mt-0 overflow-y-auto scrollbar-luxe px-4 py-3 data-[state=inactive]:hidden"
          >
            <div className="flex items-center gap-2 text-studio-primary/80 mb-2">
              <Wand2 className="w-3.5 h-3.5" />
              <p className="text-[10px] tracking-[0.16em] uppercase">Motion presets</p>
            </div>
            <MotionStagePanel scenes={scenes} />
          </TabsContent>

          <TabsContent
            value="voice"
            className="flex-1 min-h-0 mt-0 overflow-y-auto scrollbar-luxe data-[state=inactive]:hidden"
          >
            <GenerationStagePanel tab="voice" className="px-2 py-2" />
          </TabsContent>
        </Tabs>
      </div>
    </RewriteProvider>
  )
}
