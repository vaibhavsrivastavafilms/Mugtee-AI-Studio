export type ExampleChannel = {
  id: string
  niche: string
  emoji: string
  topic: string
  hook: string
  scriptSnippet: string
}

export const EXAMPLE_CREATOR_CHANNELS: ExampleChannel[] = [
  {
    id: 'psychology',
    niche: 'Psychology',
    emoji: '🧠',
    topic: 'Why your brain craves closure',
    hook: 'Unfinished stories keep you scrolling. That\'s not weakness — it\'s design.',
    scriptSnippet:
      'Open on a looping notification. Voice: "Your brain treats an open loop like hunger." Cut to contrast — closed tab vs. binge session. Payoff: one habit to break the trap.',
  },
  {
    id: 'finance',
    niche: 'Finance',
    emoji: '💰',
    topic: 'The invisible tax on your salary',
    hook: 'You got a raise. Your lifestyle got it first.',
    scriptSnippet:
      'Cold open: paycheck notification. Narrator walks through three silent leaks — subscriptions, convenience, status spending. End on one actionable rule.',
  },
  {
    id: 'history',
    niche: 'History',
    emoji: '📜',
    topic: 'The night before the revolution',
    hook: 'Everyone remembers the day. Nobody remembers the doubt the night before.',
    scriptSnippet:
      'Documentary tone. Single candle, letters on a desk. Build tension with dates and names. Final frame: empty chair, dawn light.',
  },
  {
    id: 'ai',
    niche: 'AI',
    emoji: '🤖',
    topic: 'What creators should automate first',
    hook: 'AI won\'t replace you. But a creator using AI might.',
    scriptSnippet:
      'Fast cuts: script draft, storyboard grid, voice waveform. Three beats — research, first draft, polish. CTA: ship one reel this week.',
  },
  {
    id: 'fitness',
    niche: 'Fitness',
    emoji: '💪',
    topic: 'The workout you skip on bad days',
    hook: 'Motivation is for beginners. Systems are for people who finish.',
    scriptSnippet:
      'Gritty B-roll: 5 a.m. alarm, shoes by the door. Voice stays calm — no hype. Payoff: minimum viable session that keeps the streak.',
  },
]
