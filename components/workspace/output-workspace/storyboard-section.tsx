'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import {
  buildStoryboardExportJson,
  downloadClientBlob,
  exportBaseName,
} from '@/lib/workspace/output-workspace-utils'
import { SceneVisualCard } from '@/components/quick-cut/scene-visual-card'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { WorkspaceSectionShell } from '@/components/workspace/output-workspace/workspace-section-shell'
import { SectionActionButton } from '@/components/workspace/output-workspace/section-action-button'
import { cn } from '@/lib/utils'

type StoryboardSectionProps = {
  loading?: boolean
}

export function StoryboardSection({ loading }: StoryboardSectionProps) {
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const title = useQuickCutGenerationStore((s) => s.title)
  const regeneratingSceneIds = useQuickCutGenerationStore((s) => s.regeneratingSceneIds)
  const regenerateSceneImage = useQuickCutGenerationStore((s) => s.regenerateSceneImage)
  const updateSceneImagePrompt = useQuickCutGenerationStore((s) => s.updateSceneImagePrompt)
  const generateSceneVariations = useQuickCutGenerationStore((s) => s.generateSceneVariations)
  const setSceneMotionPreset = useQuickCutGenerationStore((s) => s.setSceneMotionPreset)

  const [expanded, setExpanded] = useState(false)
  const [exporting, setExporting] = useState(false)

  const hasScenes = scenes.length > 0
  const exportName = exportBaseName(title)

  const exportJson = useCallback(() => {
    if (!hasScenes) return
    setExporting(true)
    const ok = downloadClientBlob(
      buildStoryboardExportJson(scenes),
      `${exportName}-storyboard.json`,
      'application/json'
    )
    toast[ok ? 'success' : 'error'](
      ok ? 'Storyboard JSON downloaded' : 'Export failed'
    )
    setExporting(false)
  }, [exportName, hasScenes, scenes])

  return (
    <WorkspaceSectionShell
      title="Storyboard"
      subtitle={`${scenes.length} scene${scenes.length === 1 ? '' : 's'}`}
      loading={loading}
      empty={!hasScenes}
      emptyMessage="Storyboard frames appear after scene generation."
      actions={
        <>
          <SectionActionButton
            label={expanded ? 'Collapse' : 'Expand'}
            disabled={!hasScenes}
            onClick={() => setExpanded((v) => !v)}
          />
          <SectionActionButton
            label="Export JSON"
            disabled={!hasScenes || exporting}
            loading={exporting}
            onClick={exportJson}
          />
        </>
      }
    >
      <ul
        className={cn(
          'grid gap-2',
          expanded ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
          !expanded && 'max-h-[min(420px,50vh)] overflow-y-auto scrollbar-luxe'
        )}
      >
        {scenes.map((scene, index) => (
          <li key={scene.id || index}>
            <SceneVisualCard
              scene={scene}
              index={index}
              compact={!expanded}
              exportBaseName={exportName}
              loading={regeneratingSceneIds.includes(scene.id)}
              onSavePrompt={(prompt) => void updateSceneImagePrompt(scene.id, prompt)}
              onRegenerate={() => void regenerateSceneImage(scene.id)}
              onVariations={() => void generateSceneVariations(scene.id)}
              onMotionPresetChange={(presetId) => setSceneMotionPreset(scene.id, presetId)}
            />
          </li>
        ))}
      </ul>
    </WorkspaceSectionShell>
  )
}
