'use client'

import { useCallback, useMemo, type ReactNode, type RefObject } from 'react'
import type { StoryBible } from '@/lib/cinematic/story-bible'
import type { RewriteContentType, RewriteContext } from '@/lib/rewrite/rewrite-actions'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useRewriteStore } from '@/stores/rewrite-store'
import {
  RewriteToolbar,
  type RewriteReplacePayload,
} from '@/components/director/rewrite-toolbar'

export function RewriteProvider({
  containerRef,
  children,
  enabled = true,
  defaultContentType = 'script',
  className,
}: {
  containerRef: RefObject<HTMLElement | null>
  children: ReactNode
  enabled?: boolean
  defaultContentType?: RewriteContentType
  className?: string
}) {
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const style = useQuickCutGenerationStore((s) => s.style)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const language = useQuickCutGenerationStore((s) => s.language)
  const storyBible = useQuickCutGenerationStore((s) => s.storyBible)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const applyDirectorRewrite = useRewriteStore((s) => s.applyDirectorRewrite)

  const context = useMemo<RewriteContext & { storyBible?: StoryBible | null; language?: string }>(
    () => ({
      title: title || undefined,
      niche: niche || undefined,
      tone: style || undefined,
      full_text: [hook, script].filter(Boolean).join('\n\n'),
      storyBible,
      language: language || undefined,
    }),
    [title, niche, style, hook, script, storyBible, language]
  )

  const onReplace = useCallback(
    async ({ original, replacement, variant, contentType }: RewriteReplacePayload) => {
      applyDirectorRewrite({
        original,
        replacement,
        variant,
        contentType,
        projectId: savedProjectId,
      })
    },
    [applyDirectorRewrite, savedProjectId]
  )

  return (
    <div ref={containerRef as React.RefObject<HTMLDivElement>} className={className}>
      {enabled ? (
        <RewriteToolbar
          containerRef={containerRef}
          context={context}
          onReplace={onReplace}
          enabled={enabled}
          defaultContentType={defaultContentType}
          projectId={savedProjectId}
        />
      ) : null}
      {children}
    </div>
  )
}
