import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'
import { sidekickCommentaryTone } from '@/lib/multiverse/sidekick-evolution'

export type CommentaryStage =
  | QuickCutGenerationStep
  | 'contentDirectorBrief'
  | 'default'

const STAGE_MESSAGES: Record<string, string[]> = {
  default: [
    'Mugtee is directing your next viral story.',
    'Every great reel starts with a single bold idea.',
    'Your audience is waiting — let\'s make them stop scrolling.',
    'I\'m shaping this into something share-worthy.',
  ],
  analyzing: [
    'Reading your brief like a studio exec…',
    'Who is watching? What do they crave? I\'m mapping it.',
    'Analyzing audience intent — this is where virality begins.',
  ],
  title: [
    'Finding the angle that stops the scroll.',
    'Testing story angles against what your niche loves.',
    'The right title opens the door — I\'m picking the key.',
  ],
  hook: [
    'First three seconds decide everything. Crafting yours now.',
    'A hook should feel like a plot twist in sentence one.',
    'Making your opener impossible to skip.',
  ],
  script: [
    'Mugtee is directing your next viral story.',
    'Writing beats that build tension and payoff.',
    'Every line earns the next — scripting with retention in mind.',
  ],
  scenes: [
    'Breaking your story into cinematic beats.',
    'Scene pacing is emotion pacing — building the arc.',
    'Each scene is a chapter in a mini-movie.',
  ],
  images: [
    'Painting frames that look like film stills.',
    'Visuals should whisper mood before a word is spoken.',
    'Generating imagery your audience will screenshot.',
  ],
  motion: [
    'Adding cinematic motion — the difference between post and film.',
    'Movement guides the eye. I\'m choreographing yours.',
  ],
  voice: [
    'Voice is half the story. Finding the right tone.',
    'Synthesizing narration that feels human, not robotic.',
  ],
  render: [
    'Packaging your creator pack — almost showtime.',
    'Rendering your reel into something export-ready.',
    'Final polish before you share with the world.',
  ],
  complete: [
    'Cut! Your reel is ready for export.',
    'Director\'s cut complete — go make it viral.',
  ],
  contentDirectorBrief: [
    'Your content brief is the blueprint — I\'m reading every line.',
    'Aligning story direction with your creator goal.',
  ],
}

export function pickCommentaryMessage(
  stage: CommentaryStage,
  index: number,
  personalityPreset?: string
): string {
  const messages = messagesForStage(stage, personalityPreset)
  return messages[index % messages.length]!
}

const TONE_PREFIX: Record<string, string> = {
  direct: 'Focus. ',
  energetic: 'Let\'s go — ',
  calm: 'Steady progress: ',
  playful: 'Fun twist — ',
  warm: '',
}

export function messagesForStage(stage: CommentaryStage, personalityPreset?: string): string[] {
  const base = STAGE_MESSAGES[stage] ?? STAGE_MESSAGES.default!
  const tone = sidekickCommentaryTone(personalityPreset ?? 'wise_mentor')
  const prefix = TONE_PREFIX[tone] ?? ''
  if (!prefix) return base
  return base.map((m) => `${prefix}${m.charAt(0).toLowerCase()}${m.slice(1)}`)
}
