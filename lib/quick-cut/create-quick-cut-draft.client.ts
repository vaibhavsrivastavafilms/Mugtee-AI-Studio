'use client'

import { archiveGeneratedProject } from '@/lib/cinematic-projects'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import type { QuickPlatformValue } from '@/lib/studio/quick-create-options'
import type { VisualTemplate } from '@/lib/quick-cut/template-system'
import { normalizeVisualTemplate } from '@/lib/quick-cut/template-system'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

export type QuickCutDraftInput = {
  prompt: string
  style: string
  duration: number
  platform: QuickPlatformValue
  language: string
  visualTemplate?: VisualTemplate
}

/** Create a cinematic project row immediately — before pipeline stages run. */
export async function createQuickCutDraftProject(input: QuickCutDraftInput): Promise<string> {
  const title = input.prompt.trim().slice(0, 72) || 'Untitled reel'
  const visualTemplate = normalizeVisualTemplate(input.visualTemplate)
  const row = await archiveGeneratedProject({
    title,
    prompt: input.prompt.trim(),
    script: '',
    scenes: [],
    mode: 'quick',
    style: input.style,
    duration: input.duration,
    language: input.language,
    visualTemplate,
    generation_status: 'generating',
    generation_step: 'hook',
    status: 'generating',
  })

  if (!row?.id) throw new Error('Could not create project')

  useQuickCutGenerationStore.setState({
    savedProjectId: row.id,
    prompt: input.prompt.trim(),
    style: input.style,
    duration: input.duration,
    language: input.language as ProjectLanguage,
    visualTemplate,
    saveState: 'saved',
    saveError: null,
    lastSavedAt: Date.now(),
  })

  return row.id
}
