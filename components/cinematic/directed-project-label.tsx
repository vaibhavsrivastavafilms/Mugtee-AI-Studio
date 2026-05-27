'use client'

import { cn } from '@/lib/utils'

export function DirectedProjectLabel({
  label,
  status,
  className,
}: {
  label: string
  status?: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-[10px] tracking-[0.28em] uppercase text-[#C8A24E]/85">
        Directed · {label}
      </span>
      {status ? (
        <span className="text-[8px] tracking-[0.2em] uppercase text-white/30 px-2 py-0.5 rounded-full border border-white/[0.08]">
          {status}
        </span>
      ) : null}
    </div>
  )
}
