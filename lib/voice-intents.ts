// MUGTEE Voice Intent Router — lightweight keyword-based intent matching.
//
// Maps a final-transcript string → a structured intent the caller can act on.
// Zero NLP, zero ML, zero deps. ~120 lines. Intentionally narrow surface.
//
// Examples:
//   "generate a script about ancient cities"     → { kind: 'generate_script', topic: 'ancient cities' }
//   "create hooks for solo travel"                → { kind: 'generate_hooks',  topic: 'solo travel' }
//   "make this more viral"                        → { kind: 'rewrite', variant: 'more_viral' }
//   "make this more emotional"                    → { kind: 'rewrite', variant: 'emotional' }
//   "shorten this"                                → { kind: 'rewrite', variant: 'shorter' }
//   "documentary style"                           → { kind: 'rewrite', variant: 'documentary' }
//   "better cta"                                  → { kind: 'rewrite', variant: 'cta' }
//   "export this"                                 → { kind: 'export' }
//   "open latest project"                         → { kind: 'open_latest' }
//   "read this aloud"                             → { kind: 'read_aloud' }
//   "storyboard this"                             → { kind: 'storyboard' }
//
// Anything that doesn't match a command verb is treated as a topic for hooks/script.

export type RewriteVariant = 'more_viral' | 'shorter' | 'emotional' | 'documentary' | 'cta'

export type VoiceIntent =
  | { kind: 'generate_script';  topic: string }
  | { kind: 'generate_hooks';   topic: string }
  | { kind: 'rewrite';          variant: RewriteVariant }
  | { kind: 'storyboard' }
  | { kind: 'export' }
  | { kind: 'open_latest' }
  | { kind: 'read_aloud' }
  | { kind: 'stop_speaking' }
  | { kind: 'unknown';          raw: string }

function stripLead(t: string, leads: string[]): string {
  let s = t
  for (const l of leads) {
    const re = new RegExp('^(' + l + ')\\s+', 'i')
    s = s.replace(re, '')
  }
  return s.trim()
}

export function matchIntent(raw: string): VoiceIntent {
  const text = String(raw || '').trim().toLowerCase().replace(/[\.\!\?]+$/, '')
  if (!text) return { kind: 'unknown', raw: '' }

  // STOP commands first — they should beat any other match.
  if (/^(stop|cancel|quiet|silence|shut up|enough)\b/.test(text)) return { kind: 'stop_speaking' }

  // READ ALOUD
  if (/(read\s+(this|that|it)?\s*(aloud|out\s*loud|to\s*me)|narrate|speak it)/.test(text)) return { kind: 'read_aloud' }

  // EXPORT
  if (/^(export|download|save)\s+(this|it|the\s+script)?/.test(text) || /export it$/.test(text)) return { kind: 'export' }

  // OPEN LATEST
  if (/^(open|resume|continue|go to)\s+(the\s+)?(latest|last|recent|previous)?\s*(project|script|workspace)?/.test(text) || /continue creating/.test(text)) return { kind: 'open_latest' }

  // STORYBOARD
  if (/(storyboard|story\s*board|b-?roll|scene prompts|visual prompts)/.test(text)) return { kind: 'storyboard' }

  // REWRITE variants — these usually contain "make this" / "rewrite" / "this"
  const rewriteHit = /\b(rewrite|rework|redo|make (this|it)|change (this|it) to|turn (this|it) into|improve)\b/.test(text) || /^(more|less)\b/.test(text)
  if (rewriteHit || /\b(viral|emotional|shorter|documentary|cta|hook|punchier)\b/.test(text)) {
    if (/\b(viral|punchier|scroll|share|hook)\b/.test(text)) return { kind: 'rewrite', variant: 'more_viral' }
    if (/\b(shorter|short|trim|cut|tight)\b/.test(text)) return { kind: 'rewrite', variant: 'shorter' }
    if (/\b(emotional|emotion|feel|deeper|heart)\b/.test(text)) return { kind: 'rewrite', variant: 'emotional' }
    if (/\b(documentary|doc|narrator|cinematic\s+narration)\b/.test(text)) return { kind: 'rewrite', variant: 'documentary' }
    if (/\b(cta|call\s+to\s+action|ending|outro|final line)\b/.test(text)) return { kind: 'rewrite', variant: 'cta' }
    // Fallback: most common ask = more viral.
    return { kind: 'rewrite', variant: 'more_viral' }
  }

  // GENERATE HOOKS
  if (/(generate|give|write|create|make|brainstorm)\s+.*\b(hook|hooks|titles?)\b/.test(text)) {
    let topic = stripLead(text, ['generate', 'give me', 'write', 'create', 'make', 'brainstorm'])
    topic = topic.replace(/^(some|a|the|me)\s+/i, '').replace(/\b(hook|hooks|title|titles)\b/g, '').replace(/\s+for\s+/, ' ').replace(/\s+about\s+/, ' ').trim()
    return { kind: 'generate_hooks', topic }
  }

  // GENERATE SCRIPT (catch-all: "generate X", "write me X", "script about X")
  if (/(generate|write|create|make|script)\b/.test(text) || /about\b/.test(text)) {
    let topic = stripLead(text, ['generate', 'give me', 'write', 'create', 'make', 'i want', "i'd like", 'script', 'documentary on', 'documentary about'])
    topic = topic.replace(/^(a|an|the|some|me)\s+/i, '').replace(/^(script|documentary|video|reel)\s+(about|on|of)\s+/i, '').replace(/^(about|on)\s+/i, '').trim()
    if (topic.length >= 3) return { kind: 'generate_script', topic }
  }

  // If nothing matched but the input is substantive, treat it as a topic for script.
  if (text.length >= 8) return { kind: 'generate_script', topic: text }

  return { kind: 'unknown', raw: text }
}
