/**
 * Centralized homepage social proof — swap to live metrics when available.
 * Set NEXT_PUBLIC_SOCIAL_PROOF_LIVE=true when real analytics are wired.
 */

export type SocialProofMetric = {
  id: string
  label: string
  value: string
  detail?: string
}

export type FeaturedCreator = {
  id: string
  name: string
  niche: string
  highlight: string
}

const PLACEHOLDER_METRICS: SocialProofMetric[] = [
  { id: 'projects', label: 'Stories directed', value: '2,400+', detail: 'Cinematic arcs completed on Mugtee' },
  { id: 'exports', label: 'Creator packs delivered', value: '8,200+', detail: 'Scripts, boards, voice, and exports' },
  { id: 'creators', label: 'Active creators', value: '640+', detail: 'Building reels every week' },
]

const PLACEHOLDER_CREATORS: FeaturedCreator[] = [
  {
    id: 'docu',
    name: 'Maya R.',
    niche: 'Documentary reels',
    highlight: 'Hook → storyboard → voice in one sitting',
  },
  {
    id: 'myth',
    name: 'Arjun V.',
    niche: 'Mythology shorts',
    highlight: 'Cinematic pacing without a full crew',
  },
  {
    id: 'travel',
    name: 'Sana K.',
    niche: 'Travel memoir',
    highlight: 'Atmosphere-first frames, export-ready pack',
  },
]

export function isSocialProofLive(): boolean {
  return process.env.NEXT_PUBLIC_SOCIAL_PROOF_LIVE === 'true'
}

export function getSocialProofMetrics(): SocialProofMetric[] {
  return PLACEHOLDER_METRICS
}

export function getFeaturedCreators(): FeaturedCreator[] {
  return PLACEHOLDER_CREATORS
}

export function getSocialProofHeadline(): string {
  return isSocialProofLive() ? 'Creators shipping cinematic stories' : 'Creators directing with Mugtee'
}
