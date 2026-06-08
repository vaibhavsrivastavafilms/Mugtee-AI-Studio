'use client'

import { GenerationJobsDashboard } from '@/components/jobs/generation-jobs-dashboard'
import { ActiveJobsPanel } from '@/components/jobs/active-jobs-panel'
import { v4PanelClass } from '@/lib/studio/v4-design-tokens'
import { cn } from '@/lib/utils'

export default function GenerationJobsPage() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-luxe p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/70">Creator OS</p>
          <h1 className="text-xl font-display text-luxe mt-1">Generation Jobs</h1>
          <p className="text-sm text-luxe/45 mt-1">
            Cross-device resume, progress tracking, and active jobs.
          </p>
        </header>
        <div className={cn(v4PanelClass, 'p-4')}>
          <ActiveJobsPanel />
        </div>
        <div className={cn(v4PanelClass, 'p-4')}>
          <GenerationJobsDashboard />
        </div>
      </div>
    </div>
  )
}
