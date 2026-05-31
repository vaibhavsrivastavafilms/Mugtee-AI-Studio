'use client'

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { copyTextToClipboard, deriveThumbnailConcept } from '@/lib/workspace/output-workspace-utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { WorkspaceSectionShell } from '@/components/workspace/output-workspace/workspace-section-shell'
import { SectionActionButton } from '@/components/workspace/output-workspace/section-action-button'

type ThumbnailSectionProps = {
  loading?: boolean
}

export function ThumbnailSection({ loading }: ThumbnailSectionProps) {
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const title = useQuickCutGenerationStore((s) => s.title)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const visualStyle = useQuickCutGenerationStore((s) => s.visualStyle)
  const regenerateSceneImage = useQuickCutGenerationStore((s) => s.regenerateSceneImage)

  const [localConcept, setLocalConcept] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<'copy' | 'regen' | null>(null)

  const thumbnailConcept = useMemo(() => {
    if (localConcept?.trim()) return localConcept
    return deriveThumbnailConcept({
      hook,
      title,
      scenes,
      visualStyleLabel: visualStyle?.label ?? null,
    })
  }, [localConcept, hook, title, scenes, visualStyle?.label])

  const hasConcept = Boolean(thumbnailConcept.trim())
  const firstSceneId = scenes[0]?.id

  const runCopy = useCallback(async () => {
    if (!hasConcept) return
    setBusyAction('copy')
    const ok = await copyTextToClipboard(thumbnailConcept)
    toast[ok ? 'success' : 'error'](ok ? 'Thumbnail idea copied' : 'Could not copy')
    setBusyAction(null)
  }, [hasConcept, thumbnailConcept])

  const runRegenerate = useCallback(async () => {
    setBusyAction('regen')
    if (firstSceneId) {
      try {
        await regenerateSceneImage(firstSceneId)
        const next = deriveThumbnailConcept({
          hook: useQuickCutGenerationStore.getState().hook,
          title,
          scenes: useQuickCutGenerationStore.getState().scenes,
          visualStyleLabel: visualStyle?.label ?? null,
        })
        setLocalConcept(next)
        toast.success('Thumbnail frame refreshed from scene 1')
      } catch {
        toast.message('Platform updated — regenerate storyboard to refresh thumbnail')
      }
    } else {
      toast.message('Generate storyboard first — thumbnail derives from scene 1')
    }
    setBusyAction(null)
  }, [firstSceneId, regenerateSceneImage, title, visualStyle?.label])

  return (
    <WorkspaceSectionShell
      title="Thumbnail"
      subtitle="Cover frame concept"
      loading={loading}
      empty={!hasConcept}
      emptyMessage="Thumbnail concept appears once hook or storyboard exists."
      actions={
        <>
          <SectionActionButton
            label="Copy"
            disabled={!hasConcept}
            loading={busyAction === 'copy'}
            onClick={() => void runCopy()}
          />
          <SectionActionButton
            label="Regenerate"
            loading={busyAction === 'regen'}
            onClick={() => void runRegenerate()}
          />
        </>
      }
    >
      <p className="text-sm text-luxe/85 leading-relaxed">{thumbnailConcept}</p>
    </WorkspaceSectionShell>
  )
}
