/**
 * Human Creative Companion — centralized copy map.
 * Prefer these over generic "Generate" / "Success" language in high-traffic UI.
 */

export const COMPANION_COPY = {
  create: 'Create',
  generate: 'Create',
  generating: 'Building your story…',
  storyReady: 'Story ready',
  exportReady: 'Your reel is ready',
  success: 'Story ready',
  begin: 'Start creating',
  continue: 'Keep going',
  discoveryTitle: 'Before we roll camera',
  discoverySubtitle: 'Five quick questions — then Mugtee directs.',
  directorPanelTitle: 'Director notes',
  directorPanelEmpty: 'Mugtee will drop notes as your story takes shape.',
  emotionalCardTitle: 'Story feel',
  viewerJourneyTitle: 'Viewer journey',
  expansionTitle: 'Where this story could go next',
  celebrationDefault: 'That\'s a wrap. Your story is out in the world.',
  reflectionQuestion: 'Which part hit hardest for you?',
  reflectionThanks: 'Noted — Mugtee remembers what you love.',
  sessionCapReached: 'Three notes this session — Mugtee\'s holding the megaphone for now.',
} as const

export type CompanionCopyKey = keyof typeof COMPANION_COPY

export function companionCopy(key: CompanionCopyKey): string {
  return COMPANION_COPY[key]
}
