export type GuidanceStep =
  | 'create'
  | 'preview'
  | 'director'
  | 'scenes'
  | 'voiceover'
  | 'compile'

export const CREATOR_GUIDANCE: Record<
  GuidanceStep,
  { title: string; tips: string[] }
> = {
  create: {
    title: 'Start with emotion',
    tips: [
      'Start with a strong emotional premise.',
      'Hooks with tension perform best.',
      'One clear idea beats a list of topics.',
    ],
  },
  preview: {
    title: 'Review your arc',
    tips: [
      'Read the hook aloud — does it pull you in?',
      'Scene beats should escalate, not repeat.',
      'Director Mode refines pacing without losing your story.',
    ],
  },
  director: {
    title: 'Direct the feel',
    tips: [
      'Lock camera and lighting mood per scene.',
      'Visual direction should match the emotional arc.',
      'Refine selectively — you do not need to reshape every beat.',
    ],
  },
  scenes: {
    title: 'Storyboard pacing',
    tips: [
      'Storyboard previews help structure pacing.',
      'Switch variants until the frame feels cinematic.',
      'Each scene should earn its place in the reel.',
    ],
  },
  voiceover: {
    title: 'Voice carries emotion',
    tips: [
      'Match voice style to the story niche.',
      'Documentary pace differs from motivational punch.',
      'Preview how captions read on a phone screen.',
    ],
  },
  compile: {
    title: 'Let the world become film',
    tips: [
      'Your film world bundles hook, captions, and frames in rhythm.',
      'Copy captions before sharing to Reels or Shorts.',
      'Every scene stays held in your cinematic workspace.',
    ],
  },
}
