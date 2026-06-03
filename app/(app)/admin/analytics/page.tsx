import { ConversionAnalyticsDashboard } from '@/components/admin/conversion-analytics-dashboard'
import { AgentWorkflowAnalytics } from '@/components/admin/agent-workflow-analytics'

export const dynamic = 'force-dynamic'

export default function AdminAnalyticsPage() {
  return (
    <main className="min-h-[calc(100dvh-4rem)] px-4 sm:px-6 py-8">
      <ConversionAnalyticsDashboard />
      <AgentWorkflowAnalytics />
    </main>
  )
}
