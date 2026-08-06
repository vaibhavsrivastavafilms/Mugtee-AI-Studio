import type { Metadata } from 'next'

import { V7IdeaInput } from '@/features/v7/components/idea-input'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mugtee Studio — Autonomous AI Film Production',
  description: 'Enter one idea. Mugtee researches, writes, directs, animates, and exports your film.',
}

export default function StudioPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#050505] py-16 text-white">
      <V7IdeaInput />
    </main>
  )
}
