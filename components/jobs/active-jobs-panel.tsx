'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { STUDIO } from '@/lib/create/routes'
import { cn } from '@/lib/utils'

type ActiveJob = {
  jobId: string
  label: string
  progress: number
  currentStep: string | null
  projectId: string | null
  projectTitle: string | null
}

const STEP_PHRASES: Record<string, string> = {
  images: 'Generating Storyboard',
  voice: 'Generating Voice',
  render: 'Rendering MP4',
  script: 'Writing Script',
  motion: 'Applying Motion',
}

export function ActiveJobsPanel({ className }: { className?: string }) {
  const [active, setActive] = useState<ActiveJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const res = await fetch('/api/generation/jobs/list')
      if (!res.ok || cancelled) return
      const data = (await res.json()) as {
        jobs?: Array<{
          jobId: string
          status: string
          progress: number
          currentStep: string | null
          projectId: string | null
          projectTitle: string | null
          label: string
        }>
      }
      const rows = (data.jobs ?? []).filter((j) =>
        ['queued', 'running', 'paused'].includes(j.status)
      )
      setActive(
        rows.map((j) => ({
          jobId: j.jobId,
          label: j.projectTitle || j.label,
          progress: j.progress,
          currentStep: j.currentStep,
          projectId: j.projectId,
          projectTitle: j.projectTitle,
        }))
      )
      setLoading(false)
    }
    void load()
    const id = window.setInterval(() => void load(), 10_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 text-[11px] text-luxe/45', className)}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading active jobs…
      </div>
    )
  }

  if (active.length === 0) {
    return (
      <p className={cn('text-[11px] text-luxe/45', className)}>No active generation jobs.</p>
    )
  }

  return (
    <div className={cn('space-y-3', className)} aria-label="Active jobs">
      <p className="text-[10px] tracking-[0.18em] uppercase text-luxe/45">Active Jobs</p>
      {active.map((job) => {
        const phrase = job.currentStep
          ? STEP_PHRASES[job.currentStep] ?? job.currentStep
          : 'In progress'
        return (
          <div
            key={job.jobId}
            className="rounded-lg border border-gold-500/20 bg-gold-500/[0.04] px-3 py-2"
          >
            <p className="text-[12px] text-luxe/85">{job.label}</p>
            <p className="text-[10px] text-luxe/50">
              {phrase} · <span className="tabular-nums text-gold-200/80">{job.progress}%</span>
            </p>
            {job.projectId ? (
              <Link
                href={`${STUDIO.quick}?project=${job.projectId}`}
                className="text-[10px] text-gold-200/70 hover:text-gold-100 mt-1 inline-block"
              >
                View progress →
              </Link>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
