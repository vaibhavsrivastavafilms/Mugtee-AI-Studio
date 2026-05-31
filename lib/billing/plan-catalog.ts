import {
  formatLimitValue,
  getCreatorPlanLimits,
  getFreePlanLimits,
  getProPlanLimits,
  type PlanLimits,
} from '@/lib/billing/plan-limits'

export type PlanInterest = 'free' | 'creator' | 'pro'

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
        'Best for trying Mugtee — no card required',
        'Cinematic script & storyboard workflow',
        'Quick Cut generation pipeline',
        'Showcase sharing',
      ],
      waitlist: false,
    },
    {
      id: 'creator',
      name: 'Creator',
      badge: 'For solo creators',
      priceLabel: 'Coming soon',
      priceNote: 'monthly',
      featured: true,
      cta: 'Join Waitlist',
      limits: creator,
      features: [
        ...limitFeatures(creator, 'Up to '),
        'Everything in Free, with higher monthly caps',
        'Priority generation queue',
        'Advanced export profiles',
        'Creator analytics dashboard',
        'Knowledge base & series tools',
      ],
      waitlist: true,
    },
    {
      id: 'pro',
      name: 'Pro',
      badge: 'For studios & teams',
      priceLabel: 'Coming soon',
      priceNote: 'monthly',
      featured: false,
      cta: 'Join Waitlist',
      limits: pro,
      features: [
        ...limitFeatures(pro, 'Up to '),
        'Everything in Creator, with the highest limits',
        'Team workspaces (coming soon)',
        'Priority support',
        'Early access to new models',
      ],
      waitlist: true,
    },
  ]
}

export const CREATOR_UPGRADE_BENEFITS = [
  '5× more projects & generations',
  'Higher export & render limits',
  'Priority queue & analytics',
  'Early access pricing when we launch',
]
