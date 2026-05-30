import type { DirectorMode } from '@/lib/cinematic/director-modes'

export type CreatorBlueprintCategory =
  | 'YouTube'
  | 'Instagram'
  | 'Personal Brand'
  | 'Storytelling'

export type SuggestedPlatform = 'instagram_reel' | 'youtube_short' | 'youtube_video'

export type CreatorBlueprint = {
  id: string
  category: CreatorBlueprintCategory
  label: string
  prefillPrompt: string
  promptDirective: string
  suggestedDirectorMode?: DirectorMode
  suggestedPlatform?: SuggestedPlatform
}

export const CREATOR_BLUEPRINTS: CreatorBlueprint[] = [
  {
    id: 'youtube-faceless-history',
    category: 'YouTube',
    label: 'Start a Faceless History Channel',
    prefillPrompt:
      'Launch a faceless history YouTube channel about forgotten events that changed the modern world — first video topic and channel positioning.',
    promptDirective: [
      'CREATOR BLUEPRINT: Faceless History Channel',
      'Structure as a channel launch plan plus Episode 1 script outline.',
      'Authority-driven narration, archival visual language, chapter beats: hook mystery → context → revelation → legacy.',
      'Optimize for watch time on long-form YouTube while keeping scenes visually distinct for short-form cuts.',
    ].join('\n'),
    suggestedDirectorMode: 'documentary',
    suggestedPlatform: 'youtube_video',
  },
  {
    id: 'youtube-documentary-channel',
    category: 'YouTube',
    label: 'Start a Documentary Channel',
    prefillPrompt:
      'Plan a documentary YouTube channel on a niche I can own — topic angle, series format, and pilot episode concept.',
    promptDirective: [
      'CREATOR BLUEPRINT: Documentary Channel',
      'Pilot episode + series framing: thesis, evidence beats, human stakes, and episodic hook for subscribe.',
      'Educational credibility, clear chapter arc, B-roll friendly scene descriptions.',
    ].join('\n'),
    suggestedDirectorMode: 'documentary',
    suggestedPlatform: 'youtube_video',
  },
  {
    id: 'youtube-30-day-growth',
    category: 'YouTube',
    label: '30-Day YouTube Growth Plan',
    prefillPrompt:
      'Create a 30-day YouTube growth plan for a new faceless channel — content pillars, upload cadence, and first 4 video topics.',
    promptDirective: [
      'CREATOR BLUEPRINT: 30-Day YouTube Growth Plan',
      'Blend strategy roadmap with a flagship video script for Day 1 upload.',
      'Retention hooks, searchable titles, and repeatable format the creator can batch.',
    ].join('\n'),
    suggestedDirectorMode: 'viral-creator',
    suggestedPlatform: 'youtube_short',
  },
  {
    id: 'youtube-finance-channel',
    category: 'YouTube',
    label: 'Build a Finance Channel',
    prefillPrompt:
      'Launch a faceless personal finance YouTube channel — positioning, trust tone, and first explainer video on a timeless money lesson.',
    promptDirective: [
      'CREATOR BLUEPRINT: Finance Channel',
      'Credible, calm authority — no hype, no guaranteed returns.',
      'Explain one core concept with analogies, practical takeaway, and compliant disclaimers in tone (not legal copy).',
    ].join('\n'),
    suggestedDirectorMode: 'documentary',
    suggestedPlatform: 'youtube_video',
  },
  {
    id: 'instagram-viral-carousel',
    category: 'Instagram',
    label: 'Viral Carousel',
    prefillPrompt:
      'Create a viral Instagram carousel about a counterintuitive lesson in my niche — slide-by-slide hook and payoff.',
    promptDirective: [
      'CREATOR BLUEPRINT: Viral Carousel',
      'Adapt to vertical reel narration that mirrors carousel slide beats (1 idea per beat).',
      'Pattern-interrupt hook, swipe-worthy curiosity gaps, save/share CTA.',
    ].join('\n'),
    suggestedDirectorMode: 'viral-creator',
    suggestedPlatform: 'instagram_reel',
  },
  {
    id: 'instagram-educational-reel',
    category: 'Instagram',
    label: 'Educational Reel',
    prefillPrompt:
      'Write an educational Instagram Reel that teaches one useful skill in under 60 seconds — clear steps and memorable hook.',
    promptDirective: [
      'CREATOR BLUEPRINT: Educational Reel',
      'Teach one concept fast: hook → 3 crisp steps → recap CTA.',
      'Sound-off friendly opening text energy; pacing for Reels retention.',
    ].join('\n'),
    suggestedDirectorMode: 'viral-creator',
    suggestedPlatform: 'instagram_reel',
  },
  {
    id: 'instagram-ai-side-hustle',
    category: 'Instagram',
    label: 'AI Side Hustle Post',
    prefillPrompt:
      'Create an Instagram Reel promoting an AI side hustle idea — what it is, who it helps, and why start now.',
    promptDirective: [
      'CREATOR BLUEPRINT: AI Side Hustle Post',
      'Social-proof tone without fake income claims — show workflow, stack, and first action step.',
      'Hook on opportunity cost; close with comment/save CTA.',
    ].join('\n'),
    suggestedDirectorMode: 'personal-brand',
    suggestedPlatform: 'instagram_reel',
  },
  {
    id: 'instagram-storytelling-reel',
    category: 'Instagram',
    label: 'Storytelling Reel',
    prefillPrompt:
      'Write a storytelling Instagram Reel with a emotional mini-arc — relatable setup, turning point, and lesson.',
    promptDirective: [
      'CREATOR BLUEPRINT: Storytelling Reel',
      'Mini narrative arc in 30–60s: stakes, turn, emotional payoff.',
      'Visual scenes that feel cinematic but native to Reels pacing.',
    ].join('\n'),
    suggestedDirectorMode: 'storyteller',
    suggestedPlatform: 'instagram_reel',
  },
  {
    id: 'personal-brand-founder-story',
    category: 'Personal Brand',
    label: 'Founder Story',
    prefillPrompt:
      'Tell my founder origin story for social video — the problem I lived, the insight that changed everything, and what I build now.',
    promptDirective: [
      'CREATOR BLUEPRINT: Founder Story',
      'First-person voice, vulnerable setup, credible turning point, mission-forward close.',
      'Build trust — show humanity before credentials.',
    ].join('\n'),
    suggestedDirectorMode: 'personal-brand',
    suggestedPlatform: 'instagram_reel',
  },
  {
    id: 'personal-brand-authority-builder',
    category: 'Personal Brand',
    label: 'Authority Builder',
    prefillPrompt:
      'Create an authority-building video that positions me as the go-to expert on one specific topic — contrarian insight plus proof.',
    promptDirective: [
      'CREATOR BLUEPRINT: Authority Builder',
      'Lead with a bold POV, support with lived proof or framework, deliver one actionable insight.',
      'Tone: confident expert, not salesy.',
    ].join('\n'),
    suggestedDirectorMode: 'personal-brand',
    suggestedPlatform: 'youtube_short',
  },
  {
    id: 'personal-brand-content-engine',
    category: 'Personal Brand',
    label: 'Content Engine',
    prefillPrompt:
      'Design a personal brand content engine — 3 recurring series formats and a flagship video script for the first series.',
    promptDirective: [
      'CREATOR BLUEPRINT: Content Engine',
      'Systemize repeatable formats; script Episode 1 of the flagship series.',
      'Balance education, personality, and clear next-step CTA for followers.',
    ].join('\n'),
    suggestedDirectorMode: 'personal-brand',
    suggestedPlatform: 'instagram_reel',
  },
  {
    id: 'personal-brand-audience-growth',
    category: 'Personal Brand',
    label: 'Audience Growth Plan',
    prefillPrompt:
      'Build a 30-day audience growth plan for my personal brand — content themes, posting rhythm, and launch video concept.',
    promptDirective: [
      'CREATOR BLUEPRINT: Audience Growth Plan',
      'Strategy plus launch video script: niche clarity, value promise, community CTA.',
      'Optimize for shares and saves, not vanity metrics.',
    ].join('\n'),
    suggestedDirectorMode: 'personal-brand',
    suggestedPlatform: 'instagram_reel',
  },
  {
    id: 'storytelling-emotional-short-film',
    category: 'Storytelling',
    label: 'Emotional Short Film',
    prefillPrompt:
      'Write an emotional short film script — a quiet moment that carries a universal feeling and lands with a single image.',
    promptDirective: [
      'CREATOR BLUEPRINT: Emotional Short Film',
      'Cinematic pacing, sensory detail, minimal dialogue, strong visual metaphor.',
      'Emotional crescendo without melodrama — one unforgettable final beat.',
    ].join('\n'),
    suggestedDirectorMode: 'storyteller',
    suggestedPlatform: 'youtube_short',
  },
  {
    id: 'storytelling-life-lesson',
    category: 'Storytelling',
    label: 'Life Lesson Story',
    prefillPrompt:
      'Tell a life lesson story from a single defining day — what happened, what I learned, and what the viewer should remember.',
    promptDirective: [
      'CREATOR BLUEPRINT: Life Lesson Story',
      'Personal narrative frame with universal moral — show don\'t preach.',
      'Hook on the lesson; unfold the story; land the takeaway in one line.',
    ].join('\n'),
    suggestedDirectorMode: 'storyteller',
    suggestedPlatform: 'instagram_reel',
  },
  {
    id: 'storytelling-father-son',
    category: 'Storytelling',
    label: 'Father-Son Narrative',
    prefillPrompt:
      'Write a father-son narrative about understanding across generations — tension, reconciliation, and a small gesture that says everything.',
    promptDirective: [
      'CREATOR BLUEPRINT: Father-Son Narrative',
      'Intimate two-character emotional arc; subtext over exposition.',
      'Visual motifs of distance → connection; earned emotional payoff.',
    ].join('\n'),
    suggestedDirectorMode: 'storyteller',
    suggestedPlatform: 'youtube_short',
  },
  {
    id: 'storytelling-cinematic-documentary',
    category: 'Storytelling',
    label: 'Cinematic Documentary',
    prefillPrompt:
      'Create a cinematic documentary short about an overlooked human story — research angle, narrative spine, and opening scene.',
    promptDirective: [
      'CREATOR BLUEPRINT: Cinematic Documentary',
      'Journalistic integrity with film-poetry visuals — context, witness, revelation.',
      'Narration authoritative but humane; scenes built for archival and observational B-roll.',
    ].join('\n'),
    suggestedDirectorMode: 'documentary',
    suggestedPlatform: 'youtube_video',
  },
]

const BLUEPRINT_IDS = new Set(CREATOR_BLUEPRINTS.map((b) => b.id))

const BLUEPRINT_BY_ID = new Map(CREATOR_BLUEPRINTS.map((b) => [b.id, b]))

export const CREATOR_BLUEPRINT_CATEGORIES: {
  name: CreatorBlueprintCategory
  blueprints: CreatorBlueprint[]
}[] = (['YouTube', 'Instagram', 'Personal Brand', 'Storytelling'] as const).map(
  (name) => ({
    name,
    blueprints: CREATOR_BLUEPRINTS.filter((b) => b.category === name),
  })
)

export function normalizeCreatorBlueprintId(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const id = raw.trim()
  return BLUEPRINT_IDS.has(id) ? id : null
}

export function creatorBlueprintById(
  id: string | null | undefined
): CreatorBlueprint | undefined {
  if (!id) return undefined
  return BLUEPRINT_BY_ID.get(id)
}

export function creatorBlueprintDirective(id: string | null | undefined): string {
  return creatorBlueprintById(id)?.promptDirective ?? ''
}

export function extractCreatorBlueprintFromCaptions(
  captions: unknown
): string | undefined {
  if (!captions || typeof captions !== 'object' || Array.isArray(captions)) {
    return undefined
  }
  const raw = (captions as Record<string, unknown>).blueprintId
  const normalized = normalizeCreatorBlueprintId(raw)
  return normalized ?? undefined
}
