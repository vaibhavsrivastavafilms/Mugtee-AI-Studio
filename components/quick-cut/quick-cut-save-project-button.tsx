'use client'

import Link from 'next/link'
import { Check, FolderOpen, Loader2, RefreshCw, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { projectContinuityHref } from '@/lib/create/routes'
import { relSavedLabel } from '@/stores/cinematic-project'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import {
  getSupabaseSqlEditorUrl,
  isMigrationSaveError,
} from '@/lib/cinematic-projects'

type QuickCutSaveProjectButtonProps = {
  variant?: 'prominent' | 'compact'
  className?: string
  showViewLink?: boolean
}

export function QuickCutSaveProjectButton({
  variant = 'prominent',
  className,
  showViewLink = true,
}: QuickCutSaveProjectButtonProps) {
  const saveState = useQuickCutGenerationStore((s) => s.saveState)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const saveError = useQuickCutGenerationStore((s) => s.saveError)
  const lastSavedAt = useQuickCutGenerationStore((s) => s.lastSavedAt)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const saveProject = useQuickCutGenerationStore((s) => s.saveProject)

  const canSave = Boolean(script.trim() || scenes.length > 0)
  const isSaving = saveState === 'saving'
  const justSaved = saveState === 'saved'
  const hasSaved = Boolean(savedProjectId)
  const isError = saveState === 'error'

  if (!canSave) return null

  const handleSave = () => {
    void saveProject()
  }

  const saveStateResumed = saveState === 'resumed'
  const label = isSaving
    ? 'Saving…'
    : saveStateResumed
      ? 'Generation resumed'
      : justSaved
        ? 'Saved'
        : isError
          ? 'Retry save'
          : hasSaved
            ? 'Saved to Library'
            : 'Save Project'

  const Icon = isSaving
    ? Loader2
    : justSaved || (hasSaved && !isError)
      ? Check
      : isError
        ? RefreshCw
        : Save

  const prominentSaved = hasSaved && !isSaving && !isError && !justSaved
  const migrationError = isMigrationSaveError(saveError)
  const sqlEditorUrl = getSupabaseSqlEditorUrl()

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        title={
          hasSaved
            ? 'Update your saved project in the library'
            : 'Save title, script, scenes, voice, and video to your library'
        }
        className={cn(
          'inline-flex min-h-[44px] items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[12px] font-semibold tracking-[0.12em] uppercase transition-opacity w-full sm:w-auto',
          variant === 'prominent' && !prominentSaved && !isError
            ? 'bg-gold-gradient text-black shadow-gold-glow hover:opacity-90'
            : variant === 'prominent' && prominentSaved
              ? 'border border-gold-500/40 bg-gold-500/[0.12] text-gold-100 hover:bg-gold-500/18'
              : variant === 'compact'
                ? 'border border-gold-500/30 bg-gold-500/[0.06] text-gold-200 hover:bg-gold-500/10 px-4 py-2 min-h-[36px] text-[11px]'
                : 'border border-amber-500/40 bg-amber-500/[0.08] text-amber-100 hover:bg-amber-500/12',
          isSaving && 'opacity-80 cursor-wait',
          !isSaving && 'hover:opacity-90'
        )}
      >
        <Icon className={cn('w-4 h-4', isSaving && 'animate-spin')} aria-hidden />
        {label}
      </button>

      {saveError && isError ? (
        <div className="max-w-sm text-center text-[10px] leading-relaxed tracking-wide text-amber-200/80">
          <p>{saveError}</p>
          {migrationError ? (
            <p className="mt-2 space-x-2">
              {sqlEditorUrl ? (
                <a
                  href={sqlEditorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-200 underline underline-offset-2 hover:text-amber-100"
                >
                  Open SQL Editor
                </a>
              ) : null}
              <a
                href="/api/test-db"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-200 underline underline-offset-2 hover:text-amber-100"
              >
                Verify setup
              </a>
              <span className="text-amber-100/50">· run RUN_IN_SQL_EDITOR.sql</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {lastSavedAt && saveState === 'idle' && hasSaved ? (
        <p className="text-[10px] tracking-[0.14em] uppercase text-gold-300/55">
          {relSavedLabel(lastSavedAt)}
        </p>
      ) : null}

      {showViewLink && hasSaved && savedProjectId ? (
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] tracking-[0.12em] uppercase">
          <Link
            href={projectContinuityHref(savedProjectId)}
            className="inline-flex items-center gap-1.5 text-gold-200/80 hover:text-gold-100 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" aria-hidden />
            View project
          </Link>
          <span className="text-luxe/25" aria-hidden>
            ·
          </span>
          <Link
            href="/projects"
            className="text-gold-200/65 hover:text-gold-100 transition-colors"
          >
            All projects
          </Link>
        </div>
      ) : null}
    </div>
  )
}
