'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Play, ExternalLink } from 'lucide-react'
import { STUDIO } from '@/lib/create/routes'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

type JobRow = {
  jobId: string
  status: string
  progress: number
  currentStep: string | null
  lastCompletedStep: string | null
  projectId: string | null
  label: string
  canResume: boolean
  startedAt: string
  lastUpdated: string
  projectTitle: string | null
}

function stepLabel(step: string | null): string {
  if (!step) return 'Queued'
  const map: Record<string, string> = {
    hook: 'Generating Hook',
    script: 'Writing Script',
    scenes: 'Visual Direction',
    images: 'Generating Storyboard',
    motion: 'Applying Motion',
    voice: 'Generating Voice',
    render: 'Rendering MP4',
    complete: 'Complete',
  }
  return map[step] ?? step
}

export function GenerationJobsDashboard({ className }: { className?: string }) {
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [loading, setLoading] = useState(true)
  const resumeGeneration = useQuickCutGenerationStore((s) => s.resumeGeneration)
  const loadSavedProject = useQuickCutGenerationStore((s) => s.loadSavedProject)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/generation/jobs/list')
      if (res.ok) {
        const data = (await res.json()) as { jobs?: JobRow[] }
        setJobs(data.jobs ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 12_000)
    return () => window.clearInterval(id)
  }, [refresh])

  const handleResume = async (job: JobRow) => {
    if (!job.projectId) return
    await loadSavedProject(job.projectId)
    await resumeGeneration()
  }

  return (
    <section className={cn('space-y-4', className)} aria-label="Generation jobs">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/85">Jobs Dashboard</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-[10px] text-luxe/45 hover:text-gold-200"
        >
          Refresh
        </button>
      </div>

      {loading && jobs.length === 0 ? (
        <div className="flex items-center gap-2 text-[11px] text-luxe/45 py-6 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading jobs…
        </div>
      ) : jobs.length === 0 ? (
        <p className="text-[11px] text-luxe/45 text-center py-6">No generation jobs yet.</p>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.jobId}
              className="rounded-xl border border-white/[0.08] bg-black/35 p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-luxe/90 truncate">
                    {job.projectTitle || job.label || 'Reel project'}
                  </p>
                  <p className="text-[10px] text-luxe/45 truncate">
                    {stepLabel(job.currentStep)} · {job.progress}%
                  </p>
                </div>
                <span className="text-[9px] uppercase tracking-wider text-gold-200/70 shrink-0">
                  {job.status}
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-gold-600/70 to-gold-300/90"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {job.canResume && job.projectId ? (
                  <button
                    type="button"
                    onClick={() => void handleResume(job)}
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-gold-200/85 hover:text-gold-100"
                  >
                    <Play className="w-3 h-3" />
                    Resume Job
                  </button>
                ) : null}
                {job.projectId ? (
                  <Link
                    href={`${STUDIO.quick}?project=${job.projectId}`}
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-luxe/55 hover:text-luxe"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open Job
                  </Link>
                ) : null}
              </div>
              <p className="text-[9px] text-luxe/35 tabular-nums">
                {job.jobId.slice(0, 12)}… · Updated{' '}
                {new Date(job.lastUpdated).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
