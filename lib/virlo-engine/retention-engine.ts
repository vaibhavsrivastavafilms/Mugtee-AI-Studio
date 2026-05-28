import type {
  RetentionBeat,
  RetentionPlan,
  RetentionType,
  StoryStructureFormat,
} from '@/lib/virlo-engine/types'
import type { EmotionalGoal } from '@/lib/virlo-engine/types'

const RETENTION_TECHNIQUES: Record<
  RetentionType,
  { gaps: string[]; loops: string[]; escalation: string[] }
> = {
  'curiosity-gap': {
    gaps: [
      'Tease the mechanism before naming it.',
      'Hold the "why" until mid-script.',
      'Promise a reframe in the final beat.',
    ],
    loops: [
      'Open: "There is a reason this keeps happening."',
      'Mid: "And the reason is not what you think."',
    ],
    escalation: [
      'Surface behavior → hidden driver → emotional cost → reframe',
    ],
  },
  'open-loop': {
    gaps: [
      'State an observation without the conclusion.',
      'Introduce a witness detail that contradicts the obvious story.',
    ],
    loops: [
      'Open: unanswered image or quote.',
      'Mid: "But the record shows something else."',
      'Close loop in final 8 seconds.',
    ],
    escalation: [
      'Evidence stack → contradiction → thesis → stillness',
    ],
  },
  'escalation-ladder': {
    gaps: [
      'Each scene raises stakes by one notch.',
      'Never repeat the same emotional beat twice.',
    ],
    loops: [
      'Mid: "And it gets worse." or "That was only layer one."',
    ],
    escalation: [
      'Interrupt → reveal → consequence → identity challenge → snap payoff',
    ],
  },
  'pattern-interrupt': {
    gaps: [
      'Break expected visual or narrative rhythm at scene 2.',
      'Use sensory detail where viewer expects exposition.',
    ],
    loops: [
      'Open with image; delay the thesis.',
      'Return to opening image with new meaning at close.',
    ],
    escalation: [
      'Sensory open → metaphor build → peak image → lingering close',
    ],
  },
}

function buildBeats(
  duration: number,
  sceneTarget: number,
  retentionType: RetentionType,
  structure: StoryStructureFormat
): RetentionBeat[] {
  const hookEnd = Math.min(3, duration * 0.08)
  const buildEnd = duration * 0.45
  const peakAt = duration * 0.72
  const payoffAt = Math.max(duration - 6, duration * 0.88)

  return [
    {
      phase: 'hook',
      secondsFromStart: 0,
      technique: retentionType,
      instruction: structure.openingMove,
    },
    {
      phase: 'build',
      secondsFromStart: Math.round(hookEnd),
      technique: retentionType,
      instruction: `Scene 2–${Math.max(2, Math.floor(sceneTarget / 2))}: ${RETENTION_TECHNIQUES[retentionType].escalation[0]}`,
    },
    {
      phase: 'escalation',
      secondsFromStart: Math.round(buildEnd),
      technique: retentionType,
      instruction: structure.midpointTurn,
    },
    {
      phase: 'peak',
      secondsFromStart: Math.round(peakAt),
      technique: retentionType,
      instruction: 'Visual or verbal peak — one image carries the thesis.',
    },
    {
      phase: 'payoff',
      secondsFromStart: Math.round(payoffAt),
      technique: retentionType,
      instruction: structure.closingMove,
    },
  ]
}

export function inferRetentionType(
  emotion: EmotionalGoal,
  duration: number,
  seed: number
): RetentionType {
  if (duration <= 30) return 'escalation-ladder'
  if (emotion === 'curiosity') return 'curiosity-gap'
  if (emotion === 'tension') return seed % 2 === 0 ? 'open-loop' : 'escalation-ladder'
  if (emotion === 'intimacy' || emotion === 'awe') return 'pattern-interrupt'
  const types: RetentionType[] = [
    'curiosity-gap',
    'open-loop',
    'escalation-ladder',
    'pattern-interrupt',
  ]
  return types[seed % types.length]
}

export function buildRetentionPlan(
  duration: number,
  sceneTarget: number,
  retentionType: RetentionType,
  structure: StoryStructureFormat,
  seed: number
): RetentionPlan {
  const kit = RETENTION_TECHNIQUES[retentionType]
  const payoffTimingSec = Math.max(4, Math.round(duration * (0.82 + (seed % 5) * 0.02)))

  return {
    type: retentionType,
    curiosityGaps: kit.gaps,
    openLoops: kit.loops,
    escalationSteps: kit.escalation,
    payoffTimingSec,
    beats: buildBeats(duration, sceneTarget, retentionType, structure),
  }
}
