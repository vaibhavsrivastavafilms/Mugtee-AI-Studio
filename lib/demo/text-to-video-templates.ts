import type { VideoGeneratorOutput, VideoScene } from '@/app/api/ai/video-generator/route'

/** Text To Video studio (`/studio/video`) is demo-only — no live API spend on this route. */
export const TEXT_TO_VIDEO_STUDIO_DEMO_ONLY = true

export type TextToVideoDemoTemplateId =
  | 'ancient-egypt-daily-life'
  | 'faceless-history-channel'
  | 'viral-psychology-reel'
  | 'documentary-storytelling'

export type TextToVideoVoicePreview = {
  voiceName: string
  style: string
  durationSec: number
  waveform: number[]
}

export type TextToVideoDemoTemplate = {
  id: TextToVideoDemoTemplateId
  title: string
  topic: string
  tagline: string
  output: VideoGeneratorOutput
  sceneImageUrls: string[]
  voicePreview: TextToVideoVoicePreview
  /** Poster frame shown before MP4 loads */
  previewVideoPoster: string
  /** Playable demo MP4 — stable public sample per template */
  previewVideoUrl: string
}

const VISUAL_SUFFIX =
  'Ultra realistic cinematic scene, historically accurate, volumetric lighting, film quality, high detail, epic composition, cinematic color grading, 8k, masterpiece.'

function scene(
  sceneNumber: number,
  narration: string,
  visual: string,
  cameraMovement: string,
  duration: string
): VideoScene {
  return {
    sceneNumber,
    narration,
    visualPrompt: `${visual}. ${VISUAL_SUFFIX}`,
    cameraMovement,
    duration,
  }
}

function voicePreview(durationSec: number): TextToVideoVoicePreview {
  return {
    voiceName: 'Cinematic Narrator',
    style: 'warm_documentary',
    durationSec,
    waveform: [0.12, 0.28, 0.45, 0.62, 0.48, 0.35, 0.55, 0.72, 0.58, 0.4, 0.22, 0.18],
  }
}

const EGYPT_SCENES: VideoScene[] = [
  scene(
    1,
    'Before the pyramids became monuments, they were mornings — bread rising in clay ovens, children running through dust, and the Nile carrying more than water.',
    'Ancient Egyptian village at dawn, mud-brick homes, women grinding grain, Nile mist, golden sunrise',
    'Slow crane over Nile bank settlement',
    '5s'
  ),
  scene(
    2,
    'Farmers measured time by the flood, not the clock. When the river receded, it left black soil — and an entire civilization learned to read the earth.',
    'Farmers planting along Nile floodplain, ox-drawn plow, lush green fields against desert horizon',
    'Tracking shot along irrigation channels',
    '5s'
  ),
  scene(
    3,
    'In the workshops, scribes mixed ink from soot and honey. Every symbol carved into papyrus was a thread in a memory that refused to die.',
    'Scribe workshop interior, papyrus scrolls, reed pens, lamplight on hieroglyphs',
    'Intimate push-in on writing hands',
    '5s'
  ),
  scene(
    4,
    'At dusk, the city smelled of bread, incense, and river mud. Daily life was not a backdrop to greatness — it was the engine that built the pyramids.',
    'Evening Egyptian street market, bread stalls, incense smoke, citizens in linen, warm torchlight',
    'Handheld drift through market lanes',
    '6s'
  ),
  scene(
    5,
    'This is Egypt before the postcards — real hands, real hunger, real rhythm. The empire rose because ordinary days never felt ordinary.',
    'Wide panoramic Nile settlement at sunset, temples in distance, daily life continuing in foreground',
    'Slow aerial pullback revealing full riverside city',
    '6s'
  ),
]

const FACELESS_HISTORY_SCENES: VideoScene[] = [
  scene(
    1,
    'History channels do not need a face. They need a question so sharp it stops the scroll before the algorithm decides you are bored.',
    'Macro shot of old map unfurling on desk, candlelight, no face visible, faceless history aesthetic',
    'Top-down slow reveal on aged parchment',
    '4s'
  ),
  scene(
    2,
    'Open on the object — the coin, the letter, the scar on a wall. Let the viewer lean in before you ever explain the century.',
    'Extreme close-up of ancient coin rotating in light beam, dust particles, dramatic contrast',
    'Macro orbit around artifact',
    '4s'
  ),
  scene(
    3,
    'Cut on texture, not talking head. Sand under boot. Ink on vellum. The voice carries authority; the frame carries proof.',
    'Montage B-roll: sand footsteps, quill on parchment, stone carving — no presenter',
    'Fast punch cuts with match motion',
    '5s'
  ),
  scene(
    4,
    'The hook is not “did you know.” It is “you were taught the safe version.” That gap is where faceless channels win.',
    'Split visual: textbook illustration vs gritty archival reconstruction, faceless narration energy',
    'Whip pan between contrast frames',
    '5s'
  ),
  scene(
    5,
    'End on the artifact again — now charged with meaning. Subscribe is implied. Understanding is earned.',
    'Return to coin close-up, warmer light, title-safe negative space for captions',
    'Slow push-in to hero frame',
    '5s'
  ),
]

const PSYCHOLOGY_SCENES: VideoScene[] = [
  scene(
    1,
    'You were never addicted to your phone. You were addicted to the feeling of almost being chosen.',
    'Phone face-down on wooden table, notification glow pulsing, intimate psychology framing',
    'Macro static with subtle push-in',
    '4s'
  ),
  scene(
    2,
    'Every scroll is a micro-audition. Your nervous system does not want content — it wants confirmation that you still matter.',
    'Thumb hovering above screen, tension in pause, cool screen glow vs warm ambient',
    'Handheld medium close-up',
    '5s'
  ),
  scene(
    3,
    'The algorithm did not break you. It learned which silence you would pay to fill — and priced the refill at fifteen seconds.',
    'Infinite scroll reflection in dark glass, layered notifications, psychological unease',
    'Slow lateral dolly through reflections',
    '5s'
  ),
  scene(
    4,
    'Pattern interrupt: flip the phone face-down. The craving does not vanish — but for one breath, you remember you can choose.',
    'Hand flips phone face-down, exhale implied, soft window light returning',
    'Decisive snap cut to stillness',
    '4s'
  ),
  scene(
    5,
    'Send this to someone who checks their phone before they check how they feel. The mirror works both ways.',
    'Mirror catching subject mid-glance, doubled loneliness, muted neutrals, emotional peak',
    'Slow push-in via mirror reflection',
    '5s'
  ),
]

const DOCUMENTARY_SCENES: VideoScene[] = [
  scene(
    1,
    'The camera did not find a story. It found a silence someone left behind — and decided to stay long enough to hear it.',
    'Empty market stall at dawn, chalk prices on wood, vérité documentary framing',
    'Handheld medium, observational hold',
    '5s'
  ),
  scene(
    2,
    'Documentary is not narration over B-roll. It is patience — letting a room tell you what the interview never will.',
    'Interior back room, archive boxes, dust in window light, worn hands sorting letters',
    'Close documentary intimacy, natural contrast',
    '6s'
  ),
  scene(
    3,
    'Hold on the detail longer than comfort allows. That extra second is where audiences feel truth instead of performance.',
    'Extreme close on weathered hands, letters, ink stains — memory made physical',
    'Static close hold, subtle rack focus',
    '5s'
  ),
  scene(
    4,
    'Wide frame. One figure walks away. The camera stays — witness does not follow, but refuses to look away.',
    'Locked wide urban street, lone figure exiting frame, overcast morning light',
    'Static wide witness shot',
    '6s'
  ),
  scene(
    5,
    'Some stories survive because someone stayed to notice. This is what documentary feels like when it trusts the silence.',
    'Return to dawn stall, now with human presence — quiet continuity, earth tones',
    'Slow dolly out to environmental context',
    '5s'
  ),
]

export const TEXT_TO_VIDEO_DEMO_TEMPLATES: TextToVideoDemoTemplate[] = [
  {
    id: 'ancient-egypt-daily-life',
    title: 'Ancient Egypt Daily Life',
    topic: 'What daily life looked like in Ancient Egypt along the Nile',
    tagline: 'From bread ovens to flood fields — Egypt before the postcards.',
    output: {
      title: 'What Daily Life Looked Like in Ancient Egypt',
      hook: 'Before the pyramids became monuments, Egypt was mornings — bread, mud, and the Nile deciding everything.',
      voiceover: EGYPT_SCENES.map((s) => s.narration).join('\n\n'),
      scenes: EGYPT_SCENES,
      thumbnailPrompt: `Dramatic Nile riverside settlement at golden hour, daily Egyptian life, bread and linen, epic documentary thumbnail. ${VISUAL_SUFFIX}`,
      captions: [
        'Egypt was mornings before it was monuments.',
        'The Nile did not just carry water — it carried time.',
        'Save this before history class lies again.',
      ],
      hashtags: ['#AncientEgypt', '#History', '#Documentary', '#Cinematic', '#Shorts'],
    },
    sceneImageUrls: [
      'https://images.unsplash.com/photo-1568322445380-f9ba8147e1a2?w=800&q=85',
      'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=85',
      'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800&q=85',
      'https://images.unsplash.com/photo-1539650116574-75c0c7d0c0e9?w=800&q=85',
      'https://images.unsplash.com/photo-1539768940663-e37f317c40e1?w=800&q=85',
    ],
    voicePreview: voicePreview(58),
    previewVideoPoster:
      'https://images.unsplash.com/photo-1568322445380-f9ba8147e1a2?w=1200&q=85',
    previewVideoUrl:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  },
  {
    id: 'faceless-history-channel',
    title: 'Faceless History Channel Hook',
    topic: 'How to open a faceless history channel video that stops the scroll',
    tagline: 'No face. No “did you know.” Just proof and tension.',
    output: {
      title: 'The Faceless History Hook That Actually Works',
      hook: 'History channels do not need a face — they need a question sharp enough to stop the scroll in two seconds.',
      voiceover: FACELESS_HISTORY_SCENES.map((s) => s.narration).join('\n\n'),
      scenes: FACELESS_HISTORY_SCENES,
      thumbnailPrompt: `Ancient coin and map on candlelit desk, faceless history channel aesthetic, bold title-safe composition. ${VISUAL_SUFFIX}`,
      captions: [
        'No face. No fluff. Just the artifact.',
        'You were taught the safe version.',
        'Follow for history that hits different.',
      ],
      hashtags: ['#Faceless', '#HistoryChannel', '#Storytelling', '#YouTubeShorts', '#Documentary'],
    },
    sceneImageUrls: [
      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&q=85',
      'https://images.unsplash.com/photo-1614028674026-a65a41f4a62b?w=800&q=85',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=85',
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=85',
      'https://images.unsplash.com/photo-1614028674026-a65a41f4a62b?w=800&q=85',
    ],
    voicePreview: voicePreview(52),
    previewVideoPoster:
      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&q=85',
    previewVideoUrl:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
  {
    id: 'viral-psychology-reel',
    title: 'Viral Psychology Reel',
    topic: 'The hidden psychology of why we chase approval on social media',
    tagline: 'Attention, attachment, and the scroll that never chooses you.',
    output: {
      title: 'The Hidden Psychology of Attention',
      hook: 'You were never addicted to your phone. You were addicted to the feeling of almost being chosen.',
      voiceover: PSYCHOLOGY_SCENES.map((s) => s.narration).join('\n\n'),
      scenes: PSYCHOLOGY_SCENES,
      thumbnailPrompt: `Phone face-down with notification glow, intimate psychology reel thumbnail, muted neutrals. ${VISUAL_SUFFIX}`,
      captions: [
        'The scroll was never about content.',
        'Almost being chosen hits different.',
        'Send this to someone who needs the mirror.',
      ],
      hashtags: ['#Psychology', '#ViralReel', '#Attention', '#Cinematic', '#Reels'],
    },
    sceneImageUrls: [
      'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=85',
      'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=85',
      'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&q=85',
      'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800&q=85',
      'https://images.unsplash.com/photo-1611162616305-c69b303fa5?w=800&q=85',
    ],
    voicePreview: voicePreview(48),
    previewVideoPoster:
      'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&q=85',
    previewVideoUrl:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  },
  {
    id: 'documentary-storytelling',
    title: 'Documentary Storytelling',
    topic: 'Cinematic documentary storytelling — the last witness to a disappearing truth',
    tagline: 'Vérité pacing, human detail, unhurried truth.',
    output: {
      title: 'The Last Witness',
      hook: 'The camera did not find a story. It found a silence someone left behind.',
      voiceover: DOCUMENTARY_SCENES.map((s) => s.narration).join('\n\n'),
      scenes: DOCUMENTARY_SCENES,
      thumbnailPrompt: `Dawn market stall, documentary vérité mood, earth tones, witness framing. ${VISUAL_SUFFIX}`,
      captions: [
        'Some truths only survive because someone stayed.',
        'Watch twice. The second pass hurts different.',
        'Documentary is patience, not performance.',
      ],
      hashtags: ['#Documentary', '#Storytelling', '#RealStory', '#Cinematic', '#Film'],
    },
    sceneImageUrls: [
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=85',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=85',
      'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&q=85',
      'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=85',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=85',
    ],
    voicePreview: voicePreview(62),
    previewVideoPoster:
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=85',
    previewVideoUrl:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Suburbia.mp4',
  },
]

export function textToVideoTemplateById(
  id: string | null | undefined
): TextToVideoDemoTemplate | null {
  if (!id) return null
  return TEXT_TO_VIDEO_DEMO_TEMPLATES.find((t) => t.id === id) ?? null
}

export function defaultTextToVideoTemplate(): TextToVideoDemoTemplate {
  return TEXT_TO_VIDEO_DEMO_TEMPLATES[0]
}
