// MUGTEE Personality Engine — cinematic copy strings.
//
// Tone: intelligent, witty, slightly sarcastic, cinematic, concise, confident.
// Never robotic. Never corporate. Never generic support tone.
//
// EXTREME LOW CREDIT MODE: zero deps. Pure constants + tiny pickers.

// ----- Loading copy (rotates while a generation is in flight) -----
export const MUGTEE_LOADING_LINES: string[] = [
  'Analysing hook retention…',
  'Sharpening emotional pacing…',
  'Writing a cinematic CTA…',
  'Hunting a stronger angle…',
  'Pruning weak verbs…',
  'Stress-testing the opening line…',
  'Layering documentary breath…',
  'Listening for the unspoken feeling…',
  'Composing the curiosity loop…',
  'Earning the share, not asking for it…',
]

// ----- Speak-back lines (TTS micro-feedback) -----
export const MUGTEE_SPEAK_LINES = {
  listeningStart:   ['Talk to me.', 'I\'m listening.', 'Go ahead.'],
  generatingScript: ['Building documentary pacing.', 'Dangerous territory — let\'s make them feel something.', 'Writing it now.'],
  rewriting:        ['Your hook\'s too polite. Sharpening it now.', 'I found a stronger emotional angle.', 'This intro lacks tension. Fixing it.'],
  rewriteShorter:   ['Cutting the filler.', 'Trimming. Same meaning, less fat.'],
  rewriteEmotional: ['Adding the breath this needed.', 'Layering the feeling now.'],
  rewriteViral:     ['Sharpening the hook.', 'Making it scroll-stop.'],
  rewriteDoc:       ['Switching to documentary voice.'],
  rewriteCTA:       ['Rewriting the final line. Earning the share this time.'],
  exporting:        ['Exporting now.', 'Packaging your script.'],
  openingProject:   ['Opening your latest project.'],
  reading:          ['Reading it back.'],
  unknown:          ["Didn't catch that. Try again?", 'Say it sharper — I\'m listening.'],
}

export function pick<T>(list: T[]): T { return list[Math.floor(Math.random() * list.length)] }

// ----- Cinematic generic acks (used when AI returns a draft) -----
export const MUGTEE_ACKS = [
  'Done. Read it once.',
  'Try this version.',
  'First pass. Sharpen the parts that don\'t land.',
  'Here\'s a take. Highlight what feels off.',
]
