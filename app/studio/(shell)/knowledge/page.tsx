import { UnifiedCreatorShell } from '@/components/create/unified-creator-shell'
import { KnowledgeBaseView } from '@/components/create/knowledge-base-view'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function StudioKnowledgePage() {
  return (
    <UnifiedCreatorShell
      title="Knowledge Base"
      subtitle="Topics, series, and themes from your project history — no extra AI cost."
    >
      <Link
        href="/studio/growth"
        className="mb-6 block rounded-xl border border-gold-500/20 bg-gold-500/[0.04] px-4 py-3 text-xs text-gold-200/80 hover:border-gold-500/35 transition-colors"
      >
        View growth metrics & opportunity feed in Growth Command Center →
      </Link>
      <KnowledgeBaseView />
    </UnifiedCreatorShell>
  )
}
