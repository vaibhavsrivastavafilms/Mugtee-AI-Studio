import type { Metadata } from 'next'

import { AuthProvider } from '@/components/auth/auth-provider'
import { StudioLanding } from '@/components/studio/studio-landing'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mugtee Studio — Autonomous AI Film Production',
  description: 'Enter one idea. Mugtee researches, writes, directs, animates, and exports your film.',
}

export default function StudioPage() {
  return (
    <AuthProvider>
      <main className="flex min-h-[100dvh] flex-col items-center overflow-x-hidden bg-[#050505] px-4 py-12 text-white sm:py-16">
        <StudioLanding />
      </main>
    </AuthProvider>
  )
}
