'use client'

import { cn } from '@/lib/utils'

export function ContentAngleLabel({
  angleLabel,
  hookFrameworkLabel,
  className,
}: {
  angleLabel?: string | null
  hookFrameworkLabel?: string | null
  className?: string
}) {
  const angle = angleLabel?.trim()
  const framework = hookFrameworkLabel?.trim()
  if (!angle && !framework) return null

  return (
    <div className={cn('space-y-0.5', className)}>
      {angle ? (
        <p className="text-[10px] tracking-[0.18em] uppercase text-luxe/50">
          Content Angle:{' '}
          <span className="text-gold-300/75">{angle}</span>
        </p>
      ) : null}
      {framework ? (
        <p className="text-[10px] tracking-[0.18em] uppercase text-luxe/50">
          Hook Framework:{' '}
          <span className="text-gold-300/75">{framework}</span>
        </p>
      ) : null}
    </div>
  )
}
