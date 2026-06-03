import { Suspense } from 'react'
import { AssetDashboard } from '@/components/assets/asset-dashboard'

export const metadata = {
  title: 'Asset Library | Mugtee Studio',
}

export default function StudioAssetsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
          Loading asset library…
        </div>
      }
    >
      <AssetDashboard />
    </Suspense>
  )
}
