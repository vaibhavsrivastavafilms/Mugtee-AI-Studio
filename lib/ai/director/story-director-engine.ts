import {
  buildStoryDirectorSystemPrompt,
  buildStoryDirectorUserPrompt,
  type CreatorDnaPlaceholders,
} from '@/lib/ai/prompts/director/story-director-system'
import {
  selectStoryFramework,
  storyFrameworkLabel,
  type StoryFrameworkId,
} from '@/lib/ai/prompts/director/story-frameworks'
import { buildStyleFingerprint } from '@/lib/ai/style-fingerprint'
import type { CreatorStyleFingerprint } from '@/lib/ai/style-fingerprint'
import type {
  CharacterBible,
  DirectorStudioContext,
  DirectorTreatment,
  StoryDirectionOption,
} from '@/lib/director/types'
import type { MemoryProfile } from '@/lib/memory/types'
import { parseLlmJsonText } from '@/lib/ai/providers/shared'

export type StoryDirectorHookOption = {
  rank: number
  hook: string
  rationale: string
}

export type StoryDirectorStructure = {
  act1: string
  act2: string
  act3: string
}

export type StoryDirectorScene = {
  index: number
  title: string
  beat: string
  durationSec: number
  narration: string
}

export type StoryDirectorVisualDirection = {
  sceneIndex: number
  shotType: string
  camera: string
  lighting: string
  composition: string
  colorGrade: string
  movement: string
  mood: string
}

export type StoryDirectorStoryboardFrame = {
  sceneIndex: number
  frameDescription: string
  focalPoint: string
  transition: string
}

export type StoryDirectorVoiceoverDirection = {
  tone: string
  pacing: string
  emphasis: string[]
  sceneNotes: Array<{ sceneIndex: number; direction: string }>
}

export type StoryDirectorCaptionSystem = {
  style: string
  onScreenText: Array<{ sceneIndex: number; text: string; timing: string }>
  captionRhythm: string
  hashtags: string[]
}

export type StoryDirectorViralityAnalysis = {
  emotionalTriggers: string[]
  retentionBeats: string[]
  shareabilityScore: number
  risks: string[]
  recommendations: string[]
}

export type StoryDirectorPackage = {
  frameworkId: StoryFrameworkId
  frameworkLabel: string
  generatedAt: string
  creatorDna: CreatorDnaPlaceholders
  storyAnalysis: string
  cinematicHookOptions: StoryDirectorHookOption[]
  storyStructure: StoryDirectorStructure
  fullCinematicScript: string
  scenes: StoryDirectorScene[]
  visualDirection: StoryDirectorVisualDirection[]
  storyboardFrames: StoryDirectorStoryboardFrame[]
  voiceoverDirection: StoryDirectorVoiceoverDirection
  captionSystem: StoryDirectorCaptionSystem
  viralityAnalysis: StoryDirectorViralityAnalysis
}

export type StoryDirectorInput = {
  userIdea: string
  topic?: string
  frameworkId?: StoryFrameworkId | null
  durationSec?: number
  platform?: string
  niche?: string
  tone?: string
  memoryProfile?: MemoryProfile | null
  directorContext?: DirectorStudioContext | null
  styleFingerprint?: CreatorStyleFingerprint | null
}

export type StoryDirectorPromptBundle = {
  systemPrompt: string
  userPrompt: string
  frameworkId: StoryFrameworkId
  creatorDna: CreatorDnaPlaceholders
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v.trim() : fallback
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

/** Map style fingerprint + director studio state → Creator DNA placeholders. */
export function buildCreatorDnaPlaceholders(input: {
  fingerprint?: CreatorStyleFingerprint | null
  niche?: string
  tone?: string
  memoryProfile?: MemoryProfile | null
  activeStoryDirection?: StoryDirectionOption | null
  directorTreatment?: DirectorTreatment | null
  characterBible?: CharacterBible | null
}): CreatorDnaPlaceholders {
  const fp = input.fingerprint
  const dna = input.memoryProfile?.creatorDna
  const prefs = input.memoryProfile?.preferences
  const treatment = input.directorTreatment
  const direction = input.activeStoryDirection

  const niche =
    input.niche?.trim() ||
    fp?.niche ||
    prefs?.niche ||
    'storytelling'

  const tone =
    input.tone?.trim() ||
    prefs?.tone ||
    dna?.voice ||
    treatment?.mood ||
    'cinematic, emotionally precise'

  const hookStyle =
    fp?.hookStyle ||
    direction?.hook?.slice(0, 80) ||
    'curiosity-gap with cinematic specificity'

  const pacing = fp?.pacing || 'measured short-form beats'

  const audienceEmotion =
    direction?.emotionalPromise ||
    dna?.emotionalTrigger ||
    'recognition → tension → release'

  const visualStyle =
    treatment?.visualStyle ||
    fp?.visualTone ||
    dna?.visualStyle ||
    'motivated light, human scale, vertical cinematic'

  const cameraStyle =
    treatment?.cameraLanguage ||
    'intentional lens choice — close for intimacy, wide for context'

  const lightingStyle =
    treatment?.lightingStyle ||
    'naturalistic with one motivated accent'

  const voiceStyle =
    dna?.voice ||
    `${tone} — ${fp?.sentenceRhythm ?? 'punchy'} rhythm, ${fp?.emotionalIntensity ?? 'building'} intensity`

  const protagonist = input.characterBible?.protagonist
  const style =
    [dna?.format, dna?.creatorType, protagonist?.name ? `POV: ${protagonist.name}` : '']
      .filter(Boolean)
      .join(' · ') || fp?.visualTone || 'director-led cinematic short'

  return {
    NICHE: niche,
    STYLE: style,
    TONE: tone,
    HOOK_STYLE: hookStyle,
    PACING: pacing,
    AUDIENCE_EMOTION: audienceEmotion,
    VISUAL_STYLE: visualStyle,
    CAMERA_STYLE: cameraStyle,
    LIGHTING_STYLE: lightingStyle,
    VOICE_STYLE: voiceStyle,
  }
}

function summarizeStoryDirection(d?: StoryDirectionOption | null): string | undefined {
  if (!d) return undefined
  return [
    `Title: ${d.title}`,
    `Logline: ${d.logline}`,
    `Hook: ${d.hook}`,
    `Emotional promise: ${d.emotionalPromise}`,
    `Audience: ${d.audience}`,
  ].join('\n')
}

function summarizeTreatment(t?: DirectorTreatment | null): string | undefined {
  if (!t) return undefined
  return [
    `Genre: ${t.genre}`,
    `Mood: ${t.mood}`,
    `Arc: ${t.emotionalArc}`,
    `Visual: ${t.visualStyle}`,
    `Camera: ${t.cameraLanguage}`,
    `Lighting: ${t.lightingStyle}`,
    `Palette: ${t.colorPalette}`,
  ]
    .filter((line) => !line.endsWith(': '))
    .join('\n')
}

export function buildStoryDirectorPrompt(input: StoryDirectorInput): StoryDirectorPromptBundle {
  const ctx = input.directorContext
  const fingerprint =
    input.styleFingerprint ??
    buildStyleFingerprint(
      {
        topic: input.topic ?? input.userIdea,
        niche: input.niche,
        tone: input.tone,
        platform: input.platform,
        duration: input.durationSec,
      },
      { profile: input.memoryProfile ?? null },
      undefined
    )

  const creatorDna = buildCreatorDnaPlaceholders({
    fingerprint,
    niche: input.niche,
    tone: input.tone,
    memoryProfile: input.memoryProfile,
    activeStoryDirection: ctx?.activeStoryDirection,
    directorTreatment: ctx?.directorTreatment,
    characterBible: ctx?.characterBible,
  })

  const frameworkId = selectStoryFramework({
    userIdea: input.userIdea,
    niche: creatorDna.NICHE,
    hookStyle: creatorDna.HOOK_STYLE,
    emotionalGoal: creatorDna.AUDIENCE_EMOTION,
    frameworkId: input.frameworkId,
  })

  const systemPrompt = buildStoryDirectorSystemPrompt(creatorDna, frameworkId)
  const userPrompt = buildStoryDirectorUserPrompt({
    userIdea: input.userIdea,
    topic: input.topic,
    durationSec: input.durationSec,
    platform: input.platform,
    storyDirectionSummary: summarizeStoryDirection(ctx?.activeStoryDirection),
    treatmentSummary: summarizeTreatment(ctx?.directorTreatment),
  })

  return { systemPrompt, userPrompt, frameworkId, creatorDna }
}

const MARKDOWN_SECTION_MAP: Array<{ key: keyof Omit<StoryDirectorPackage, 'frameworkId' | 'frameworkLabel' | 'generatedAt' | 'creatorDna'>; patterns: RegExp[] }> = [
  { key: 'storyAnalysis', patterns: [/^#+\s*1\.?\s*Story Analysis/im, /^Story Analysis/im] },
  { key: 'cinematicHookOptions', patterns: [/^#+\s*2\.?\s*Cinematic Hook/im] },
  { key: 'storyStructure', patterns: [/^#+\s*3\.?\s*Story Structure/im] },
  { key: 'fullCinematicScript', patterns: [/^#+\s*4\.?\s*Full Cinematic Script/im] },
  { key: 'scenes', patterns: [/^#+\s*5\.?\s*Scene Generation/im] },
  { key: 'visualDirection', patterns: [/^#+\s*6\.?\s*Cinematic Visual/im] },
  { key: 'storyboardFrames', patterns: [/^#+\s*7\.?\s*Storyboard/im] },
  { key: 'voiceoverDirection', patterns: [/^#+\s*8\.?\s*Voiceover/im] },
  { key: 'captionSystem', patterns: [/^#+\s*9\.?\s*Caption/im] },
  { key: 'viralityAnalysis', patterns: [/^#+\s*10\.?\s*Virality/im] },
]

function parseHookOptions(raw: unknown): StoryDirectorHookOption[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, i) => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      return {
        rank: num(o.rank, i + 1),
        hook: str(o.hook),
        rationale: str(o.rationale),
      }
    })
    .filter((h): h is StoryDirectorHookOption => Boolean(h?.hook))
    .sort((a, b) => a.rank - b.rank)
}

function parseScenes(raw: unknown): StoryDirectorScene[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, i) => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      return {
        index: num(o.index, i + 1),
        title: str(o.title, `Scene ${i + 1}`),
        beat: str(o.beat),
        durationSec: num(o.durationSec, 4),
        narration: str(o.narration),
      }
    })
    .filter((s): s is StoryDirectorScene => Boolean(s))
}

function parseVisualDirection(raw: unknown): StoryDirectorVisualDirection[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, i) => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      return {
        sceneIndex: num(o.sceneIndex, i + 1),
        shotType: str(o.shotType),
        camera: str(o.camera),
        lighting: str(o.lighting),
        composition: str(o.composition),
        colorGrade: str(o.colorGrade),
        movement: str(o.movement),
        mood: str(o.mood),
      }
    })
    .filter((v): v is StoryDirectorVisualDirection => Boolean(v))
}

function parseStoryboardFrames(raw: unknown): StoryDirectorStoryboardFrame[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, i) => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      return {
        sceneIndex: num(o.sceneIndex, i + 1),
        frameDescription: str(o.frameDescription),
        focalPoint: str(o.focalPoint),
        transition: str(o.transition),
      }
    })
    .filter((f): f is StoryDirectorStoryboardFrame => Boolean(f))
}

function parseVoiceover(raw: unknown): StoryDirectorVoiceoverDirection {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const notes = Array.isArray(o.sceneNotes)
    ? o.sceneNotes
        .map((n) => {
          if (!n || typeof n !== 'object') return null
          const note = n as Record<string, unknown>
          return {
            sceneIndex: num(note.sceneIndex, 0),
            direction: str(note.direction),
          }
        })
        .filter((n): n is { sceneIndex: number; direction: string } => Boolean(n?.direction))
    : []
  return {
    tone: str(o.tone),
    pacing: str(o.pacing),
    emphasis: strArray(o.emphasis),
    sceneNotes: notes,
  }
}

function parseCaptions(raw: unknown): StoryDirectorCaptionSystem {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const onScreen = Array.isArray(o.onScreenText)
    ? o.onScreenText
        .map((n) => {
          if (!n || typeof n !== 'object') return null
          const row = n as Record<string, unknown>
          return {
            sceneIndex: num(row.sceneIndex, 0),
            text: str(row.text),
            timing: str(row.timing),
          }
        })
        .filter((n): n is { sceneIndex: number; text: string; timing: string } => Boolean(n?.text))
    : []
  return {
    style: str(o.style),
    onScreenText: onScreen,
    captionRhythm: str(o.captionRhythm),
    hashtags: strArray(o.hashtags),
  }
}

function parseVirality(raw: unknown): StoryDirectorViralityAnalysis {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  return {
    emotionalTriggers: strArray(o.emotionalTriggers),
    retentionBeats: strArray(o.retentionBeats),
    shareabilityScore: Math.min(10, Math.max(1, num(o.shareabilityScore, 7))),
    risks: strArray(o.risks),
    recommendations: strArray(o.recommendations),
  }
}

function parseStructure(raw: unknown): StoryDirectorStructure {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  return {
    act1: str(o.act1),
    act2: str(o.act2),
    act3: str(o.act3),
  }
}

function extractMarkdownSections(raw: string): Partial<Record<string, string>> {
  const sections: Partial<Record<string, string>> = {}
  const headerRegex = /^#+\s*\d+\.?\s*.+$/gm
  const matches = [...raw.matchAll(headerRegex)]
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]!
    const start = match.index! + match[0].length
    const end = matches[i + 1]?.index ?? raw.length
    const body = raw.slice(start, end).trim()
    for (const entry of MARKDOWN_SECTION_MAP) {
      if (entry.patterns.some((p) => p.test(match[0]))) {
        sections[entry.key] = body
      }
    }
  }
  return sections
}

function hooksFromMarkdown(text: string): StoryDirectorHookOption[] {
  const lines = text.split('\n').filter((l) => l.trim())
  const hooks: StoryDirectorHookOption[] = []
  let rank = 1
  for (const line of lines) {
    const m = line.match(/^(?:\d+[\).\]]\s*|[-*]\s*)(.+)/)
    if (m && rank <= 10) {
      hooks.push({ rank, hook: m[1]!.trim(), rationale: '' })
      rank++
    }
  }
  return hooks
}

export function parseStoryDirectorOutput(
  raw: string,
  meta: {
    frameworkId: StoryFrameworkId
    creatorDna: CreatorDnaPlaceholders
  }
): StoryDirectorPackage {
  const parsed = parseLlmJsonText(raw)
  const hasJson =
    typeof parsed.storyAnalysis === 'string' ||
    Array.isArray(parsed.scenes) ||
    typeof parsed.fullCinematicScript === 'string'

  if (hasJson && Object.keys(parsed).length > 0) {
    return {
      frameworkId: meta.frameworkId,
      frameworkLabel: storyFrameworkLabel(meta.frameworkId),
      generatedAt: new Date().toISOString(),
      creatorDna: meta.creatorDna,
      storyAnalysis: str(parsed.storyAnalysis),
      cinematicHookOptions: parseHookOptions(parsed.cinematicHookOptions),
      storyStructure: parseStructure(parsed.storyStructure),
      fullCinematicScript: str(parsed.fullCinematicScript),
      scenes: parseScenes(parsed.scenes),
      visualDirection: parseVisualDirection(parsed.visualDirection),
      storyboardFrames: parseStoryboardFrames(parsed.storyboardFrames),
      voiceoverDirection: parseVoiceover(parsed.voiceoverDirection),
      captionSystem: parseCaptions(parsed.captionSystem),
      viralityAnalysis: parseVirality(parsed.viralityAnalysis),
    }
  }

  const md = extractMarkdownSections(raw)
  const hookText = md.cinematicHookOptions ?? ''
  return {
    frameworkId: meta.frameworkId,
    frameworkLabel: storyFrameworkLabel(meta.frameworkId),
    generatedAt: new Date().toISOString(),
    creatorDna: meta.creatorDna,
    storyAnalysis: md.storyAnalysis ?? raw.slice(0, 2000),
    cinematicHookOptions: hooksFromMarkdown(hookText),
    storyStructure: {
      act1: md.storyStructure ?? '',
      act2: '',
      act3: '',
    },
    fullCinematicScript: md.fullCinematicScript ?? '',
    scenes: [],
    visualDirection: [],
    storyboardFrames: [],
    voiceoverDirection: parseVoiceover(undefined),
    captionSystem: parseCaptions(undefined),
    viralityAnalysis: parseVirality(undefined),
  }
}

export function topHookFromPackage(pkg: StoryDirectorPackage): string {
  const sorted = [...pkg.cinematicHookOptions].sort((a, b) => a.rank - b.rank)
  return sorted[0]?.hook ?? ''
}

export function summaryFromPackage(pkg: StoryDirectorPackage): string {
  const firstPara = pkg.storyAnalysis.split('\n\n')[0]?.trim() ?? ''
  return firstPara.slice(0, 280)
}
