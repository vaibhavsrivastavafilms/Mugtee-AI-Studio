import type { Metadata } from 'next'
import { MadeWithMugteeHub } from '@/components/showcase/made-with-mugtee-hub'

export const metadata: Metadata = {
  title: 'Made With Mugtee',
  description:
    'Explore cinematic stories, hooks, and output previews from creators using Mugtee AI Studio.',
  openGraph: {
    title: 'Made With Mugtee',
    description: 'Real creator outputs from the Mugtee cinematic studio.',
  },
}

export default function MadeWithMugteePage() {
  return <MadeWithMugteeHub />
}
