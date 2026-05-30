import { LaunchReadinessChecklist } from '@/components/admin/launch-readiness-checklist'

export const dynamic = 'force-dynamic'

export default function AdminLaunchReadinessPage() {
  return (
    <main className="min-h-[calc(100dvh-4rem)] px-4 sm:px-6 py-8">
      <LaunchReadinessChecklist />
    </main>
  )
}
