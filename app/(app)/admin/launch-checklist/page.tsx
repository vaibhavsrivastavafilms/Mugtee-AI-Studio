import { FounderTestingChecklist } from '@/components/admin/founder-testing-checklist'

export const dynamic = 'force-dynamic'

export default function AdminLaunchChecklistPage() {
  return (
    <main className="min-h-[calc(100dvh-4rem)] px-4 sm:px-6 py-8">
      <FounderTestingChecklist />
    </main>
  )
}
