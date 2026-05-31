export type ProactiveSuggestion = {
  id: string
  title: string
  body: string
  actionLabel?: string
}

type SuggestionInput = {
  hook?: string | null
  script?: string | null
  title?: string | null
  hasScenes?: boolean
  hasVoice?: boolean
}

const STRONGER_HOOKS = [
  'Try opening with a question your viewer already asked themselves.',
  'Lead with contrast — before vs. after, myth vs. truth.',
  'Drop the context. Start mid-tension.',
]

export function resolveProactiveSuggestions(input: SuggestionInput): ProactiveSuggestion[] {
  const out: ProactiveSuggestion[] = []
  const hookLen = input.hook?.trim().length ?? 0
  const scriptLen = input.script?.trim().length ?? 0

  if (hookLen > 0 && hookLen < 40) {
    out.push({
      id: 'stronger-hook',
      title: 'I found a stronger hook angle',
      body: STRONGER_HOOKS[hookLen % STRONGER_HOOKS.length],
      actionLabel: 'Regenerate hook',
    })
  }

  if (scriptLen > 120 && !input.hasScenes) {
    out.push({
      id: 'storyboard-next',
      title: 'Your script is ready for visuals',
      body: 'I can break this into storyboard beats — each scene timed for retention.',
      actionLabel: 'View scenes',
    })
  }

  if (input.hasScenes && !input.hasVoice) {
    out.push({
      id: 'voice-next',
      title: 'Add voice to lock the pacing',
      body: 'Narration reveals whether your cuts breathe — generate voice when you\'re happy with frames.',
      actionLabel: 'Open voice',
    })
  }

  if (input.title && hookLen > 0 && scriptLen > 0) {
    out.push({
      id: 'repurpose',
      title: 'Stretch this into more formats',
      body: 'Same core idea → carousel captions, thread, or newsletter draft.',
      actionLabel: 'Repurpose',
    })
  }

  return out.slice(0, 3)
}

const DASHBOARD_NUDGES: ProactiveSuggestion[] = [
  {
    id: 'hook-focus',
    title: 'Start with a tension-first hook',
    body: 'Pick one topic from Today\'s Brief — I\'ll shape hook, script, and storyboard from there.',
    actionLabel: 'Ask Mugtee',
  },
  {
    id: 'consistency',
    title: 'Keep the rhythm alive',
    body: 'One finished reel this week beats three drafts sitting in projects.',
    actionLabel: 'Open projects',
  },
]

export function resolveDashboardProactiveSuggestions(): ProactiveSuggestion[] {
  return DASHBOARD_NUDGES
}
