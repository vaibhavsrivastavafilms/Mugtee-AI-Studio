import type { StoryBible } from '@/lib/cinematic/story-bible'
import type { RewriteContentType, RewriteVariant } from '@/lib/rewrite/rewrite-actions'

const VARIANT_DIRECTIVES: Record<RewriteVariant, string> = {
  more_viral:
    'Make this passage more viral — sharper hook energy, scroll-stopping curiosity, shareable tension. Keep the same meaning.',
  increase_curiosity:
    'Increase curiosity — open a loop the viewer must close. Tease without revealing the payoff.',
  increase_retention:
    'Increase retention — add micro-stakes, pattern interrupts, or forward momentum so viewers stay.',
  emotional:
    'Make this more emotional — vulnerable, felt, human. Add breath and specificity without melodrama.',
  stronger_opening:
    'Strengthen the opening — first-line punch, immediate tension or intrigue. No warm-up.',
  more_cinematic:
    'Make this more cinematic — visual language, filmic rhythm, show-don\'t-tell beats.',
  more_dramatic:
    'Increase dramatic weight — raise stakes, contrast, or conflict. Still believable.',
  shorter:
    'Shorten this — cut filler, tighten verbs, same meaning in fewer words.',
  longer:
    'Expand this — add cinematic detail, emotional nuance, or pacing breath. Do not pad.',
  documentary:
    'Rewrite in documentary voice — observational, intimate narrator, grounded and honest.',
  luxury_style:
    'Rewrite in luxury brand voice — refined, aspirational, slow confidence, premium diction.',
  storytelling_style:
    'Rewrite as storytelling — narrative arc, character moment, earned emotional turn.',
  increase_tension:
    'Increase tension in this scene beat — unresolved pressure, visual or emotional conflict.',
  improve_pacing:
    'Improve pacing — clearer beat timing, smoother escalation or release.',
  add_visual_detail:
    'Add visual detail — camera, light, texture, environment. Director-note density.',
  stronger_emotional_beat:
    'Land a stronger emotional beat — specificity, subtext, a felt turn.',
  cta:
    'Write a stronger CTA — earned, native, one clear action. Not salesy.',
  more_engagement:
    'Boost engagement — question, relatability, or comment-bait that feels authentic.',
  platform_native:
    'Make this platform-native — tone and rhythm that fits short-form social without cringe.',
  cleaner_copy:
    'Clean the copy — clearer, tighter, no fluff. Same intent.',
  more_filmic:
    'Make this more filmic — lens, grain, blocking, light quality. Production-ready direction.',
  better_camera_composition:
    'Improve camera, lighting, and composition notes — specific angles, mood, framing.',
}

const CONTENT_HINTS: Record<RewriteContentType, string> = {
  hook: 'This is a HOOK — optimize for the first 1–3 seconds of a short-form video.',
  script: 'This is SCRIPT narration — spoken aloud, cinematic pacing.',
  scene: 'This is a SCENE beat — storyboard / scene description.',
  caption: 'This is CAPTION copy — social post text.',
  cta: 'This is a CTA — call-to-action line. One clear action, native to short-form.',
  visual_direction: 'This is VISUAL DIRECTION — camera, lighting, composition notes.',
}

function formatStoryBibleHint(bible: StoryBible): string {
  const parts = [
    bible.visualStyle && `Visual style: ${bible.visualStyle}`,
    bible.colorPalette && `Palette: ${bible.colorPalette}`,
    bible.environment && `Environment: ${bible.environment}`,
    bible.cameraLanguage && `Camera: ${bible.cameraLanguage}`,
    bible.mood && `Mood: ${bible.mood}`,
  ].filter(Boolean)
  return parts.length ? `Story bible (preserve continuity):\n${parts.join('\n')}` : ''
}

export function buildRewriteSystemPrompt(input?: { language?: string; niche?: string }): string {
  const parts = [
    'You are Mugtee — a cinematic AI director and editor for creators.',
    'Rewrite ONLY the selected passage. Return plain replacement prose.',
    'No quotes, no markdown headers, no labels, no explanations.',
    'Preserve meaning, voice, niche, and story intent unless the directive requires a tonal shift.',
  ]
  if (input?.language) parts.push(`Write in ${input.language}.`)
  else parts.push('Match the language of the selection.')
  if (input?.niche) parts.push(`Creator niche: ${input.niche}.`)
  return parts.join(' ')
}

export function buildRewriteUserPrompt(input: {
  selection: string
  variant: RewriteVariant
  contentType?: RewriteContentType
  fullScript?: string
  title?: string
  platform?: string
  niche?: string
  tone?: string
  storyBible?: StoryBible | null
  language?: string
}): string {
  const directive = VARIANT_DIRECTIVES[input.variant] ?? VARIANT_DIRECTIVES.more_viral
  const parts: string[] = [directive]

  if (input.contentType) {
    parts.push(CONTENT_HINTS[input.contentType])
  }
  if (input.title) parts.push(`Project title: ${input.title}`)
  if (input.platform) parts.push(`Platform: ${input.platform}`)
  if (input.niche) parts.push(`Niche: ${input.niche}`)
  if (input.tone) parts.push(`Tone/style: ${input.tone}`)
  if (input.storyBible) {
    const hint = formatStoryBibleHint(input.storyBible)
    if (hint) parts.push(hint)
  }
  if (input.language) parts.push(`Language: ${input.language}`)
  if (input.fullScript && input.fullScript !== input.selection) {
    parts.push(`Full surrounding text (context only — do NOT rewrite all of this):\n${input.fullScript.slice(0, 2000)}`)
  }

  parts.push(`\nSELECTED PASSAGE TO REWRITE:\n${input.selection}`)
  parts.push('\nReturn ONLY the rewritten passage.')

  return parts.join('\n')
}
