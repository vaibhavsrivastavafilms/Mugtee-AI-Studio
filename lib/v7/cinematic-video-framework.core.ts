/**
 * Universal cinematic video generation framework — canonical rules for V7 text entry.
 * Composed into buildV7FramedUserInput(); never duplicated inside individual agents.
 */

import {
  inferDurationSecFromPrompt,
} from '@/lib/v7/production-planning'

/** Master-framework default when the creator gives no duration hint. */
export const V7_CINEMATIC_DEFAULT_DURATION_SEC = 60

/** Canonical cinematic intelligence appended to every raw creator input. */
export const V7_CINEMATIC_VIDEO_FRAMEWORK = `UNIVERSAL CINEMATIC VIDEO GENERATION FRAMEWORK:
- The creator provides the IDEA. Mugtee provides the FILM.
- Preserve creator intent: subject, story, brand, person, location, event, product, cultural context, requested language, explicit duration, platform, aspect ratio, tone, and style must never be silently changed.
- Mugtee may intelligently infer missing cinematic details: visual treatment, scene structure, camera, lighting, pacing, sound, environment, and character details when not explicitly specified.

INPUT INTERPRETATION:
- Treat the creator input as authoritative for topic and intent.
- Resolve genre, audience, emotion, and format from context.
- Honor explicit constraints over framework defaults.

STORY STRUCTURE (adapt to genre — do not force one template):
- Build HOOK → SETUP → DEVELOPMENT → ESCALATION → PAYOFF → ENDING when appropriate.
- Comedy, documentary, advertisement, food, action, romance, emotional, and suspense genres each need structure suited to the genre.

RESEARCH (factual topics only):
- For factual, historical, cultural, documentary, or real-world topics: gather contextual research before creative generation.
- Prefer official/first-party, government/institutional, museum/university/academic, professional, reputable journalism, and Wikipedia for broad context.
- Verify important facts where appropriate.
- For clearly fictional or imaginative ideas: do NOT perform unnecessary web research.
- Research improves world, architecture, clothing, objects, geography, culture, terminology, environment, professional behaviour, and historical accuracy — but remains subordinate to creator intent.

VISUAL BIBLE (when recurring entities exist):
- Establish CHARACTER BIBLE, ENVIRONMENT BIBLE, and PROP BIBLE before scene-level generation.
- Map into existing Mugtee production schema — do not invent a competing screenplay format.

SCENE GENERATION (10-block scene structure — map to existing screenplay/storyboard fields):
1. Scene Type
2. Subject
3. Appearance
4. Setting and Lighting
5. Action Sequence
6. Timing Split
7. Dialogue
8. Shot Type and Camera
9. Audio
10. Negatives and Continuity

CONTINUITY:
- Preserve continuity across character, environment, lighting, props, camera, animation, audio, and story.
- Use existing Mugtee character/environment consistency systems.

CAMERA AND LIGHTING:
- Every shot needs purposeful camera language and lighting that serves emotion and story.

AUDIO DIRECTION (inform voice, music, SFX, timeline — do not create a new audio pipeline):
- Specify music mood, genre, instruments, tempo, intensity, progression, and scene-relevant SFX.

NEGATIVE GENERATION (adapt per scene — do not blindly add irrelevant negatives):
- Prevent character drift, face changes, clothing changes, anatomy errors, duplicate characters, broken objects, impossible physics, flicker, temporal glitches, bad lip sync, random backgrounds, prop inconsistency, lighting drift, unwanted text, logos, and watermarks.

CREATIVE QUALITY CONTROL (generation-time — not a replacement for media QA):
- STORY: coherent, strong hook, every scene contributes, clear progression, satisfying ending.
- TIMING: total duration correct, actions fit scene duration, dialogue fits timing.
- CHARACTERS / ENVIRONMENT: consistent.
- CAMERA: purposeful.
- AUDIO: intelligible, synchronized.
- AI FAILURE PREVENTION: no unwanted characters, anatomy errors, visual drift, hallucinated text, or unwanted logos/watermarks.

SOCIAL VIDEO OPTIMISATION:
- Optimise pacing and hook for short-form when platform implies it — without overriding explicit creator requirements.`

const FICTIONAL_PROMPT_PATTERN =
  /\b(funny|fictional|fantasy|fairy\s*tale|mysterious\s*box|imagin(?:e|inary)|once\s+upon|dragon|wizard|magic|sci[\s-]?fi|superhero|made[\s-]?up|pretend)\b/i

const FACTUAL_PROMPT_PATTERN =
  /\b(documentary|history|historical|ancient|civilization|civilisation|festival|janmashtami|diwali|holocaust|biography|real[\s-]?world|news|facts?|research|culture|tradition|architecture|museum|government|scientific|education|tutorial|how[\s-]?to|brand|restaurant|food|monsoon|product|advertisement|ad\b|commercial|table\s+tales)\b/i

const ASPECT_RATIO_PATTERN = /\b(\d+)\s*:\s*(\d+)\b/

export function resolveV7FrameworkDurationSec(prompt: string): number {
  return inferDurationSecFromPrompt(prompt) ?? V7_CINEMATIC_DEFAULT_DURATION_SEC
}

export function inferAspectRatioFromPrompt(prompt: string): string | null {
  const text = prompt.trim().toLowerCase()
  if (!text) return null

  const explicit = text.match(ASPECT_RATIO_PATTERN)
  if (explicit) return `${explicit[1]}:${explicit[2]}`

  if (/\b(9\s*:\s*16|vertical|portrait|reel|shorts|tiktok|instagram\s*reel)\b/.test(text)) {
    return '9:16'
  }
  if (/\b(16\s*:\s*9|landscape|widescreen|youtube(?! shorts))\b/.test(text)) {
    return '16:9'
  }
  if (/\b(1\s*:\s*1|square)\b/.test(text)) return '1:1'
  if (/\b4\s*:\s*5\b/.test(text)) return '4:5'

  return null
}

export function inferPlatformFromPrompt(prompt: string): string | null {
  const text = prompt.trim().toLowerCase()
  if (!text) return null

  if (/\b(instagram\s*reel|instagram|reel)\b/.test(text)) return 'Instagram'
  if (/\btiktok\b/.test(text)) return 'TikTok'
  if (/\byoutube\s*shorts?\b/.test(text)) return 'YouTube Shorts'
  if (/\byoutube\b/.test(text)) return 'YouTube'
  if (/\blinkedin\b/.test(text)) return 'LinkedIn'
  if (/\bfacebook\b/.test(text)) return 'Facebook'

  return null
}

export function isV7FictionalCreativePrompt(prompt: string): boolean {
  const text = prompt.trim()
  if (!text) return false
  if (FICTIONAL_PROMPT_PATTERN.test(text)) return true
  if (FACTUAL_PROMPT_PATTERN.test(text)) return false
  return false
}

export function shouldRequestV7ContextualResearch(prompt: string): boolean {
  const text = prompt.trim()
  if (!text) return false
  if (isV7FictionalCreativePrompt(text)) return false
  return FACTUAL_PROMPT_PATTERN.test(text)
}

/** Resolved constraints block for framed creator input. */
export function buildV7ProductionConstraintsBlock(prompt: string): string {
  const text = prompt.trim()
  const inferredDuration = inferDurationSecFromPrompt(text)
  const durationSec = inferredDuration ?? V7_CINEMATIC_DEFAULT_DURATION_SEC
  const durationSource = inferredDuration != null ? 'creator-specified' : 'framework default'

  const aspectRatio = inferAspectRatioFromPrompt(text)
  const platform = inferPlatformFromPrompt(text)
  const research = shouldRequestV7ContextualResearch(text) ? 'required (factual topic)' : 'skip (fictional or non-factual)'

  const lines = [
    'PRODUCTION CONSTRAINTS:',
    `- Target duration: ${durationSec} seconds (${durationSource})`,
  ]

  if (aspectRatio) lines.push(`- Aspect ratio: ${aspectRatio} (creator-specified or inferred)`)
  else lines.push('- Aspect ratio: infer from platform/genre when not specified')

  if (platform) lines.push(`- Platform: ${platform} (creator-specified or inferred)`)
  else lines.push('- Platform: infer from context when not specified')

  lines.push(`- Contextual research: ${research}`)
  lines.push('- Explicit creator constraints override all framework defaults.')

  return lines.join('\n')
}
