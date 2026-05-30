'use client'

import { useCallback, useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { loadProject, updateProject } from '@/lib/cinematic-projects'
import { cn } from '@/lib/utils'

type ShareAsShowcaseToggleProps = {
  projectId: string
  className?: string
}

export function ShareAsShowcaseToggle({ projectId, className }: ShareAsShowcaseToggleProps) {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    void loadProject(projectId)
      .then((row) => {
        if (!alive) return
        setEnabled(Boolean(row.share_as_showcase))
        setError(null)
      })
      .catch(() => {
        if (alive) setError('Could not load sharing preference')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [projectId])

  const onCheckedChange = useCallback(
    async (checked: boolean) => {
      const prev = enabled
      setEnabled(checked)
      setSaving(true)
      setError(null)
      try {
        await updateProject(projectId, { share_as_showcase: checked })
      } catch {
        setEnabled(prev)
        setError('Could not update. Run migration 0023 if this is a new column.')
      } finally {
        setSaving(false)
      }
    },
    [enabled, projectId]
  )

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5',
        className
      )}
    >
      <Switch
        id={`showcase-${projectId}`}
        checked={enabled}
        disabled={loading || saving}
        onCheckedChange={(v) => void onCheckedChange(v)}
        className="mt-0.5"
      />
      <label htmlFor={`showcase-${projectId}`} className="min-w-0 cursor-pointer select-none">
        <span className="block text-[10px] tracking-[0.16em] uppercase text-gold-300/90">
          Share as showcase
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground leading-snug">
          Help inspire other creators.
        </span>
        {error ? (
          <span className="mt-1 block text-[10px] text-amber-400/90">{error}</span>
        ) : null}
      </label>
    </div>
  )
}
