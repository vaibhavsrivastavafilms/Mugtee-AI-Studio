import { ExportFunnelDashboard } from '@/components/admin/export-funnel-dashboard'

export const dynamic = 'force-dynamic'

export default function AdminExportFunnelPage() {
  return (
    <main className="min-h-[calc(100dvh-4rem)] px-4 sm:px-6 py-8">
      <ExportFunnelDashboard />
    </main>
  )
}
