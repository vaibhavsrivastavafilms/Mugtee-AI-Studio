import {
  formatLimitValue,
  getCreatorPlanLimits,
  getFreePlanLimits,
  getProPlanLimits,
  getStudioPlanLimits,
  type PlanLimits,
} from '@/lib/billing/plan-limits'

export type PlanInterest = 'free' | 'creator' | 'pro' | 'studio'

export type PlanCatalogEntry = {
  id: PlanInterest
  name: string
  badge: string
  priceLabel: string
  priceNote: string
  featured: boolean
  cta: string
  limits: PlanLimits
  features: string[]
  waitlist: boolean
}

function limitFeatures(limits: PlanLimits, prefix = ''): string[] {
  return [
    `${prefix}${formatLimitValue(limits.projects)} active projects`,
    `${prefix}${formatLimitValue(limits.generations)} AI generations / month`,
    `${prefix}${formatLimitValue(limits.exports)} exports / month`,
    `${prefix}${formatLimitValue(limits.renders)} video renders / month`,
  ]
}

/** Server-side plan catalog for pricing page (reads env-configured limits). */
export function getPlanCatalog(): PlanCatalogEntry[] {
  const free = getFreePlanLimits()
  const creator = getCreatorPlanLimits()
  const pro = getProPlanLimits()
  const studio = getStudioPlanLimits()

  return [
    {
      id: 'free',
      name: 'Free',
      badge: 'Start creating',
      priceLabel: '₹0',
      priceNote: 'forever',
      featured: false,
      cta: 'Current plan',
      limits: free,
      features: [
        ...limitFeatures(free),
        '15 / 30 / 60 second reels',
        'Draft & Creator generation modes',
        'OpenAI TTS voice',
        'Watermarked exports',
      ],
      waitlist: false,
    },
    {
      id: 'creator',
      name: 'Creator',
      badge: 'Recommended',
      priceLabel: '₹999',
      priceNote: '/ month',
      featured: true,
      cta: 'Join Waitlist',
      limits: creator,
      features: [
        ...limitFeatures(creator, 'Up to '),
        'Full Quick Cut pipeline (script → export)',
        'Cached research — lower cost per reel',
        'GPT Image 1 scene stills',
        'No Runway scene clips (margin-safe)',
      ],
      waitlist: true,
    },
    {
      id: 'pro',
      name: 'Pro',
      badge: 'Scale',
      priceLabel: '₹2,499',
      priceNote: '/ month',
      featured: false,
      cta: 'Join Waitlist',
      limits: pro,
      features: [
        ...limitFeatures(pro, 'Up to '),
        'ElevenLabs premium voice',
        'Priority render queue',
        'Higher export limits',
        'Advanced export profiles',
      ],
      waitlist: true,
    },
    {
      id: 'studio',
      name: 'Studio',
      badge: 'Cinematic',
      priceLabel: '₹4,999',
      priceNote: '/ month + credits',
      featured: false,
      cta: 'Join Waitlist',
      limits: studio,
      features: [
        ...limitFeatures(studio, 'Up to '),
        'Cinematic mode — Runway scene clips',
        'Cinematic credits (₹149–299 / AI film)',
        'ElevenLabs + live Perplexity research',
        'Priority support',
      ],
      waitlist: true,
    },
  ]
}

export const CREATOR_UPGRADE_BENEFITS = [
  '6× more generations vs Free',
  '5× more exports',
  'Cached research — ~$0.08 saved per regen',
  'Margin-aligned limits at ₹999/mo',
]
