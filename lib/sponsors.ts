// Phase — Sponsor / Affiliate config. Single source of truth.
// Add a new sponsor by adding a new entry below; the redirect API and modal pick it up automatically.
//
// Conventions:
//   - `slug`     → matches the URL: /api/sponsor/<slug>
//   - `url`      → final redirect URL. INCLUDE your affiliate / tracking params here.
//   - `reward`   → credits granted on first claim per UTC day (defaults to 3)
//
// Example future entries:
//   capcut:  { slug: 'capcut', name: 'CapCut', url: 'https://www.capcut.com/?aff=mugtee', ... }
//   descript:{ slug: 'descript', name: 'Descript', url: 'https://www.descript.com/?via=mugtee', ... }
//
// NEVER hardcode tracking params elsewhere — keep them here so swapping affiliate ids is a 1-line change.

export interface Sponsor {
  slug: string
  name: string
  category: string
  tagline: string
  url: string
  reward: number
}

export const SPONSORS: Record<string, Sponsor> = {
  elevenlabs: {
    slug: 'elevenlabs',
    name: 'ElevenLabs',
    category: 'Voice AI',
    tagline: 'Hyper-realistic AI voices in 30+ languages \u2014 narrate any faceless script.',
    url: 'https://elevenlabs.io/?from=mugtee',
    reward: 3,
  },
  capcut: {
    slug: 'capcut',
    name: 'CapCut',
    category: 'Editing',
    tagline: 'Free pro-grade video editor for creators on every device.',
    url: 'https://www.capcut.com/?from=mugtee',
    reward: 3,
  },
  descript: {
    slug: 'descript',
    name: 'Descript',
    category: 'Editing',
    tagline: 'Edit video by editing the transcript. Remove filler words in one click.',
    url: 'https://www.descript.com/?from=mugtee',
    reward: 3,
  },
  notion: {
    slug: 'notion',
    name: 'Notion AI',
    category: 'Workspace',
    tagline: 'Organize ideas, outlines and creator notes in one calm workspace.',
    url: 'https://www.notion.so/?from=mugtee',
    reward: 3,
  },
  adobe_express: {
    slug: 'adobe_express',
    name: 'Adobe Express',
    category: 'Design',
    tagline: 'Thumbnail design + social graphics in seconds. Free templates included.',
    url: 'https://www.adobe.com/express/?from=mugtee',
    reward: 3,
  },
}

export const SPONSOR_LIST: Sponsor[] = Object.values(SPONSORS)

export function getSponsor(slug: string): Sponsor | null {
  return SPONSORS[slug] || null
}

export function randomSponsor(): Sponsor {
  return SPONSOR_LIST[Math.floor(Math.random() * SPONSOR_LIST.length)]
}
