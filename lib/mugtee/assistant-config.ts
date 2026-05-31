import { quickCutStudioHref, STUDIO } from '@/lib/create/routes'

export type MugteeQuickAction = {
  label: string
  prompt: string
  /** Navigate to studio surface; prompt is also sent to chat when `chatFirst` is true. */
  href?: string
  chatFirst?: boolean
}

export type MugteeFaqItem = {
  question: string
  /** Static answer shown inline without calling the API. */
  answer?: string
  /** Prefills the chat input for the creator to edit or send. */
  prompt?: string
  /** Deep-link into the app. */
  href?: string
}

export type MugteeFaqCategory = {
  id: string
  emoji: string
  label: string
  items: MugteeFaqItem[]
}

export const MUGTEE_GREETING =
  'Welcome to Mugtee Studio.\n\nTurn an idea into a cinematic reel, storyboard, script, or creator workflow in minutes.\n\nWhat are we creating today?'

export const MUGTEE_TAGLINE = 'Direct stories. Build reels. Create cinematic moments.'

export const MUGTEE_INPUT_PLACEHOLDER = 'Describe your idea…'

export const MUGTEE_INPUT_EXAMPLE =
  'Example: "Create a cinematic reel about discipline and success."'

export const MUGTEE_QUICK_ACTIONS: MugteeQuickAction[] = [
  {
    label: 'Generate Reel Idea',
    prompt: 'Generate 3 cinematic reel ideas with scroll-stopping hooks for my niche.',
    href: quickCutStudioHref(),
  },
  {
    label: 'Create Cinematic Script',
    prompt: 'Help me outline a cinematic script — cold open, escalation, and payoff.',
    href: quickCutStudioHref({ tab: 'script' }),
  },
  {
    label: 'Build Storyboard',
    prompt: 'Walk me through building a storyboard from my script in Mugtee Studio.',
    href: quickCutStudioHref({ tab: 'scenes' }),
  },
  {
    label: "Mugtee's Hook",
    prompt: 'Write 5 pattern-interrupt hooks for my reel topic. Make them specific and cinematic.',
    href: quickCutStudioHref({ tab: 'hook' }),
  },
  {
    label: 'Rewrite Existing Script',
    prompt: 'I have a script to rewrite. Ask me to paste it, then tighten pacing and hooks.',
    chatFirst: true,
  },
  {
    label: 'Analyze YouTube Video',
    prompt: 'How do I analyze a YouTube video or channel for content opportunities in Mugtee?',
    href: STUDIO.create,
    chatFirst: true,
  },
  {
    label: 'Generate Captions',
    prompt: 'Generate Instagram captions and hashtags for my reel — hook-first, platform-native.',
    chatFirst: true,
  },
  {
    label: 'Create Voiceover',
    prompt: 'Guide me through adding cinematic voiceover to my reel in Mugtee Studio.',
    href: quickCutStudioHref({ tab: 'voice' }),
  },
  {
    label: 'Create Documentary Story',
    prompt: 'Help me structure a documentary-style faceless story with research beats and narration arc.',
    href: quickCutStudioHref({ tone: 'documentary' }),
  },
  {
    label: 'Create Faceless Reel',
    prompt: 'Create a faceless reel concept — B-roll direction, voice tone, and retention structure.',
    href: quickCutStudioHref(),
  },
]

export const MUGTEE_FAQ_POPULAR: MugteeFaqItem[] = [
  {
    question: 'What is Mugtee Studio?',
    answer:
      'Mugtee Studio is your cinematic production workspace — one place to go from idea to hook, script, storyboard, voice, and export. Start at Create for Quick Cut or open Director for scene-by-scene control.',
  },
  {
    question: 'How is Mugtee different from ChatGPT?',
    answer:
      'Mugtee is built for creators, not general Q&A. It thinks in reels, retention, storyboards, and export — not essays. Use the chat for direction; use Studio to actually build.',
  },
  {
    question: 'What is the full creative workflow?',
    answer:
      'Idea → Hook → Script → Visual Direction → Storyboard → Voice → Export. Quick Cut automates most of this from one prompt; Director Mode gives you frame-level control.',
  },
  {
    question: 'What is Quick Cut vs Director Mode?',
    answer:
      'Quick Cut (/studio/create?mode=quick) is fast — one idea becomes script, scenes, visuals, and voice. Director Mode (/studio/director) is the full cinematic canvas for hands-on scene editing.',
  },
  {
    question: 'How do I create my first reel?',
    prompt: 'Walk me step-by-step through creating my first cinematic reel in Mugtee Studio.',
    href: quickCutStudioHref(),
  },
  {
    question: 'How long does generation take?',
    answer:
      'Script and storyboard usually land in under a minute. Visual frames and voice depend on length and queue — typically a few minutes for a short reel. You can leave and resume from Projects.',
  },
  {
    question: 'Can I export an MP4?',
    answer:
      'Yes. Finish voice and storyboard visuals, then export from your project workspace or Exports. Quick Cut projects compile to MP4 when render is enabled on your plan.',
    href: STUDIO.exports,
  },
  {
    question: 'Which platforms does Mugtee support?',
    answer:
      'Instagram Reels (9:16), YouTube (16:9 or vertical), and documentary-style faceless formats. Set platform and tone at create time — scripts and pacing adapt.',
  },
  {
    question: 'How do hooks work here?',
    prompt: 'Explain the 1.5-second hook rule and write 3 hooks for my topic.',
  },
  {
    question: 'Where are my saved projects?',
    answer: 'Open Projects from Studio (/studio/projects) to resume drafts, regenerate, or export finished reels.',
    href: STUDIO.projects,
  },
  {
    question: 'Can I regenerate one scene?',
    prompt: 'How do I regenerate a single storyboard frame or scene without starting over?',
  },
  {
    question: 'How do credits work?',
    answer:
      'Generations (script, images, voice) consume credits based on your plan. Check Settings or Pricing for your balance. Free tier has a monthly cap; Creator and Agency tiers scale output.',
    href: '/pricing',
  },
  {
    question: 'Can I use reference images?',
    prompt: 'How do I upload reference images for mood or character consistency in Quick Cut?',
    href: quickCutStudioHref(),
  },
  {
    question: 'How do I improve retention?',
    prompt: 'Review my reel structure for retention — where do viewers drop off and how do I fix pacing?',
  },
  {
    question: 'How do I connect YouTube or Instagram?',
    answer:
      'Go to Settings (/studio/settings) to connect accounts for publishing intel and workflow handoffs. YouTube analysis lives in the Faceless / research flows.',
    href: STUDIO.settings,
  },
]

export const MUGTEE_FAQ_CATEGORIES: MugteeFaqCategory[] = [
  {
    id: 'creation',
    emoji: '🎬',
    label: 'Creation',
    items: [
      {
        question: 'How do I start a new project?',
        answer: 'Tap Create in Studio or use Quick Cut — describe your idea and Mugtee runs hook → script → storyboard → voice.',
        href: STUDIO.create,
      },
      {
        question: 'Can one sentence become a full reel?',
        answer:
          'Yes. Quick Cut is designed for that — one cinematic prompt can produce script beats, scene prompts, visuals, and voice narration.',
        href: quickCutStudioHref(),
      },
      {
        question: 'Quick Cut or Director — which first?',
        answer:
          'Start Quick Cut for speed. Move to Director when you want to edit scenes, timing, and visual direction frame by frame.',
      },
      {
        question: 'What niches work best?',
        prompt: 'Suggest 3 reel niches that fit cinematic faceless storytelling for my audience.',
      },
      {
        question: 'How do I resume after closing the tab?',
        answer: 'Projects autosave. Open Projects and continue from the last completed stage — script, scenes, voice, or export.',
        href: STUDIO.projects,
      },
    ],
  },
  {
    id: 'content',
    emoji: '✍️',
    label: 'Content',
    items: [
      {
        question: 'What makes a script cinematic?',
        answer:
          'Cold open, emotional contrast, visual beats written for B-roll, and a payoff — not blog prose. Mugtee scripts are paced for voice and frame cuts.',
      },
      {
        question: 'How do I rewrite my script?',
        prompt: 'I want to rewrite my script for tighter hooks and better pacing. Ask me to paste it.',
      },
      {
        question: 'Documentary vs viral reel tone?',
        answer:
          'Documentary = longer arc, research beats, narrator authority. Viral reel = pattern interrupt in 1.5s, loop-friendly payoff. Pick tone at create time.',
      },
      {
        question: 'How do I generate captions?',
        prompt: 'Write caption packs for Instagram — primary caption plus 2 alternates and hashtags.',
      },
      {
        question: 'Can Mugtee write YouTube scripts?',
        prompt: 'Outline a 8-minute faceless YouTube script with chapter beats and retention hooks.',
        href: quickCutStudioHref({ tone: 'documentary' }),
      },
    ],
  },
  {
    id: 'visuals',
    emoji: '🎨',
    label: 'Visuals',
    items: [
      {
        question: 'How does storyboard generation work?',
        answer:
          'After script, Mugtee breaks scenes into shots with cinematic prompts — mood, camera, lighting. Generate stills per scene, then compile to reel.',
      },
      {
        question: 'Can I regenerate one frame?',
        prompt: 'How do I regenerate a single storyboard image without redoing the whole project?',
      },
      {
        question: 'What aspect ratios are supported?',
        answer: 'Vertical 9:16 for Reels and Shorts; horizontal 16:9 for YouTube. Aspect is set from platform at create time.',
      },
      {
        question: 'How do I control mood and camera?',
        prompt: 'Explain mood, camera style, and lighting controls in the storyboard stage.',
        href: quickCutStudioHref({ tab: 'visuals' }),
      },
    ],
  },
  {
    id: 'voice',
    emoji: '🔊',
    label: 'Voice',
    items: [
      {
        question: 'How do I add voiceover?',
        answer:
          'Complete script and storyboard, then open the Voice stage. Pick a voice, generate narration, sync to scenes, and export.',
        href: quickCutStudioHref({ tab: 'voice' }),
      },
      {
        question: 'Can I choose different AI voices?',
        answer:
          'Yes — the Voice stage offers multiple cinematic voices. Preview before generating the full narration track.',
      },
      {
        question: 'Can Mugtee read my script aloud?',
        answer:
          'In the script workspace, use Read Script for browser playback. For production voiceover, use the Voice stage to generate MP3 narration.',
      },
    ],
  },
  {
    id: 'projects',
    emoji: '💾',
    label: 'Projects',
    items: [
      {
        question: 'Where are my projects?',
        answer: 'All drafts and exports live under Studio → Projects.',
        href: STUDIO.projects,
      },
      {
        question: 'How do I download my reel?',
        answer: 'Open a finished project and use Export/Download, or browse downloaded MP4s under Exports.',
        href: STUDIO.exports,
      },
      {
        question: 'Can I duplicate a project?',
        prompt: 'How do I duplicate or regenerate a project while keeping the same topic?',
      },
      {
        question: 'What happens if generation fails?',
        answer:
          'The project saves the last good stage. Re-open it and retry the failed step — script, scenes, or voice — without losing earlier work.',
      },
    ],
  },
  {
    id: 'billing',
    emoji: '💳',
    label: 'Billing',
    items: [
      {
        question: 'What plans are available?',
        answer: 'Free, Creator, and Agency tiers — see Pricing for limits on scripts, images, voice, and export.',
        href: '/pricing',
      },
      {
        question: 'How do credits work?',
        answer:
          'Each generation step uses credits. Your dashboard and Settings show remaining balance. Upgrading raises monthly caps.',
        href: '/pricing',
      },
      {
        question: 'How do I upgrade?',
        answer: 'Open Pricing, pick Creator or Agency, and checkout via Razorpay. Upgrades apply immediately to your account.',
        href: '/pricing',
      },
      {
        question: 'Can I cancel anytime?',
        answer:
          'Yes — manage subscription from Settings. You keep access through the current billing period; credits do not roll over on downgrade.',
        href: STUDIO.settings,
      },
    ],
  },
]
