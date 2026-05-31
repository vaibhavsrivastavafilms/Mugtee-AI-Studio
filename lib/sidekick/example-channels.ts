export type ExampleChannel = {
  id: string
  niche: string
  emoji: string
  topic: string
  hook: string
  scriptSnippet: string
  storyboard: string
  captions: string
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
    storyboard:
      'Frame 1: Phone glow on face in dark room. Frame 2: Split screen — closed laptop vs. infinite scroll. Frame 3: Close-up eye reflection. Frame 4: Text card — one rule to close the loop.',
    captions:
      'Your brain isn\'t broken — it\'s finishing stories you never asked for. Save this if you catch yourself in the scroll trap. #psychology #mindset #reels',
  },
  {
    id: 'finance',
    niche: 'Finance',
    emoji: '💰',
    topic: 'The invisible tax on your salary',
    hook: 'You got a raise. Your lifestyle got it first.',
    scriptSnippet:
      'Cold open: paycheck notification. Narrator walks through three silent leaks — subscriptions, convenience, status spending. End on one actionable rule.',
    storyboard:
      'Frame 1: Paycheck notification animation. Frame 2: Three expense icons lighting up. Frame 3: Calculator on desk, coffee going cold. Frame 4: Single rule on screen.',
    captions:
      'A raise doesn\'t fix leakage — systems do. Which silent tax hits you hardest? Comment below. #money #finance #personalfinance',
  },
  {
    id: 'history',
    niche: 'History',
    emoji: '📜',
    topic: 'The night before the revolution',
    hook: 'Everyone remembers the day. Nobody remembers the doubt the night before.',
    scriptSnippet:
      'Documentary tone. Single candle, letters on a desk. Build tension with dates and names. Final frame: empty chair, dawn light.',
    storyboard:
      'Frame 1: Candle flicker, handwritten letter. Frame 2: Map with pins and dates. Frame 3: Empty chair by window. Frame 4: Dawn breaking over rooftops.',
    captions:
      'History remembers the headline. This is the doubt before it. Follow for documentary shorts that feel like film. #history #documentary #storytelling',
  },
  {
    id: 'ai',
    niche: 'AI',
    emoji: '🤖',
    topic: 'What creators should automate first',
    hook: 'AI won\'t replace you. But a creator using AI might.',
    scriptSnippet:
      'Fast cuts: script draft, storyboard grid, voice waveform. Three beats — research, first draft, polish. CTA: ship one reel this week.',
    storyboard:
      'Frame 1: Blank doc → filled script. Frame 2: Storyboard grid populating. Frame 3: Waveform syncing to cuts. Frame 4: Export button glow.',
    captions:
      'Automate research and first drafts — keep taste and direction human. Ship one reel this week. #ai #creatoreconomy #contentcreation',
  },
  {
    id: 'fitness',
    niche: 'Fitness',
    emoji: '💪',
    topic: 'The workout you skip on bad days',
    hook: 'Motivation is for beginners. Systems are for people who finish.',
    scriptSnippet:
      'Gritty B-roll: 5 a.m. alarm, shoes by the door. Voice stays calm — no hype. Payoff: minimum viable session that keeps the streak.',
    storyboard:
      'Frame 1: Alarm at 5:00 a.m. Frame 2: Shoes by door, no fanfare. Frame 3: Ten-minute session montage. Frame 4: Calendar streak checkmark.',
    captions:
      'Bad days don\'t need a perfect workout — they need a system. Save this for tomorrow morning. #fitness #discipline #consistency',
  },
]
