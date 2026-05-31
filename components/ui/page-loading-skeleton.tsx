import { Skeleton } from '@/components/ui/state'
import { cn } from '@/lib/utils'

export function PageLoadingSkeleton({
  className,
  variant = 'studio',
}: {
  className?: string
  variant?: 'studio' | 'grid' | 'export'
}) {
  if (variant === 'grid') {
    return (
      <div
        className={cn(
          'grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2',
          className
        )}
      >
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
        ))}
      </div>
    )
  }

  if (variant === 'export') {
    return (
      <div className={cn('rounded-[28px] border border-white/[0.06] p-8 space-y-4', className)}>
        <Skeleton className="aspect-video w-full max-w-2xl mx-auto rounded-2xl" />
        <Skeleton className="h-4 w-48 mx-auto" />
        <Skeleton className="h-10 w-40 mx-auto rounded-xl" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-4 max-w-3xl', className)}>
      <Skeleton className="h-7 w-2/3 max-w-sm" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="flex gap-3">
        <Skeleton className="h-11 flex-1 max-w-[200px] rounded-xl" />
        <Skeleton className="h-11 flex-1 max-w-[200px] rounded-xl" />
      </div>
    </div>
  )
}
