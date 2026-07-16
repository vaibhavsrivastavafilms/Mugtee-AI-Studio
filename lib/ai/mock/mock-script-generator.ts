import {
  buildMockCinematicOutput,
  ensureSceneImagePrompt,
  finalizeCinematicOutput,
  type CinematicGenerationOutput,
  type GeneratedScene,
} from '@/lib/cinematic/generation'
import { inferNicheFromBrief, type CinematicNiche } from '@/lib/cinematic/niches'
import type { ScriptArchetypeMeta } from '@/lib/cinematic/script-archetypes'
import {
  beatsToScriptSections,
  scriptTextFromBeats,
  type MugteeScriptBeat,
} from '@/lib/cinematic/script-sop'
import {
  analyzeViralStructure,
  CREATOR_RETENTION_SCENE_COUNT,
  type ViralStructureAnalysis,
} from '@/lib/cinematic/viral-structure'
import { clampSceneDurationsToTarget } from '@/lib/cinematic/scene-duration'
import { buildVirloContext, type VirloContext } from '@/lib/virlo-engine'
import { MAX_VIDEO_DURATION_SEC } from '@/lib/workspace/validation'

export type MockScriptScene = {
  scene: number
  narration: string
  visual: string
}

export type MockScriptInput = {
  topic: string
  tone?: string
  duration?: number
  niche?: CinematicNiche
  platform?: string
  sessionSeed?: string | number
  title?: string
  hook?: string
  virloContext?: VirloContext
  viralStructure?: ViralStructureAnalysis
  scriptArchetype?: ScriptArchetypeMeta
}

type TopicTemplate = {
  title: string
  hook: string
  payoff: string
  cta: string
  scenes: MockScriptScene[]
}

function hashTopic(topic: string): number {
  let h = 2166136261
  for (let i = 0; i < topic.length; i++) {
    h ^= topic.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function topicIncludes(topic: string, words: string[]): boolean {
  const lower = topic.toLowerCase()
  return words.some((w) => lower.includes(w))
}

function pickTopicTemplate(topic: string): TopicTemplate | null {
  if (
    topicIncludes(topic, [
      'discipline',
      'motivation',
      'self-belief',
      'self belief',
      'showing up',
      'show up',
      'consistency',
      'mindset',
    ])
  ) {
    return {
      title: 'Discipline Is Choosing Yourself',
      hook: 'People think discipline is about motivation. It isn\'t.',
      payoff: 'The version of you that wins is built one ordinary day at a time.',
      cta: 'Save this and show up again tomorrow.',
      scenes: [
        {
          scene: 1,
          narration: 'Most people wait to feel motivated before they begin.',
          visual: 'Person sitting alone before sunrise, quiet room, soft window light.',
        },
        {
          scene: 2,
          narration: 'The people who succeed simply show up anyway.',
          visual: 'Runner training in the rain, determined pace, urban backdrop.',
        },
        {
          scene: 3,
          narration: 'Confidence isn\'t built before action. It\'s built because of action.',
          visual: 'Montage of small daily wins — journal, gym, focused work.',
        },
        {
          scene: 4,
          narration: 'Discipline is choosing your future self every single day.',
          visual: 'Sunrise over a city skyline, golden light, forward motion.',
        },
      ],
    }
  }

  if (
    topicIncludes(topic, [
      'business',
      'startup',
      'entrepreneur',
      'money',
      'sales',
      'marketing',
      'growth',
    ])
  ) {
    return {
      title: 'The Lever Most Creators Ignore',
      hook: 'Growth isn\'t about doing more. It\'s about doing what compounds.',
      payoff: 'One clear offer, one audience, one repeatable system — that\'s the edge.',
      cta: 'Follow for more builder-focused breakdowns.',
      scenes: [
        {
          scene: 1,
          narration: 'Most creators spread thin across ten ideas and wonder why nothing moves.',
          visual: 'Overloaded desk with sticky notes, chaotic screens, tight framing.',
        },
        {
          scene: 2,
          narration: 'Winners pick one problem and solve it louder than everyone else.',
          visual: 'Founder presenting a single slide with one bold headline.',
        },
        {
          scene: 3,
          narration: 'Compounding comes from repetition, feedback, and ruthless focus.',
          visual: 'Analytics chart trending up, clean dashboard, confident operator.',
        },
        {
          scene: 4,
          narration: 'Build the system once. Then let consistency do the heavy lifting.',
          visual: 'Automated workflow diagram glowing on a laptop at night.',
        },
      ],
    }
  }

  if (topicIncludes(topic, ['health', 'fitness', 'workout', 'nutrition', 'wellness'])) {
    return {
      title: 'Small Habits, Big Shifts',
      hook: 'Your body doesn\'t need perfection. It needs proof you\'ll keep showing up.',
      payoff: 'Energy follows identity — act like the person you\'re becoming.',
      cta: 'Start with one habit today. Not ten.',
      scenes: [
        {
          scene: 1,
          narration: 'Crash diets fail because they ask for a new person overnight.',
          visual: 'Empty gym bag and abandoned meal prep containers.',
        },
        {
          scene: 2,
          narration: 'Lasting change starts embarrassingly small — a walk, water, sleep.',
          visual: 'Morning walk in neighborhood light, water bottle in hand.',
        },
        {
          scene: 3,
          narration: 'Each rep is a vote for the identity you want to own.',
          visual: 'Close-up of hands tying running shoes, deliberate and calm.',
        },
        {
          scene: 4,
          narration: 'Stack tiny wins until your routine feels non-negotiable.',
          visual: 'Healthy meal prep grid, post-workout glow, satisfied smile.',
        },
      ],
    }
  }

  return null
}

function genericTemplate(topic: string, seed: number): TopicTemplate {
  const snippets = topic
    .split(/[,.!?;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12)
  const focus = snippets[0]?.slice(0, 80) || topic.slice(0, 80) || 'your idea'
  const variants = [
    {
      title: `The Truth About ${focus.slice(0, 42)}`,
      hook: `Everyone talks about ${focus.toLowerCase().slice(0, 50)} — almost nobody explains what actually works.`,
    },
    {
      title: focus.slice(0, 56),
      hook: `If ${focus.toLowerCase().slice(0, 60)} matters to you, listen closely.`,
    },
    {
      title: 'What They Never Tell You',
      hook: `${focus} sounds simple until you try it for thirty days straight.`,
    },
  ]
  const pick = variants[seed % variants.length]
  return {
    title: pick.title,
    hook: pick.hook,
    payoff: `That's how you turn "${focus.slice(0, 40)}" into something people remember.`,
    cta: 'Save this and share it with someone who needs the reminder.',
    scenes: [
      {
        scene: 1,
        narration: `Most people underestimate what ${focus.toLowerCase().slice(0, 55)} really demands.`,
        visual: `Cinematic opener tied to: ${focus.slice(0, 70)}.`,
      },
      {
        scene: 2,
        narration: 'The gap isn\'t talent — it\'s the willingness to stay with the process.',
        visual: 'Focused creator working late, moody contrast, shallow depth of field.',
      },
      {
        scene: 3,
        narration: 'Small consistent actions beat occasional bursts of intensity.',
        visual: 'Calendar marks, progress notes, quiet momentum building.',
      },
      {
        scene: 4,
        narration: pick.hook,
        visual: `Closing hero frame inspired by: ${focus.slice(0, 70)}.`,
      },
    ],
  }
}

function scenesFromTemplate(
  template: TopicTemplate,
  niche: CinematicNiche,
  targetDuration: number
): GeneratedScene[] {
  const perScene = Math.min(8, Math.max(2, Math.round(targetDuration / template.scenes.length)))
  return template.scenes.map((def, i) => {
    const sceneIndex = i + 1
    return ensureSceneImagePrompt({
      id: `scene-${sceneIndex}`,
      title: `Scene ${sceneIndex}`,
      description: def.narration,
      duration: perScene,
      visualPrompt: def.visual,
      imagePrompt: def.visual,
      cameraAngle: sceneIndex === 1 ? 'medium close-up' : 'wide establishing',
      lightingMood: sceneIndex === template.scenes.length ? 'golden hour' : 'soft natural',
      environment: niche.replace(/-/g, ' '),
      colorPalette: 'cinematic warm neutrals',
      movementStyle: sceneIndex === 1 ? 'slow push-in' : 'handheld energy',
    })
  })
}

/** Deterministic cinematic script for development when AI providers are unavailable. */
export function generateMockScript(input: MockScriptInput): CinematicGenerationOutput {
  const topic = input.topic.trim() || 'Your cinematic story'
  const tone = input.tone?.trim() || 'cinematic'
  const duration = Math.min(input.duration ?? 60, MAX_VIDEO_DURATION_SEC)
  const niche =
    input.niche ?? inferNicheFromBrief({ topic, tone, style: tone })
  const seed = hashTopic(`${input.sessionSeed ?? topic}:${topic}`)

  const virloContext =
    input.virloContext ??
    buildVirloContext(topic, {
      tone,
      duration,
      niche,
      sessionSeed: input.sessionSeed ?? topic,
      platform: input.platform,
    })

  const viralStructure =
    input.viralStructure ??
    analyzeViralStructure({ text: topic, sessionSeed: virloContext.creativeSeed.seed })

  const template = pickTopicTemplate(topic) ?? genericTemplate(topic, seed)
  const title = input.title?.trim() || template.title
  const hook = input.hook?.trim() || template.hook
  const payoff = template.payoff
  const cta = template.cta

  const mockBeats: MugteeScriptBeat[] = template.scenes.map((def) => ({
    narration: def.narration,
    duration: '4s',
    emotion: 'engaged',
  }))

  const mockSections = beatsToScriptSections(mockBeats)
  const scenes = clampSceneDurationsToTarget(
    scenesFromTemplate(template, niche, duration),
    duration
  )

  const baseArchetype = buildMockCinematicOutput({
    topic,
    tone,
    duration,
    niche,
    virloContext,
    viralStructure,
    scriptArchetype: input.scriptArchetype,
  })

  return finalizeCinematicOutput(
    {
      ...baseArchetype,
      title,
      hook,
      summary: `Mock cinematic script: ${topic.slice(0, 80)} (${duration}s).`,
      script: scriptTextFromBeats(hook, mockBeats, payoff, cta),
      scriptBeats: mockBeats,
      scriptSections: mockSections,
      payoff,
      cta,
      scenes:
        scenes.length >= CREATOR_RETENTION_SCENE_COUNT ? scenes : baseArchetype.scenes,
    },
    niche
  )
}

/** LLM-shaped record for router / parse pipeline compatibility. */
export function mockScriptToParsedRecord(output: CinematicGenerationOutput): Record<string, unknown> {
  return {
    title: output.title,
    hook: output.hook,
    summary: output.summary,
    script: output.script,
    scriptBeats: output.scriptBeats,
    scriptSections: output.scriptSections,
    payoff: output.payoff,
    cta: output.cta,
    scenes: output.scenes,
    captions: output.captions,
    captionPack: output.captionPack,
    suggestedVoiceStyle: output.suggestedVoiceStyle,
    niche: output.niche,
    duration: output.scenes.reduce((sum, s) => sum + (s.duration ?? 0), 0),
  }
}

export function mockScriptScenesPreview(input: MockScriptInput): MockScriptScene[] {
  const topic = input.topic.trim() || 'Your cinematic story'
  const template = pickTopicTemplate(topic) ?? genericTemplate(topic, hashTopic(topic))
  return template.scenes
}
