/** Landing V7 demo catalog — swap `src` when real MP4s land in /public/demos. */

export type LandingDemo = {
  id: string
  title: string
  duration: string
  style: string
  /** Optional local or CDN video. Empty → cinematic stage fallback. */
  src?: string
  poster: string
  aspect?: 'video' | 'vertical'
}

export const PIPELINE_STAGES = [
  'Idea',
  'Script',
  'Storyboard',
  'Animation',
  'Voice',
  'Final Reel',
] as const

export const WATCH_CREATE_DEMO: LandingDemo = {
  id: 'watch-create',
  title: 'Watch Mugtee create',
  duration: '0:45',
  style: 'Full pipeline',
  // Drop a file at /public/demos/watch-mugtee-create.mp4 and set src to enable.
  poster:
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1280&q=80',
  aspect: 'video',
}

export const QUICK_CUT_DEMO: LandingDemo = {
  id: 'quick-cut',
  title: 'Quick Cut',
  duration: '0:58',
  style: 'Vertical reel',
  poster:
    'https://images.unsplash.com/photo-1611162616475-46b635cb816c?auto=format&fit=crop&w=900&q=80',
  aspect: 'vertical',
}

export const DIRECTOR_DEMO: LandingDemo = {
  id: 'director',
  title: 'Director Mode',
  duration: '1:12',
  style: 'Cinematic suite',
  poster:
    'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1280&q=80',
  aspect: 'video',
}

export const EXAMPLE_DEMOS: LandingDemo[] = [
  {
    id: 'restaurant',
    title: 'Restaurant Reel',
    duration: '0:32',
    style: 'Warm · handheld',
    poster:
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80',
    aspect: 'vertical',
  },
  {
    id: 'travel',
    title: 'Travel Film',
    duration: '0:48',
    style: 'Golden hour',
    poster:
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
    aspect: 'vertical',
  },
  {
    id: 'product',
    title: 'Product Ad',
    duration: '0:28',
    style: 'Studio · gloss',
    poster:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    aspect: 'vertical',
  },
  {
    id: 'documentary',
    title: 'Documentary',
    duration: '0:55',
    style: 'Grain · archival',
    poster:
      'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=800&q=80',
    aspect: 'vertical',
  },
  {
    id: 'podcast',
    title: 'Podcast Clip',
    duration: '0:40',
    style: 'Intimate · talk',
    poster:
      'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80',
    aspect: 'vertical',
  },
  {
    id: 'interview',
    title: 'Interview',
    duration: '0:36',
    style: 'Soft key light',
    poster:
      'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
    aspect: 'vertical',
  },
  {
    id: 'fashion',
    title: 'Fashion',
    duration: '0:30',
    style: 'Editorial',
    poster:
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=800&q=80',
    aspect: 'vertical',
  },
  {
    id: 'food',
    title: 'Food',
    duration: '0:25',
    style: 'Macro · steam',
    poster:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    aspect: 'vertical',
  },
]

export const TESTIMONIALS = [
  {
    id: 'a',
    name: 'Maya Chen',
    role: 'Creator',
    quote: 'I stopped drafting scripts. I started shipping films.',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'b',
    name: 'Jordan Ellis',
    role: 'Brand filmmaker',
    quote: 'Clients see finished reels, not decks.',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'c',
    name: 'Sofia Park',
    role: 'Story director',
    quote: 'Feels like a quiet studio sitting beside me.',
    avatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
  },
] as const

export const BRAND_LOGOS = ['Aperture', 'Northframe', 'Lumen Co', 'Arc Studio', 'Verse'] as const
