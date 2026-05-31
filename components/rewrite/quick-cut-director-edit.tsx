'use client'

import { useCallback, useRef } from 'react'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useRewriteStore } from '@/stores/rewrite-store'
import {
  RewriteToolbar,
  type RewriteReplacePayload,
} from '@/components/director/rewrite-toolbar'
import { RewriteProvider } from '@/components/director/rewrite-provider'
import type { RewriteContentType } from '@/lib/rewrite/rewrite-actions'

export function QuickCutDirectorEdit({
  enabled = true,
  className,
  children,
}: {
  enabled?: boolean
  className?: string
  children?: React.ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  if (!enabled) return children ? <div className={className}>{children}</div> : null

  return (
    <RewriteProvider containerRef={containerRef} enabled={enabled} className={className}>
      {children}
    </RewriteProvider>
  )
}

/** Attach director edit to an existing container ref (script panel body). */
export function QuickCutDirectorEditToolbar({
  containerRef,
  enabled = true,
  defaultContentType = 'script',
}: {
  containerRef: React.RefObject<HTMLElement | null>
  enabled?: boolean
  defaultContentType?: RewriteContentType
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

  if (!enabled) return null

  return (
    <RewriteToolbar
      containerRef={containerRef}
      enabled={enabled}
      defaultContentType={defaultContentType}
      projectId={savedProjectId}
      context={{
        title: title || undefined,
        niche: niche || undefined,
        tone: style || undefined,
        full_text: [hook, script].filter(Boolean).join('\n\n'),
        storyBible,
        language: language || undefined,
      }}
      onReplace={onReplace}
    />
  )
}
