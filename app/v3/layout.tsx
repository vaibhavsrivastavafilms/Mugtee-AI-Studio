import type { Metadata } from 'next'
import { V3Shell } from '@/features/v3/components/v3-shell'

export const metadata: Metadata = {
  title: 'Mugtee · Production OS',
  description: 'Autonomous AI production — one prompt to finished cinematic video.',
}

export default function V3Layout({ children }: { children: React.ReactNode }) {
  return <V3Shell>{children}</V3Shell>
}
