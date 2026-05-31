'use client'

import { useCallback, useMemo, useState } from 'react'
import { Copy, Download, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { exportScriptAsDoc } from '@/lib/export-docx'
import {
  buildOutputExportText,
  copyTextToClipboard,
  deriveCaptionLines,
  deriveThumbnailConcept,
  downloadClientBlob,
  exportBaseName,
} from '@/lib/workspace/output-workspace-utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

type ExportHubProps = {
  className?: string
}

export function ExportHub({ className }: ExportHubProps) {
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scriptBeats = useQuickCutGenerationStore((s) => s.scriptBeats)
  const payoff = useQuickCutGenerationStore((s) => s.payoff)
  const cta = useQuickCutGenerationStore((s) => s.cta)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const visualStyle = useQuickCutGenerationStore((s) => s.visualStyle)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)

  const [busy, setBusy] = useState<'copy' | 'txt' | 'doc' | null>(null)

  const exportPayload = useMemo(
    () => ({
      title,
      hook,
      script,
      scriptBeats,
      payoff,
      cta,
      captions: deriveCaptionLines({ hook, script, cta, payoff }),
      thumbnailConcept: deriveThumbnailConcept({
        hook,
        title,
        scenes,
        visualStyleLabel: visualStyle?.label ?? null,
      }),
    }),
    [title, hook, script, scriptBeats, payoff, cta, scenes, visualStyle?.label]
  )

  const exportText = useMemo(() => buildOutputExportText(exportPayload), [exportPayload])
  const hasContent = Boolean(exportText.trim())
  const baseName = exportBaseName(title)

  const recordExport = useCallback(
    (format: 'copy' | 'txt' | 'doc') => {
      if (!savedProjectId) return
      fetch('/api/workspace/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: savedProjectId, format }),
      }).catch(() => {})
    },
    [savedProjectId]
  )

  const copyAll = useCallback(async () => {
    if (!hasContent) return
    setBusy('copy')
    const ok = await copyTextToClipboard(exportText)
    toast[ok ? 'success' : 'error'](ok ? 'All content copied' : 'Copy failed')
    if (ok) recordExport('copy')
    setBusy(null)
  }, [exportText, hasContent, recordExport])

  const downloadTxt = useCallback(() => {
    if (!hasContent) return
    setBusy('txt')
    const ok = downloadClientBlob(exportText, `${baseName}.txt`, 'text/plain')
    toast[ok ? 'success' : 'error'](ok ? 'TXT downloaded' : 'Download failed')
    if (ok) recordExport('txt')
    setBusy(null)
  }, [baseName, exportText, hasContent, recordExport])

  const downloadDoc = useCallback(() => {
    if (!hasContent) return
    setBusy('doc')
    try {
      exportScriptAsDoc({
        title: title.trim() || 'Mugtee Project',
        body: exportText,
        isUnlimited: true,
      })
      toast.success('DOC downloaded')
      recordExport('doc')
    } catch {
      toast.error('DOC export failed')
    }
    setBusy(null)
  }, [exportText, hasContent, recordExport, title])

  if (!hasContent && !hook && !script) return null

  return (
    <section
      id="output-export-hub"
      className={cn(
        'rounded-xl border border-gold-500/15 bg-black/45 p-4 space-y-3',
        className
      )}
      aria-label="Export hub"
    >
      <div>
        <p className="text-[9px] tracking-[0.22em] uppercase text-gold-300/75">Export hub</p>
        <p className="text-[11px] text-luxe/50 mt-0.5 italic">
          Copy or download hook, script, captions — client-side only.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!hasContent || busy !== null}
          onClick={() => void copyAll()}
          className="h-8 gap-1.5 border border-white/[0.08] bg-black/30 hover:bg-gold-500/[0.08] hover:border-gold-500/25 text-luxe/80 hover:text-gold-200"
        >
          <Copy className="w-3.5 h-3.5" />
          Copy All
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!hasContent || busy !== null}
          onClick={downloadTxt}
          className="h-8 gap-1.5 border border-white/[0.08] bg-black/30 hover:bg-gold-500/[0.08] hover:border-gold-500/25 text-luxe/80 hover:text-gold-200"
        >
          <Download className="w-3.5 h-3.5" />
          Export TXT
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!hasContent || busy !== null}
          onClick={downloadDoc}
          className="h-8 gap-1.5 border border-white/[0.08] bg-black/30 hover:bg-gold-500/[0.08] hover:border-gold-500/25 text-luxe/80 hover:text-gold-200"
        >
          <FileText className="w-3.5 h-3.5" />
          Export DOCX
        </Button>
      </div>
    </section>
  )
}
