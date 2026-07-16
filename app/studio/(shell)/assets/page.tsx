import { Suspense } from 'react'
import { AssetDashboard } from '@/components/assets/asset-dashboard'

export const metadata = {
  title: 'Memories | Mugtee',
}

export default function StudioAssetsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
          Mugtee is remembering…
        </div>
      }
    >
      <AssetDashboard />
    </Suspense>
  )
}
