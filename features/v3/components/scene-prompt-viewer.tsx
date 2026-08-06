'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PromptMetadata, V3ScenePromptRow, V3SceneRow } from '@/types/v3/production'

type ScenePromptViewerProps = {
  scenes: V3SceneRow[]
  scenePrompts: V3ScenePromptRow[]
  className?: string
}

function PromptBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-white/70">{value}</p>
    </div>
  )
}

export function ScenePromptViewer({ scenes, scenePrompts, className }: ScenePromptViewerProps) {
  const [openScenes, setOpenScenes] = useState<Record<string, boolean>>({})
  const promptsBySceneId = new Map(scenePrompts.map((row) => [row.scene_id, row]))

  if (scenePrompts.length === 0) return null

  return (
    <section className={cn('rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 p-4 sm:p-5', className)}>
      <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Prompt engineering</p>
      <ul className="mt-4 space-y-3">
        {scenes.map((scene) => {
          const prompt = promptsBySceneId.get(scene.id)
          if (!prompt) return null

          const isOpen = openScenes[scene.id] ?? false
          const metadata = prompt.metadata as PromptMetadata

          return (
            <li key={scene.id} className="rounded-xl border border-white/[0.06] bg-black/30">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-3 text-left"
                onClick={() =>
                  setOpenScenes((prev) => ({ ...prev, [scene.id]: !prev[scene.id] }))
                }
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#D4AF37]" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/40" />
                )}
                <span className="font-medium text-white/90">Scene {scene.number} prompts</span>
                <span className="ml-auto text-xs text-white/35">v{prompt.prompt_version}</span>
              </button>

              {isOpen ? (
                <div className="space-y-4 border-t border-white/[0.06] px-4 py-4">
                  <PromptBlock label="Image prompt" value={prompt.image_prompt} />
                  <PromptBlock label="Video prompt" value={prompt.video_prompt} />
                  <PromptBlock label="Negative prompt" value={prompt.negative_prompt} />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Metadata</p>
                    <pre className="mt-1 overflow-auto rounded-lg bg-black/40 p-3 text-[10px] leading-relaxed text-[#E6C76A]/90">
                      {JSON.stringify(metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
