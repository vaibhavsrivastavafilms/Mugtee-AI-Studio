import { formatFrameworkForPrompt, type StoryFrameworkId } from '@/lib/ai/prompts/director/story-frameworks'

export type CreatorDnaPlaceholders = {
  NICHE: string
  STYLE: string
  TONE: string
  HOOK_STYLE: string
  PACING: string
  AUDIENCE_EMOTION: string
  VISUAL_STYLE: string
  CAMERA_STYLE: string
  LIGHTING_STYLE: string
  VOICE_STYLE: string
}

export const CREATOR_DNA_PLACEHOLDER_KEYS = [
  'NICHE',
  'STYLE',
  'TONE',
  'HOOK_STYLE',
  'PACING',
  'AUDIENCE_EMOTION',
  'VISUAL_STYLE',
  'CAMERA_STYLE',
  'LIGHTING_STYLE',
  'VOICE_STYLE',
] as const satisfies readonly (keyof CreatorDnaPlaceholders)[]

export function fillCreatorDnaTemplate(
  template: string,
  dna: CreatorDnaPlaceholders
): string {
  let out = template
  for (const key of CREATOR_DNA_PLACEHOLDER_KEYS) {
    out = out.replaceAll(`{{${key}}}`, dna[key] || 'unspecified')
  }
  return out
}

const STORY_DIRECTOR_ROLE = `
You are the AI Story Director for Mugtee Hollywood AI Studio — NOT a generic content writer.

Your mandate:
- Story > Content — every beat serves narrative tension, never listicle filler
- Emotion > Information — feelings land before facts
- Cinematic specificity — shots, light, and voice are directed, not described vaguely
- Creator DNA fidelity — honor {{NICHE}}, {{STYLE}}, {{TONE}}, {{HOOK_STYLE}}, {{PACING}}
- Audience psychology — engineer {{AUDIENCE_EMOTION}} with retention-aware pacing
- Visual world — {{VISUAL_STYLE}}, {{CAMERA_STYLE}}, {{LIGHTING_STYLE}}, {{VOICE_STYLE}}

Never output generic AI slop, template hooks, or lecture-mode scripts.
`.trim()

const OUTPUT_JSON_SCHEMA = `
Return ONE JSON object (no markdown fences) with exactly these keys:

{
  "storyAnalysis": "string — 2-4 paragraphs: core conflict, audience empathy map, emotional thesis",
  "cinematicHookOptions": [
    { "rank": 1, "hook": "string", "rationale": "string" }
  ],
  "storyStructure": {
    "act1": "string — Act 1 beats in prose",
    "act2": "string — Act 2 beats in prose",
    "act3": "string — Act 3 beats in prose"
  },
  "fullCinematicScript": "string — complete VO-ready script with scene breaks marked [SCENE n]",
  "scenes": [
    {
      "index": 1,
      "title": "string",
      "beat": "string",
      "durationSec": 4,
      "narration": "string"
    }
  ],
  "visualDirection": [
    {
      "sceneIndex": 1,
      "shotType": "string",
      "camera": "string",
      "lighting": "string",
      "composition": "string",
      "colorGrade": "string",
      "movement": "string",
      "mood": "string"
    }
  ],
  "storyboardFrames": [
    {
      "sceneIndex": 1,
      "frameDescription": "string",
      "focalPoint": "string",
      "transition": "string"
    }
  ],
  "voiceoverDirection": {
    "tone": "string",
    "pacing": "string",
    "emphasis": ["string"],
    "sceneNotes": [{ "sceneIndex": 1, "direction": "string" }]
  },
  "captionSystem": {
    "style": "string",
    "onScreenText": [{ "sceneIndex": 1, "text": "string", "timing": "string" }],
    "captionRhythm": "string",
    "hashtags": ["string"]
  },
  "viralityAnalysis": {
    "emotionalTriggers": ["string"],
    "retentionBeats": ["string"],
    "shareabilityScore": 7,
    "risks": ["string"],
    "recommendations": ["string"]
  }
}

Rules:
- cinematicHookOptions: exactly 10 entries, rank 1 (strongest) through 10
- scenes: 8–15 entries, durationSec integers summing to a coherent short-form length
- visualDirection, storyboardFrames: one entry per scene (matching sceneIndex)
- shareabilityScore: integer 1–10
`.trim()

export function buildStoryDirectorSystemPrompt(
  dna: CreatorDnaPlaceholders,
  frameworkId: StoryFrameworkId
): string {
  const role = fillCreatorDnaTemplate(STORY_DIRECTOR_ROLE, dna)
  const framework = formatFrameworkForPrompt(frameworkId)
  return [
    role,
    '',
    'ACTIVE STORY FRAMEWORK (structure is mandatory):',
    framework,
    '',
    'OUTPUT FORMAT:',
    OUTPUT_JSON_SCHEMA,
  ].join('\n')
}

export function buildStoryDirectorUserPrompt(input: {
  userIdea: string
  topic?: string
  durationSec?: number
  platform?: string
  storyDirectionSummary?: string
  treatmentSummary?: string
}): string {
  const lines = [
    `CREATOR IDEA / TOPIC:\n${input.userIdea.trim()}`,
    input.topic && input.topic !== input.userIdea ? `PROJECT TOPIC: ${input.topic.trim()}` : '',
    input.durationSec ? `TARGET DURATION: ~${input.durationSec}s total` : '',
    input.platform ? `PLATFORM: ${input.platform}` : '',
    input.storyDirectionSummary
      ? `LOCKED STORY DIRECTION:\n${input.storyDirectionSummary}`
      : '',
    input.treatmentSummary ? `DIRECTOR TREATMENT:\n${input.treatmentSummary}` : '',
    '',
    'Generate the full Story Director package. Honor Creator DNA and the active framework.',
  ]
  return lines.filter(Boolean).join('\n\n')
}
