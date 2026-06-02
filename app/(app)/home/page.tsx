import type { Metadata } from 'next'
import { CompanionHomePage } from '@/components/home/companion-home-page'

export const metadata: Metadata = {
  title: 'Mugtee · Live Companion',
  description: 'Talk to Mugtee — your cinematic AI co-director with memory of your creative journey.',
}

export default function HomeCompanionPage() {
  return <CompanionHomePage />
}
