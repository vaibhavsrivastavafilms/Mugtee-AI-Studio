import { GrowthSignalsDashboard } from '@/components/admin/growth-signals-dashboard'

export const dynamic = 'force-dynamic'

export default function AdminGrowthSignalsPage() {
  return (
    <main className="min-h-[calc(100dvh-4rem)] px-4 sm:px-6 py-8">
      <GrowthSignalsDashboard />
    </main>
  )
}
