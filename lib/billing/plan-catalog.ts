import {
  formatLimitValue,
  getCreatorPlanLimits,
  getFreePlanLimits,
  getProPlanLimits,
  getStudioPlanLimits,
  type PlanLimits,
} from '@/lib/billing/plan-limits'
import { isBillingLive } from '@/lib/billing/plan-mapping'

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
  const live = isBillingLive()

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
      cta: live ? 'Subscribe' : 'Join Waitlist',
      limits: creator,
      features: [
        ...limitFeatures(creator, 'Up to '),
        'Full cinematic pipeline (prompt → MP4)',
        'GPT Image master frames + Veo clips',
        'OpenAI voice narration',
        'Captions + Remotion export',
      ],
      waitlist: !live,
    },
    {
      id: 'pro',
      name: 'Pro',
      badge: 'Scale',
      priceLabel: '₹2,499',
      priceNote: '/ month',
      featured: false,
      cta: live ? 'Subscribe' : 'Join Waitlist',
      limits: pro,
      features: [
        ...limitFeatures(pro, 'Up to '),
        '100 video generations / month',
        'ElevenLabs premium voice',
        'Priority render queue',
        'No watermark exports',
      ],
      waitlist: !live,
    },
    {
      id: 'studio',
      name: 'Agency',
      badge: 'Unlimited',
      priceLabel: '₹4,999',
      priceNote: '/ month',
      featured: false,
      cta: live ? 'Subscribe' : 'Join Waitlist',
      limits: studio,
      features: [
        'Unlimited generations (fair use)',
        'Team-ready project library',
        'Priority support',
        'All Pro features',
      ],
      waitlist: !live,
    },
  ]
}

export const CREATOR_UPGRADE_BENEFITS = [
  '6× more generations vs Free',
  '5× more exports',
  'Cached research — ~$0.08 saved per regen',
  'Margin-aligned limits at ₹999/mo',
]
