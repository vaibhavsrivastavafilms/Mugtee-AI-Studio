import { ValidationDashboard } from '@/components/admin/validation-dashboard'

export const dynamic = 'force-dynamic'

export default function AdminValidationPage() {
  return (
    <main className="min-h-[calc(100dvh-4rem)] px-4 sm:px-6 py-8">
      <ValidationDashboard />
    </main>
  )
}
