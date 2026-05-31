import { MUGTEE_PERSONALITY } from '@/lib/mugtee/personality'
import { pickSidekickMessage, SIDEKICK_GREETINGS } from '@/lib/sidekick/sidekick-messages'
import type { MoodKeyword } from '@/components/quick-cut/canvas/types'
import type { DirectorMode } from '@/lib/cinematic/director-modes'
import {
  CINEMATIC_NICHES,
  inferNicheFromBrief,
  type CinematicNiche,
} from '@/lib/cinematic/niches'

export type ConversationStep =
  | 'welcome'
  | 'topic'
  | 'platform'
  | 'tone'
  | 'niche'
  | 'discovery'
  | 'launching'

export type ConversationPlatform = 'youtube' | 'instagram' | 'tiktok'

export type ConversationTone =
  | 'cinematic'
  | 'educational'
  | 'investigative'
  | 'inspirational'

export type ChatMessage = {
  id: string
  role: 'mugtee' | 'user'
  text: string
}

export type ConversationContext = {
  topic: string
  platform: ConversationPlatform | null
  tone: ConversationTone | null
  niche: CinematicNiche | null
}

export const CONVERSATION_EXAMPLE_CHIPS = [
  "Documentary about Apple's comeback",
  'AI business reel',
  'Psychology storytelling video',
  'Motivation YouTube script',
] as const

export const PLATFORM_OPTIONS: {
  id: ConversationPlatform
  label: string
  hint: string
}[] = [
  { id: 'youtube', label: 'YouTube', hint: 'Long-form + Shorts' },
  { id: 'instagram', label: 'Instagram', hint: 'Reels & carousels' },
  { id: 'tiktok', label: 'TikTok', hint: 'Scroll-stop shorts' },
]

export const TONE_OPTIONS: {
  id: ConversationTone
  label: string
  hint: string
}[] = [
  { id: 'cinematic', label: 'Cinematic', hint: 'Emotional, visual storytelling' },
  { id: 'educational', label: 'Educational', hint: 'Clear, authority-driven' },
  { id: 'investigative', label: 'Investigative', hint: 'Documentary depth' },
  { id: 'inspirational', label: 'Inspirational', hint: 'Motivation & personal stakes' },
]

export const NICHE_QUICK_PICKS: { id: CinematicNiche; label: string }[] =
  CINEMATIC_NICHES.filter((id) =>
    ['psychology', 'documentary', 'motivation', 'finance', 'storytelling', 'faceless reels'].includes(
      id
    )
  ).map((id) => ({
    id,
    label: id === 'faceless reels' ? 'Faceless Reels' : id.charAt(0).toUpperCase() + id.slice(1),
  }))

export function emptyConversationContext(): ConversationContext {
  return { topic: '', platform: null, tone: null, niche: null }
}

export function welcomeMessage(seed = 0): string {
  const greeting = pickSidekickMessage(seed, SIDEKICK_GREETINGS)
  return `${greeting} What would you like to create today?`
}

export function mugteeReplyForStep(
  step: ConversationStep,
  ctx: ConversationContext
): string {
  switch (step) {
    case 'welcome':
      return welcomeMessage()
    case 'topic':
      return pickMugteePhrase('Solid idea. Where should this land?')
    case 'platform':
      return `Got it — ${platformLabel(ctx.platform!)}. What tone are we chasing?`
    case 'tone':
      return needsNicheStep(ctx)
        ? pickMugteePhrase('Last one — what niche bucket fits best?')
        : pickMugteePhrase("Perfect. I'm filling the canvas and starting generation.")
    case 'niche':
      return pickMugteePhrase("Locked. Five quick questions — then we roll camera.")
    case 'discovery':
      return 'Before we generate anything — tell me what this story is really about. Five questions, fast.'
    case 'launching':
      return pickMugteePhrase('On it — your reel is taking shape.')
    default:
      return pickMugteePhrase('Tell me what you want to make.')
  }
}

function pickMugteePhrase(fallback: string): string {
  const phrases = MUGTEE_PERSONALITY.signaturePhrases
  if (!phrases.length) return fallback
  return phrases[Math.floor(Math.random() * phrases.length)] ?? fallback
}

export function platformLabel(platform: ConversationPlatform): string {
  return PLATFORM_OPTIONS.find((p) => p.id === platform)?.label ?? platform
}

export function toneLabel(tone: ConversationTone): string {
  return TONE_OPTIONS.find((t) => t.id === tone)?.label ?? tone
}

export function needsNicheStep(ctx: Pick<ConversationContext, 'topic' | 'tone'>): boolean {
  const inferred = inferNicheFromBrief({
    topic: ctx.topic,
    tone: ctx.tone ?? undefined,
    style: mapToneToStyle(ctx.tone ?? 'cinematic'),
  })
  const topicLower = ctx.topic.toLowerCase()
  const hasStrongSignal = NICHE_QUICK_PICKS.some(
    (n) => topicLower.includes(n.id.replace('faceless reels', 'faceless')) || topicLower.includes(n.label.toLowerCase())
  )
  return !hasStrongSignal && inferred === 'storytelling'
}

export function resolveNiche(ctx: ConversationContext): CinematicNiche {
  if (ctx.niche) return ctx.niche
  return inferNicheFromBrief({
    topic: ctx.topic,
    tone: ctx.tone ?? undefined,
    style: mapToneToStyle(ctx.tone ?? 'cinematic'),
  })
}

export function mapToneToDirectorMode(tone: ConversationTone): DirectorMode {
  switch (tone) {
    case 'educational':
    case 'investigative':
      return 'documentary'
    case 'inspirational':
      return 'personal-brand'
    case 'cinematic':
    default:
      return 'storyteller'
  }
}

export function mapToneToKeywords(tone: ConversationTone): MoodKeyword[] {
  switch (tone) {
    case 'educational':
      return ['Documentary']
    case 'investigative':
      return ['Documentary', 'Psychology']
    case 'inspirational':
      return ['Emotional', 'Cinematic']
    case 'cinematic':
    default:
      return ['Cinematic']
  }
}

export function mapToneToStyle(tone: ConversationTone): string {
  switch (tone) {
    case 'educational':
      return 'educational, documentary'
    case 'investigative':
      return 'investigative, documentary'
    case 'inspirational':
      return 'inspirational, emotional'
    case 'cinematic':
    default:
      return 'cinematic'
  }
}

export function buildConversationPrompt(ctx: ConversationContext): string {
  const niche = resolveNiche(ctx)
  const parts = [ctx.topic.trim()]
  if (ctx.platform) {
    parts.push(`Target platform: ${platformLabel(ctx.platform)}.`)
  }
  if (ctx.tone) {
    parts.push(`Tone: ${toneLabel(ctx.tone)}.`)
  }
  parts.push(`Niche: ${niche}.`)
  return parts.filter(Boolean).join('\n\n')
}

export function nextStepAfterTopic(ctx: ConversationContext): ConversationStep {
  return 'platform'
}

export function nextStepAfterPlatform(ctx: ConversationContext): ConversationStep {
  return 'tone'
}

export function nextStepAfterTone(ctx: ConversationContext): ConversationStep {
  return needsNicheStep(ctx) ? 'niche' : 'launching'
}

export function nextStepAfterNiche(): ConversationStep {
  return 'launching'
}

let messageCounter = 0
export function createMessage(role: ChatMessage['role'], text: string): ChatMessage {
  messageCounter += 1
  return { id: `msg-${messageCounter}-${Date.now()}`, role, text }
}
