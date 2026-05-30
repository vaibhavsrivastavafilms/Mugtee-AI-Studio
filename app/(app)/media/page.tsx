import { Suspense } from 'react'
import MediaPageClient from './media-client'

function MediaPageFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
      Loading library…
    </div>
  )
}

export default function MediaPage() {
  return (
    <Suspense fallback={<MediaPageFallback />}>
      <MediaPageClient />
    </Suspense>
  )
}
