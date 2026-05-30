import { UnifiedCreatorShell } from '@/components/create/unified-creator-shell'
import { KnowledgeBaseView } from '@/components/create/knowledge-base-view'

export const dynamic = 'force-dynamic'

export default function StudioKnowledgePage() {
  return (
    <UnifiedCreatorShell
      title="Knowledge Base"
      subtitle="Topics, series, and themes from your project history — no extra AI cost."
    >
      <KnowledgeBaseView />
    </UnifiedCreatorShell>
  )
}
