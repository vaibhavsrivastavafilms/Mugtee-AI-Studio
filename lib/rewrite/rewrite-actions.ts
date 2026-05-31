import type { LucideIcon } from 'lucide-react'
import {
  Camera,
  Clapperboard,
  Film,
  Flame,
  Heart,
  Megaphone,
  MessageCircle,
  Maximize2,
  Sparkles,
  Scissors,
  Target,
  Timer,
  TrendingUp,
  Type,
  Zap,
} from 'lucide-react'

/** Content surface the user is editing — drives which rewrite actions appear. */
export type RewriteContentType =
  | 'hook'
  | 'script'
  | 'scene'
  | 'caption'
  | 'visual_direction'

/** API variant sent as `rewrite_variant` — maps to server-side prompt directives. */
export type RewriteVariant =
  | 'more_viral'
  | 'increase_curiosity'
  | 'increase_retention'
  | 'emotional'
  | 'stronger_opening'
  | 'more_cinematic'
  | 'more_dramatic'
  | 'shorter'
  | 'longer'
  | 'documentary'
  | 'luxury_style'
  | 'storytelling_style'
  | 'increase_tension'
  | 'improve_pacing'
  | 'add_visual_detail'
  | 'stronger_emotional_beat'
  | 'cta'
  | 'more_engagement'
  | 'platform_native'
  | 'cleaner_copy'
  | 'more_filmic'
  | 'better_camera_composition'

export type RewriteAction = {
  id: RewriteVariant
  label: string
  icon: LucideIcon
  tone: string
}

export type RewriteContext = {
  title?: string
  platform?: string
  niche?: string
  tone?: string
  /** Full parent text — gives the model surrounding context. */
  full_text?: string
  content_type?: RewriteContentType
}

export type RewriteApiPayload = {
  mode: 'rewrite_selection'
  context: {
    selection: string
    rewrite_variant: RewriteVariant
    content_type?: RewriteContentType
    full_script?: string
    title?: string
    platform?: string
    niche?: string
    tone?: string
  }
}

const HOOK_ACTIONS: RewriteAction[] = [
  { id: 'more_viral', label: 'More Viral', icon: Sparkles, tone: 'text-gold-300' },
  { id: 'increase_curiosity', label: 'Increase Curiosity', icon: Target, tone: 'text-amber-200' },
  { id: 'increase_retention', label: 'Increase Retention', icon: Timer, tone: 'text-sky-300' },
  { id: 'emotional', label: 'More Emotional', icon: Heart, tone: 'text-pink-300' },
  { id: 'stronger_opening', label: 'Stronger Opening', icon: Flame, tone: 'text-orange-300' },
]

const SCRIPT_ACTIONS: RewriteAction[] = [
  { id: 'more_cinematic', label: 'More Cinematic', icon: Film, tone: 'text-gold-300' },
  { id: 'emotional', label: 'More Emotional', icon: Heart, tone: 'text-pink-300' },
  { id: 'more_dramatic', label: 'More Dramatic', icon: Zap, tone: 'text-violet-300' },
  { id: 'shorter', label: 'Shorter', icon: Scissors, tone: 'text-rose-300' },
  { id: 'longer', label: 'Longer', icon: Maximize2, tone: 'text-emerald-300' },
  { id: 'documentary', label: 'Documentary Style', icon: Clapperboard, tone: 'text-amber-200' },
  { id: 'luxury_style', label: 'Luxury Style', icon: Sparkles, tone: 'text-gold-200' },
  { id: 'storytelling_style', label: 'Storytelling Style', icon: MessageCircle, tone: 'text-luxe/90' },
]

const SCENE_ACTIONS: RewriteAction[] = [
  { id: 'increase_tension', label: 'Increase Tension', icon: Zap, tone: 'text-violet-300' },
  { id: 'improve_pacing', label: 'Improve Pacing', icon: Timer, tone: 'text-sky-300' },
  { id: 'add_visual_detail', label: 'Add Visual Detail', icon: Camera, tone: 'text-emerald-300' },
  { id: 'stronger_emotional_beat', label: 'Stronger Emotional Beat', icon: Heart, tone: 'text-pink-300' },
]

const CAPTION_ACTIONS: RewriteAction[] = [
  { id: 'cta', label: 'Better CTA', icon: Megaphone, tone: 'text-emerald-300' },
  { id: 'more_engagement', label: 'More Engagement', icon: TrendingUp, tone: 'text-gold-300' },
  { id: 'platform_native', label: 'Platform Native', icon: Target, tone: 'text-sky-300' },
  { id: 'cleaner_copy', label: 'Cleaner Copy', icon: Type, tone: 'text-luxe/80' },
]

const VISUAL_ACTIONS: RewriteAction[] = [
  { id: 'more_cinematic', label: 'More Cinematic', icon: Film, tone: 'text-gold-300' },
  { id: 'more_filmic', label: 'More Filmic', icon: Clapperboard, tone: 'text-amber-200' },
  { id: 'better_camera_composition', label: 'Better Camera/Lighting', icon: Camera, tone: 'text-emerald-300' },
]

export const REWRITE_ACTIONS_BY_TYPE: Record<RewriteContentType, RewriteAction[]> = {
  hook: HOOK_ACTIONS,
  script: SCRIPT_ACTIONS,
  scene: SCENE_ACTIONS,
  caption: CAPTION_ACTIONS,
  visual_direction: VISUAL_ACTIONS,
}

export function getRewriteActions(contentType: RewriteContentType): RewriteAction[] {
  return REWRITE_ACTIONS_BY_TYPE[contentType] ?? SCRIPT_ACTIONS
}

export function findRewriteAction(
  variant: RewriteVariant,
  contentType?: RewriteContentType
): RewriteAction | undefined {
  if (contentType) {
    const hit = getRewriteActions(contentType).find((a) => a.id === variant)
    if (hit) return hit
  }
  for (const actions of Object.values(REWRITE_ACTIONS_BY_TYPE)) {
    const hit = actions.find((a) => a.id === variant)
    if (hit) return hit
  }
  return undefined
}

export function buildRewritePayload(
  selection: string,
  variant: RewriteVariant,
  context: RewriteContext = {}
): RewriteApiPayload {
  return {
    mode: 'rewrite_selection',
    context: {
      selection,
      rewrite_variant: variant,
      content_type: context.content_type,
      full_script: context.full_text,
      title: context.title,
      platform: context.platform,
      niche: context.niche,
      tone: context.tone,
    },
  }
}

/** Minimum selection length before the toolbar appears. */
export const REWRITE_MIN_SELECTION_CHARS = 8
