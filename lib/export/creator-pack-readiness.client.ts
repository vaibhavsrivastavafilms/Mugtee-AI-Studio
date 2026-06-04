'use client'

import type { GeneratedScene } from '@/lib/cinematic/generation'
import {
  hasExportableNarration,
  hasExportableSceneImages,
  hasExportableScript,
} from '@/lib/quick-cut/asset-availability'
import { buildQuickCutScriptText } from '@/lib/quick-cut/download-script'

export type CreatorPackCheckItem = {
  id: 'storyboard' | 'voice' | 'captions' | 'script'
  label: string
  ready: boolean
  required: boolean
  hint?: string
}

export type CreatorPackReadiness = {
  items: CreatorPackCheckItem[]
  canExport: boolean
  missingRequired: string[]
}

export function evaluateCreatorPackReadiness(input: {
  title?: string
  hook?: string
  script?: string
  scriptBeats?: { narration: string; duration: string; emotion: string }[]
  scenes: GeneratedScene[]
  voiceUrl?: string | null
  isGenerating?: boolean
}): CreatorPackReadiness {
  const scriptReady = hasExportableScript(input)
  const storyboardReady = hasExportableSceneImages(input.scenes, input.isGenerating)
  const voiceReady = hasExportableNarration(input.voiceUrl)
  const captionsReady =
    scriptReady &&
    Boolean(
      buildQuickCutScriptText({
        title: input.title ?? '',
        hook: input.hook ?? '',
        script: input.script ?? '',
        scriptBeats: input.scriptBeats,
      }).trim()
    )

  const items: CreatorPackCheckItem[] = [
    {
      id: 'storyboard',
      label: 'Storyboard Images',
      ready: storyboardReady,
      required: true,
      hint: storyboardReady ? undefined : 'Generate scene stills before exporting.',
    },
    {
      id: 'voice',
      label: 'Voiceover',
      ready: voiceReady,
      required: true,
      hint: voiceReady ? undefined : 'Generate narration before exporting.',
    },
    {
      id: 'captions',
      label: 'Captions',
      ready: captionsReady,
      required: true,
      hint: captionsReady ? undefined : 'Script needed for captions.txt.',
    },
    {
      id: 'script',
      label: 'Script',
      ready: scriptReady,
      required: true,
      hint: scriptReady ? undefined : 'Generate script before exporting.',
    },
  ]

  const missingRequired = items.filter((i) => i.required && !i.ready).map((i) => i.label)

  return {
    items,
    canExport: missingRequired.length === 0,
    missingRequired,
  }
}
