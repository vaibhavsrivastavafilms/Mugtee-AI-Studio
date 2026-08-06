import type { Metadata } from 'next'

import { V7ProductionShell } from '@/features/v7/components/production-shell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Production — Mugtee Studio',
}

type PageProps = {
  params: Promise<{ productionId: string }>
}

export default async function StudioProductionPage({ params }: PageProps) {
  const { productionId } = await params

  return (
    <main className="min-h-[100dvh] bg-[#050505] text-white">
      <V7ProductionShell productionId={productionId} />
    </main>
  )
}
