'use client'

import { useEffect } from 'react'
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreatorAgentStore } from '@/stores/creator-agent-store'

export function PublishingAssistantPanel({
  title,
  hook,
  description,
  tags,
  hasThumbnail,
  className,
}: {
  title?: string
  hook?: string
  description?: string
  tags?: string[]
  hasThumbnail?: boolean
  className?: string
}) {
  const review = useCreatorAgentStore((s) => s.publishingReview)
  const reviewPublishing = useCreatorAgentStore((s) => s.reviewPublishing)

  useEffect(() => {
    void reviewPublishing({ title, hook, description, tags, hasThumbnail })
  }, [title, hook, description, tags, hasThumbnail, reviewPublishing])

  if (!review) return null

  return (
    <div
      className={cn(
        'rounded-2xl border border-gold-500/20 bg-gold-500/[0.04] p-5 space-y-4',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-[0.24em] uppercase text-gold-300/80 flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" />
          Publishing assistant
        </p>
        <span className="text-lg font-medium text-[var(--v2-gold)]">{review.readinessScore}%</span>
      </div>
      <p className="text-xs text-luxe/55">{review.summary}</p>
      <ul className="space-y-2">
        {review.items.map((item) => (
          <li
            key={item.key}
            className="flex items-start gap-2 text-xs"
          >
            {item.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/80 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-400/80 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="text-luxe/75">{item.label}</span>
              <span className="text-luxe/40 ml-2">{item.score}</span>
              {item.tip ? (
                <p className="text-[10px] text-luxe/45 mt-0.5">{item.tip}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
