'use client'

import { CINEMATIC_PROJECTS_MIGRATION_HINT } from '@/lib/cinematic-projects'

/** Non-blocking banner when cinematic_projects migrations 0014–0017 are missing. */
export function DatabaseMigrationBanner() {
  return (
    <div
      role="status"
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90"
    >
      <p className="font-medium text-amber-100">Project library setup required</p>
      <p className="mt-1 text-amber-100/80 leading-relaxed">{CINEMATIC_PROJECTS_MIGRATION_HINT}</p>
      <p className="mt-2 text-[11px] text-amber-100/60 tracking-wide">
        See <code className="text-amber-200/90">MIGRATION_RUNBOOK.md</code> for consolidated SQL.
      </p>
    </div>
  )
}
