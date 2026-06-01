import { quickCutStudioHref } from '@/lib/create/routes'

/** Hero empty-state examples — cinematic, one-click prefill. */
export const CINEMATIC_HERO_EXAMPLES = [
  {
    id: 'opposite-is-true',
    label: 'The Opposite Is True',
    hook: 'Everything you were taught about success is backwards — and the proof is hiding in plain sight.',
    prompt:
      'The Opposite Is True — contrarian psychology reel on why the advice that sounds wise keeps you stuck',
    imageUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=480&h=640&fit=crop&q=80',
  },
  {
    id: 'luxury-attention',
    label: 'How Luxury Brands Control Attention',
    hook: 'Luxury never sells the product. It sells the silence around it.',
    prompt:
      'How Luxury Brands Control Attention — cinematic business reel on scarcity, ritual, and the psychology of desire',
    imageUrl:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=480&h=640&fit=crop&q=80',
  },
  {
    id: 'psychology-silence',
    label: 'The Psychology of Silence',
    hook: 'The most powerful thing you can say is nothing — when the pause carries the weight.',
    prompt:
      'The Psychology of Silence — intimate psychology reel on pauses, tension, and what we hear in the gaps',
    imageUrl:
      'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=480&h=640&fit=crop&q=80',
  },
] as const

export type QuickStartCategoryId =
  | 'psychology'
  | 'luxury'
  | 'documentary'
  | 'motivation'
  | 'finance'
  | 'faceless'

export const QUICK_START_TEMPLATES: {
  id: QuickStartCategoryId
  label: string
  prompt: string
}[] = [
  {
    id: 'psychology',
    label: 'Psychology',
    prompt:
      'The hidden psychology of why we scroll when we are lonely — intimate reel with mirror framing and soft light',
  },
  {
    id: 'luxury',
    label: 'Luxury',
    prompt:
      'How luxury brands control attention without shouting — cinematic reel on scarcity, ritual, and desire',
  },
  {
    id: 'documentary',
    label: 'Documentary',
    prompt:
      'The moment Apple bet everything on design — a cinematic documentary reel on courage, craft, and subtraction',
  },
  {
    id: 'motivation',
    label: 'Motivation',
    prompt:
      'Nobody talks about discipline like this — the quiet decision before the comeback arc begins',
  },
  {
    id: 'finance',
    label: 'Finance',
    prompt:
      'The one money mistake keeping smart people broke — finance reel with contrarian hook and macro B-roll',
  },
  {
    id: 'faceless',
    label: 'Faceless Reels',
    prompt:
      'Faceless channel reel on stoic discipline — text overlays, moody B-roll, no talking head, 60 seconds',
  },
]

export const GUIDED_STYLE_OPTIONS = QUICK_START_TEMPLATES.map((t) => ({
  id: t.id,
  label: t.label,
  prompt: t.prompt,
}))

export type PopularCreatorIdea = {
  id: string
  title: string
  category: string
  hook: string
  topic: string
  imageUrl: string
}

export const POPULAR_CREATOR_IDEAS: PopularCreatorIdea[] = [
  {
    id: 'scroll-loneliness',
    title: 'Why We Scroll Alone',
    category: 'Psychology',
    hook: 'You were never addicted to your phone. You were addicted to almost being chosen.',
    topic:
      'The hidden psychology of why we scroll when we are lonely — intimate psychology reel with mirror framing',
    imageUrl:
      'https://images.pexels.com/photos/29202430/pexels-photo-29202430.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=400',
  },
  {
    id: 'nokia-lesson',
    title: 'Why Giants Fall',
    category: 'Documentary',
    hook: 'Nokia didn\'t lose to Apple. It lost to the moment it stopped listening.',
    topic:
      'Why Nokia failed — business documentary reel about missing the smartphone shift',
    imageUrl:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=480&h=640&fit=crop&q=80',
  },
  {
    id: 'discipline-rep',
    title: 'The Boring Rep',
    category: 'Motivation',
    hook: 'Everyone posts the result. Nobody posts the rep that made it boring enough to win.',
    topic:
      'Nobody talks about discipline like this — the quiet decision before the comeback arc begins',
    imageUrl:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=480&h=640&fit=crop&q=80',
  },
  {
    id: 'ai-edge',
    title: 'Less Tools, Better Direction',
    category: 'Finance',
    hook: 'The creators pulling ahead aren\'t using more AI. They\'re using less — but better.',
    topic:
      'The one money mistake keeping smart people broke — finance reel with contrarian hook and macro B-roll',
    imageUrl:
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=480&h=640&fit=crop&q=80',
  },
  {
    id: 'luxury-silence',
    title: 'The Silence They Sell',
    category: 'Luxury',
    hook: 'Luxury never sells the product. It sells the silence around it.',
    topic:
      'How luxury brands control attention without shouting — cinematic reel on scarcity and ritual',
    imageUrl:
      'https://images.pexels.com/photos/33645190/pexels-photo-33645190.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=400',
  },
  {
    id: 'faceless-stoic',
    title: 'Stoic Without a Face',
    category: 'Faceless',
    hook: 'Discipline doesn\'t need a talking head. It needs a frame that holds.',
    topic:
      'Faceless channel reel on stoic discipline — text overlays, moody B-roll, no talking head',
    imageUrl:
      'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=480&h=640&fit=crop&q=80',
  },
]

export function activationTopicHref(topic: string, autorun = false): string {
  return quickCutStudioHref({
    topic,
    ...(autorun ? { autorun: '1' } : {}),
  })
}
