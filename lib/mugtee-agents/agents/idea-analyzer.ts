/**
 * AGENT 1 — Idea Analyzer → Creative Brief
 */

import { clampV4DurationSec } from '@/lib/production-os/v4/pipeline'
import { resolveCompanionSeed } from '@/lib/production-os/v4/input'
import type { CreativeBrief, RunMugteeAgentsInput } from '@/lib/mugtee-agents/types'

const GENRE_RULES: Array<{ re: RegExp; genre: string }> = [
  { re: /\bjagannath|devotee|temple|faith|prayer|destiny|spirit/i, genre: 'inspirational family drama' },
  { re: /\bpoor\b|\brich\b|\bmoney\b|\bwealth/i, genre: 'rags-to-riches family drama' },
  { re: /\blove\b|\bheart\b|\bromance/i, genre: 'warm romantic drama' },
  { re: /\bfamily\b|\bmother\b|\bfather\b|\bchild/i, genre: 'family drama' },
  { re: /\bfunny\b|\bcomedy\b|\blaugh/i, genre: 'family comedy' },
  { re: /\bmystery\b|\bsecret/i, genre: 'gentle mystery' },
]

const THEME_RULES: Array<{ re: RegExp; theme: string }> = [
  { re: /\bfaith\b|\bdestiny|\bjagannath/i, theme: 'Faith transforms destiny' },
  { re: /\bfamily\b|\bmother\b|\bfather/i, theme: 'Love binds family through hardship' },
  { re: /\bpoor\b|\bdream/i, theme: 'Hope rises from scarcity' },
  { re: /\bcourage\b|\bbrave/i, theme: 'Courage in small moments' },
]

function detect(
  rules: Array<{ re: RegExp; genre?: string; theme?: string }>,
  idea: string,
  key: 'genre' | 'theme',
  fallback: string
): string {
  for (const rule of rules) {
    if (rule.re.test(idea)) {
      const v = rule[key]
      if (typeof v === 'string') return v
    }
  }
  return fallback
}

/** Preserve explicitly named entities (e.g. Jagannath Ji). */
function extractNamedEntities(idea: string): string[] {
  const found: string[] = []
  const deity = idea.match(
    /\b(?:Shri\s+|Lord\s+)?Jagannath(?:\s+Ji)?\b|\b(?:Shri\s+)?Krishna(?:\s+Ji)?\b|\b(?:Maa\s+)?Durga\b|\bHanuman(?:\s+Ji)?\b/gi
  )
  if (deity) {
    for (const d of deity) {
      const n = d.replace(/\s+/g, ' ').trim()
      if (!found.some((x) => x.toLowerCase() === n.toLowerCase())) found.push(n)
    }
  }
  // Capitalised multi-word proper names (2–3 words)
  const proper = idea.match(/\b[A-Z][a-z]+(?:\s+(?:Ji|Devi|Das|Singh|Kumar))+\b/g)
  if (proper) {
    for (const p of proper) {
      if (!found.some((x) => x.toLowerCase() === p.toLowerCase())) found.push(p)
    }
  }
  return found
}

function extractCharacters(idea: string): { main: string[]; supporting: string[] } {
  const main: string[] = []
  const supporting: string[] = []
  const named = extractNamedEntities(idea)

  const devotee = idea.match(/\b((?:poor|young|brave|lonely)\s+)?devotee\b/i)
  const boy = idea.match(/\b((?:poor|young|brave|lonely)\s+)?boy\b/i)
  const girl = idea.match(/\b((?:poor|young|brave|lonely)\s+)?girl\b/i)

  if (devotee) {
    main.push(devotee[0].replace(/\b\w/g, (c) => c.toUpperCase()))
  } else if (boy) {
    main.push(boy[0].replace(/\b\w/g, (c) => c.toUpperCase()))
  } else if (girl) {
    main.push(girl[0].replace(/\b\w/g, (c) => c.toUpperCase()))
  }

  // User-specified sacred / named figures are MAIN when central to the idea
  for (const n of named) {
    if (!main.some((m) => m.toLowerCase() === n.toLowerCase())) {
      main.push(n)
    }
  }

  if (!main.length) main.push('Protagonist')

  // Cap main cast — Character Director uses MAIN only (max 3 leads)
  const mainOnly = main.slice(0, 3)

  const mother = idea.match(/\bmother\b|\bmaa\b|\bmum\b/i)
  const father = idea.match(/\bfather\b|\bpapa\b|\bdad\b/i)
  if (mother) supporting.push('Mother')
  if (father) supporting.push('Father')

  return { main: mainOnly, supporting }
}

function extractSetting(idea: string): string {
  if (/\bjagannath|puri|devotee/i.test(idea)) {
    return 'Sacred Puri temple town — carved stone courtyard, ocean breeze, warm lamps'
  }
  if (/\btemple\b|\bvillage\b|\bindia\b/i.test(idea)) {
    return 'Warm Indian village with temple courtyard and earthen homes'
  }
  if (/\bcity\b|\burban/i.test(idea)) return 'Lived-in Indian city neighbourhood'
  if (/\bschool\b/i.test(idea)) return 'Sunlit school courtyard and classroom'
  return 'Cinematic family-friendly world matching the story'
}

function extractMoral(idea: string, theme: string): string {
  if (/\bfaith\b|\bdestiny|\bjagannath/i.test(idea)) {
    return 'Belief and kindness can rewrite a hard fate.'
  }
  return `Live the truth of: ${theme}`
}

/** AGENT 1 */
export function runIdeaAnalyzer(input: RunMugteeAgentsInput): CreativeBrief {
  const seed = resolveCompanionSeed({
    idea: input.idea,
    attachments: input.attachments,
    intent: {
      durationSec: input.durationSec,
      language: input.language,
      audience: input.audience,
      platform:
        input.platform === 'shorts' || input.platform === 'youtube_short'
          ? 'youtube_short'
          : input.platform === 'reel' || input.platform === 'instagram_reel'
            ? 'instagram_reel'
            : 'other',
    },
  })
  const idea = seed.seedText
  const { main, supporting } = extractCharacters(idea)
  const theme = detect(THEME_RULES, idea, 'theme', 'Hope through hardship')
  const genre = detect(GENRE_RULES, idea, 'genre', 'inspirational family drama')

  return {
    idea: idea.slice(0, 500),
    genre,
    theme,
    audience: input.audience?.trim() || 'families and general viewers',
    emotion: /\bfaith|hope|destiny|jagannath/i.test(idea)
      ? 'hopeful uplift'
      : 'warm emotional resonance',
    language: input.language?.trim() || seed.intent.language || 'hi',
    durationSec: clampV4DurationSec(
      input.durationSec ?? seed.intent.durationSec ?? 60
    ),
    platform: input.platform?.trim() || String(seed.intent.platform || 'youtube_short'),
    mainCharacters: main,
    supportingCharacters: supporting,
    conflict: /\bfaith|destiny|jagannath/i.test(idea)
      ? 'Belief is tested against hardship and doubt'
      : `Obstacles threaten the promise of: ${idea.slice(0, 72)}`,
    ending: /\bchanges?\s+(his|her|their)\s+destiny/i.test(idea)
      ? 'Faith transforms fate — a quiet, powerful triumph'
      : 'A satisfying, hopeful resolution that lands emotionally',
    moral: extractMoral(idea, theme),
    setting: extractSetting(idea),
    sources: seed.sources,
    animationStyle: 'pixar_stylised_3d',
  }
}
