/** Quick Cut V2 — curated visual template definitions (single source of truth). */

export type VisualTemplate =
  | 'creator_story'
  | 'explainer_studio'
  | 'documentary_cinematic'

export const DEFAULT_VISUAL_TEMPLATE: VisualTemplate = 'documentary_cinematic'

export type VisualTemplateConfig = {
  id: VisualTemplate
  name: string
  subtitle: string
  thumbnail: string
  templatePrompt: string
  /** Injected into storyboard SOP — shot composition and framing rules */
  storyboardDirective: string
  /** Character / presenter usage rules for continuity engines */
  characterRules: string
}

const TEMPLATE_PROMPTS: Record<VisualTemplate, string> = {
  creator_story: [
    'Consistent 2D cartoon protagonist in every scene.',
    'Same face, hairstyle, and outfit locked across all frames.',
    'Flat illustrated creator-storytelling style with emotional expressions.',
    'Dark cinematic backgrounds with moody red or warm accent lighting.',
    'Floating UI overlays, metrics cards, and headline graphics when relevant.',
    'Character-driven emotional visual progression beat by beat.',
  ].join(' '),
  explainer_studio: [
    'High-quality 3D animated presenter or AI host in a modern studio.',
    'Warm desk setup with laptop, mug, lamp, and soft window light.',
    'Consistent presenter identity — same face, hair, glasses, and wardrobe.',
    'Educational explainer framing with charts, UI mockups, and slide graphics.',
    'Professional business YouTube presenter aesthetic.',
    'Clean studio environment with shallow depth of field.',
  ].join(' '),
  documentary_cinematic: [
    'Premium documentary style.',
    'Cinematic b-roll without a presenter.',
    'Dramatic lighting and dynamic framing.',
    'Modern YouTube documentary visuals.',
    'Business documentary aesthetic with headline moments.',
    'Dark cinematic color grade with gold or amber highlights.',
  ].join(' '),
}

export const VISUAL_TEMPLATE_CONFIGS: Record<VisualTemplate, VisualTemplateConfig> = {
  creator_story: {
    id: 'creator_story',
    name: 'Creator Story',
    subtitle: 'Character-based storytelling',
    thumbnail: '/templates/creator-story.jpg',
    templatePrompt: TEMPLATE_PROMPTS.creator_story,
    storyboardDirective:
      'Character-centered 2D cartoon scenes. One consistent protagonist in every segment — same face, hair, and clothing. Dark moody backgrounds. Optional floating metric/UI overlays for data beats. Emotional progression.',
    characterRules:
      'One flat illustrated protagonist. Locked face, hairstyle, and outfit. Character visible in every scene. Background evolves with story.',
  },
  explainer_studio: {
    id: 'explainer_studio',
    name: 'Explainer Studio',
    subtitle: 'Educational & business content',
    thumbnail: '/templates/explainer-studio.jpg',
    templatePrompt: TEMPLATE_PROMPTS.explainer_studio,
    storyboardDirective:
      'Presenter-centered 3D studio scenes. Same animated host in most segments — desk, laptop, warm lamp, window light. Include charts, UI mockups, and educational overlays where the script supports it.',
    characterRules:
      'Consistent 3D presenter/host. Same face, hair, glasses, and wardrobe. Modern studio desk environment with supporting graphics.',
  },
  documentary_cinematic: {
    id: 'documentary_cinematic',
    name: 'Documentary Cinematic',
    subtitle: 'Premium storytelling',
    thumbnail: '/templates/documentary-cinematic.jpg',
    templatePrompt: TEMPLATE_PROMPTS.documentary_cinematic,
    storyboardDirective:
      'B-roll centered scenes. No presenter required. Dynamic framing, dramatic lighting, headline moments, documentary pacing.',
    characterRules:
      'No presenter required. Cinematic b-roll, dynamic framing, dramatic lighting.',
  },
}

export const VISUAL_TEMPLATE_LIST: VisualTemplateConfig[] = [
  VISUAL_TEMPLATE_CONFIGS.creator_story,
  VISUAL_TEMPLATE_CONFIGS.explainer_studio,
  VISUAL_TEMPLATE_CONFIGS.documentary_cinematic,
]

const VALID_IDS = new Set<string>(Object.keys(VISUAL_TEMPLATE_CONFIGS))

export function isVisualTemplate(value: unknown): value is VisualTemplate {
  return typeof value === 'string' && VALID_IDS.has(value)
}

export function normalizeVisualTemplate(value: unknown): VisualTemplate {
  return isVisualTemplate(value) ? value : DEFAULT_VISUAL_TEMPLATE
}

export function getTemplateConfig(template: VisualTemplate): VisualTemplateConfig {
  return VISUAL_TEMPLATE_CONFIGS[template]
}

export function getTemplatePrompt(template: VisualTemplate): string {
  return TEMPLATE_PROMPTS[template]
}

export function extractVisualTemplateFromCaptions(
  captions: unknown
): VisualTemplate | undefined {
  if (!captions || typeof captions !== 'object' || Array.isArray(captions)) return undefined
  const raw = (captions as { visualTemplate?: unknown }).visualTemplate
  return isVisualTemplate(raw) ? raw : undefined
}
