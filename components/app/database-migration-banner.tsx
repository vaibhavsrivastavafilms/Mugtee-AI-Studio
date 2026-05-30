'use client'

import Link from 'next/link'
import {
  CINEMATIC_PROJECTS_MIGRATION_HINT,
  getSupabaseSqlEditorUrl,
} from '@/lib/cinematic-projects'

type DatabaseMigrationBannerProps = {
  /** Called after user runs migrations and clicks retry (e.g. reload projects). */
  onRetry?: () => void
}

/** Non-blocking banner when cinematic_projects migrations 0014–0018 are missing. */
export function DatabaseMigrationBanner({ onRetry }: DatabaseMigrationBannerProps) {
  const sqlEditorUrl = getSupabaseSqlEditorUrl()

  return (
    <div
      role="status"
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90"
    >
      <p className="font-medium text-amber-100">Project library setup required</p>
      <p className="mt-1 text-amber-100/80 leading-relaxed">{CINEMATIC_PROJECTS_MIGRATION_HINT}</p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[12px] text-amber-100/75 leading-relaxed">
        <li>
          Open{' '}
          {sqlEditorUrl ? (
            <a
              href={sqlEditorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-200 underline underline-offset-2 hover:text-amber-100"
            >
              Supabase SQL Editor
            </a>
          ) : (
            'Supabase Dashboard → SQL Editor'
          )}
        </li>
        <li>
          Paste and run{' '}
          <code className="text-amber-200/90">supabase/RUN_IN_SQL_EDITOR.sql</code> from this repo
        </li>
        <li>
          Verify at{' '}
          <Link
            href="/api/test-db"
            target="_blank"
            className="text-amber-200 underline underline-offset-2 hover:text-amber-100"
          >
            /api/test-db
          </Link>{' '}
          — expect <code className="text-amber-200/90">success: true</code>
        </li>
        <li>Reload this page and retry save</li>
      </ol>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-100 hover:bg-amber-500/25 transition-colors"
        >
          Retry load
        </button>
      ) : null}
    </div>
  )
}
