import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { OutputAlignmentControls } from '@/lib/cinematic/scene-blueprint'
import {
  EMPTY_STORY_BIBLE,
  mergeStoryBible,
  type StoryBible,
} from '@/lib/cinematic/story-bible'
import type { VisualStyle } from '@/lib/cinematic/workflow-state'
import {
  BUILTIN_STYLE_TEMPLATES,
  BUILTIN_TEMPLATE_BY_ID,
} from '@/lib/templates/builtin-templates'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export type StyleTemplate = {
  id: string
  name: string
  category: string
  description: string
  thumbnail: string
  mood: string
  camera_language: string
  color_palette: string
  visual_style: string
  animation_style: string
  character_consistency: string
  prompt_prefix: string
}

export type StyleTemplateApplyResult = {
  styleTemplateId: string
  visualStyle: VisualStyle
  storyBible: StoryBible
  characterDescription: string
  outputAlignmentControls: Partial<OutputAlignmentControls>
  niche?: CinematicNiche
  style?: string
}

export type TemplateRecommendation = {
  id: string
  name: string
  reason: string
}

const CATEGORY_NICHE: Record<string, CinematicNiche> = {
  History: 'documentary',
  Luxury: 'luxury',
  Psychology: 'psychology',
  Finance: 'finance',
  Motivation: 'motivation',
  Spirituality: 'spirituality',
  Documentary: 'documentary',
  'Faceless Reels': 'faceless reels',
}

function parseAnimationStyle(
  raw: string
): OutputAlignmentControls['animationStyle'] {
  const v = raw.toLowerCase()
  if (v.includes('documentary') || v.includes('verité') || v.includes('verite')) {
    return 'documentary'
  }
  if (v.includes('dynamic') || v.includes('punchy') || v.includes('fast')) {
    return 'dynamic'
  }
  if (v.includes('subtle') || v.includes('slow') || v.includes('drift')) {
    return 'subtle'
  }
  return 'cinematic'
}

function characterConsistencyMode(
  raw: string
): OutputAlignmentControls['characterConsistency'] {
  const v = raw.toLowerCase()
  if (v.includes('strict') || v.includes('faceless') || v.includes('never')) {
    return 'strict'
  }
  if (v.includes('loose') || v.includes('varied')) {
    return 'loose'
  }
  return 'balanced'
}

export function listBuiltinStyleTemplates(): StyleTemplate[] {
  return BUILTIN_STYLE_TEMPLATES
}

export function getStyleTemplateById(id: string | null | undefined): StyleTemplate | null {
  if (!id?.trim()) return null
  return BUILTIN_TEMPLATE_BY_ID[id.trim()] ?? null
}

export function styleTemplateToVisualStyle(template: StyleTemplate): VisualStyle {
  return {
    label: template.name,
    palette: template.color_palette,
    camera: template.camera_language,
    lighting: template.mood,
    movement: template.animation_style,
    environment: template.visual_style,
  }
}

export function applyStyleTemplate(templateId: string): StyleTemplateApplyResult | null {
  const template = getStyleTemplateById(templateId)
  if (!template) return null

  const visualStyle = styleTemplateToVisualStyle(template)
  const storyBible = mergeStoryBible(EMPTY_STORY_BIBLE, {
    visualStyle: template.visual_style,
    colorPalette: template.color_palette,
    environment: template.visual_style,
    cameraLanguage: template.camera_language,
    mood: template.mood,
    characterProfile: {
      appearance: template.character_consistency,
    },
  })

  const niche = CATEGORY_NICHE[template.category]
  const animationStyle = parseAnimationStyle(template.animation_style)

  return {
    styleTemplateId: template.id,
    visualStyle,
    storyBible,
    characterDescription: template.character_consistency,
    outputAlignmentControls: {
      visualStyle: template.visual_style,
      cameraLanguage: template.camera_language,
      animationStyle,
      characterConsistency: characterConsistencyMode(template.character_consistency),
    },
    ...(niche ? { niche } : {}),
    style: 'cinematic',
  }
}

export function formatStyleTemplatePromptPrefix(
  template: StyleTemplate | null | undefined
): string {
  if (!template?.prompt_prefix?.trim()) return ''
  return template.prompt_prefix.trim()
}

export function resolveStyleTemplatePromptPrefix(
  templateId?: string | null
): string {
  return formatStyleTemplatePromptPrefix(getStyleTemplateById(templateId))
}

export type RecommendKeywordOptions = {
  limit?: number
  /** Increments on each manual "Suggest styles" click to rotate picks. */
  diversityAttempt?: number
  /** Template ids to deprioritize (last shown on regenerate). */
  excludeIds?: string[]
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const copy = [...arr]
  let s = seed > 0 ? seed : 1
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const j = s % (i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function reasonFromTemplate(template: StyleTemplate, score: number): string {
  const desc = template.description.trim()
  if (desc.length > 0) {
    return desc.length > 140 ? `${desc.slice(0, 137)}…` : desc
  }
  if (score > 0) {
    return `${template.category} — ${template.mood}`
  }
  return `${template.name}: ${template.mood}`
}

/** Keyword fallback when LLM keys are unavailable. */
export function recommendTemplatesByKeywords(
  idea: string,
  limitOrOptions: number | RecommendKeywordOptions = 3
): TemplateRecommendation[] {
  const opts: RecommendKeywordOptions =
    typeof limitOrOptions === 'number' ? { limit: limitOrOptions } : limitOrOptions
  const limit = opts.limit ?? 3
  const diversityAttempt = Math.max(0, opts.diversityAttempt ?? 0)
  const excludeSet = new Set(
    (opts.excludeIds ?? []).map((id) => id.trim()).filter((id) => id.length > 0)
  )

  const text = idea.toLowerCase()
  const scores = BUILTIN_STYLE_TEMPLATES.map((template) => {
    const corpus = [
      template.name,
      template.category,
      template.description,
      template.mood,
      template.visual_style,
      template.prompt_prefix,
    ]
      .join(' ')
      .toLowerCase()

    const tokens = text.split(/\W+/).filter((t) => t.length > 3)
    let score = 0
    for (const token of tokens) {
      if (corpus.includes(token)) score += 2
      if (template.category.toLowerCase().includes(token)) score += 3
      if (template.id.includes(token)) score += 1
    }

    const categoryHints: Array<[RegExp, string]> = [
      [/\b(history|ancient|empire|war|dynasty|stoic|philosophy)\b/, 'History'],
      [/\b(luxury|wealth|estate|craft|old money|haute)\b/, 'Luxury'],
      [/\b(psychology|mind|bias|attachment|behavior|biohack)\b/, 'Psychology'],
      [/\b(finance|money|invest|market|crypto|wealth)\b/, 'Finance'],
      [/\b(motivat|discipline|comeback|grind|gym)\b/, 'Motivation'],
      [/\b(spiritual|mindful|meditat|sacred|faith)\b/, 'Spirituality'],
      [/\b(documentary|investigat|verité|verite|street)\b/, 'Documentary'],
      [/\b(faceless|pov|storytime|facts reel)\b/, 'Faceless Reels'],
    ]
    for (const [re, category] of categoryHints) {
      if (re.test(text) && template.category === category) score += 5
    }

    return { template, score }
  })

  scores.sort((a, b) => b.score - a.score)

  const scoreById = new Map(scores.map((s) => [s.template.id, s.score]))
  const ranked = scores.map((s) => s.template)
  let pool = scores.filter((s) => s.score > 0).map((s) => s.template)
  if (pool.length === 0) pool = [...ranked]

  const withoutExcluded = pool.filter((t) => !excludeSet.has(t.id))
  if (withoutExcluded.length >= limit) {
    pool = withoutExcluded
  } else {
    const backfill = ranked.filter((t) => !excludeSet.has(t.id) && !pool.some((p) => p.id === t.id))
    pool = [...withoutExcluded, ...backfill]
  }
  if (pool.length === 0) {
    pool = BUILTIN_STYLE_TEMPLATES.filter((t) => !excludeSet.has(t.id))
  }

  const poolSize = Math.min(Math.max(limit * 4, 12), pool.length)
  const candidatePool = pool.slice(0, poolSize)
  const shuffled =
    diversityAttempt > 0 || excludeSet.size > 0
      ? shuffleWithSeed(candidatePool, diversityAttempt + idea.length)
      : candidatePool
  const start = diversityAttempt > 0 ? diversityAttempt % shuffled.length : 0
  const picked: StyleTemplate[] = []
  for (let i = 0; picked.length < limit && i < shuffled.length; i++) {
    picked.push(shuffled[(start + i) % shuffled.length]!)
  }

  return picked.map((template) => ({
    id: template.id,
    name: template.name,
    reason: reasonFromTemplate(template, scoreById.get(template.id) ?? 0),
  }))
}

function rowToTemplate(row: Record<string, unknown>): StyleTemplate {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    category: String(row.category ?? ''),
    description: String(row.description ?? ''),
    thumbnail: String(row.thumbnail ?? ''),
    mood: String(row.mood ?? ''),
    camera_language: String(row.camera_language ?? ''),
    color_palette: String(row.color_palette ?? ''),
    visual_style: String(row.visual_style ?? ''),
    animation_style: String(row.animation_style ?? ''),
    character_consistency: String(row.character_consistency ?? ''),
    prompt_prefix: String(row.prompt_prefix ?? ''),
  }
}

/** Fetch templates from Supabase when available; falls back to built-ins. */
export async function fetchStyleTemplates(): Promise<StyleTemplate[]> {
  try {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return listBuiltinStyleTemplates()
    const { data, error } = await supabase
      .from('style_templates')
      .select('*')
      .order('category')
      .order('name')

    if (
      error &&
      (error.code === '42P01' ||
        error.code === 'PGRST205' ||
        (error as { status?: number }).status === 404)
    ) {
      return listBuiltinStyleTemplates()
    }
    if (error || !data?.length) return listBuiltinStyleTemplates()
    return data.map((row) => rowToTemplate(row as Record<string, unknown>))
  } catch {
    return listBuiltinStyleTemplates()
  }
}

export function extractStyleTemplateIdFromCaptions(
  captions: unknown
): string | null {
  if (!captions || typeof captions !== 'object' || Array.isArray(captions)) return null
  const id = (captions as { styleTemplateId?: string }).styleTemplateId
  return typeof id === 'string' && id.trim() ? id.trim() : null
}
