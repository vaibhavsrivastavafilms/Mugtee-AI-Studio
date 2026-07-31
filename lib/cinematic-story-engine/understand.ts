import { parseCreatorIntentSync } from '@/lib/input-understanding/intent-extraction'
import { clampV4DurationSec } from '@/lib/production-os/v4/pipeline'
import type { StoryUnderstanding } from '@/lib/cinematic-story-engine/types'

const GENRE_RULES: Array<{ re: RegExp; genre: string }> = [
  { re: /\bfaith\b|\btemple\b|\bprayer\b|\bdestiny\b|\bspirit/i, genre: 'inspirational drama' },
  { re: /\bpoor\b|\brich\b|\bmoney\b|\bwealth/i, genre: 'rags-to-riches drama' },
  { re: /\blove\b|\bheart\b|\bromance/i, genre: 'romantic drama' },
  { re: /\bwar\b|\bbattle\b|\bsoldier/i, genre: 'historical epic' },
  { re: /\bmystery\b|\bsecret\b|\bthriller/i, genre: 'mystery thriller' },
  { re: /\bspace\b|\bfuture\b|\bai\b/i, genre: 'sci-fi' },
  { re: /\bdocumentary\b|\btrue story/i, genre: 'documentary' },
  { re: /\bfunny\b|\bcomedy\b|\blaugh/i, genre: 'comedy' },
]

const EMOTION_RULES: Array<{ re: RegExp; emotion: string }> = [
  { re: /\bfaith\b|\bhope\b|\bdestiny\b|\bdream/i, emotion: 'hopeful uplift' },
  { re: /\bfear\b|\bdark\b|\bterror/i, emotion: 'tension' },
  { re: /\blove\b|\bheart/i, emotion: 'warm intimacy' },
  { re: /\bangry\b|\brevenge\b|\bfight/i, emotion: 'defiant energy' },
  { re: /\bsad\b|\bloss\b|\bgrief/i, emotion: 'melancholy' },
]

function detectGenre(idea: string): string {
  for (const rule of GENRE_RULES) {
    if (rule.re.test(idea)) return rule.genre
  }
  return 'cinematic drama'
}

function detectEmotion(idea: string): string {
  for (const rule of EMOTION_RULES) {
    if (rule.re.test(idea)) return rule.emotion
  }
  return 'emotional resonance'
}

function extractCharacters(idea: string): string[] {
  const chars: string[] = []
  const boy = idea.match(/\b((?:poor|young|brave|lonely)\s+)?boy\b/i)
  const girl = idea.match(/\b((?:poor|young|brave|lonely)\s+)?girl\b/i)
  const man = idea.match(/\b((?:old|young|wise)\s+)?man\b/i)
  const woman = idea.match(/\b((?:old|young|wise)\s+)?woman\b/i)
  if (boy) chars.push(boy[0].replace(/\b\w/g, (c) => c.toUpperCase()))
  if (girl) chars.push(girl[0].replace(/\b\w/g, (c) => c.toUpperCase()))
  if (man) chars.push(man[0].replace(/\b\w/g, (c) => c.toUpperCase()))
  if (woman) chars.push(woman[0].replace(/\b\w/g, (c) => c.toUpperCase()))
  if (!chars.length) chars.push('Protagonist')
  return chars
}

function extractSetting(idea: string): string {
  if (/\btemple\b|\bvillage\b|\bindia\b/i.test(idea)) return 'Rural village with sacred temple grounds'
  if (/\bcity\b|\burban\b|\bstreet/i.test(idea)) return 'Contemporary city streets'
  if (/\bspace\b|\bplanet/i.test(idea)) return 'Vast cosmic landscape'
  if (/\bforest\b|\bnature/i.test(idea)) return 'Lush natural wilderness'
  return 'Cinematic lived-in world matching the story'
}

function extractConflict(idea: string): string {
  if (/\bfaith\b|\bdestiny/i.test(idea)) {
    return 'Belief is tested against hardship and doubt'
  }
  if (/\bpoor\b|\brich/i.test(idea)) {
    return 'Scarcity and circumstance stand against the dream'
  }
  return `Inner and outer obstacles threaten the promise of: ${idea.slice(0, 80)}`
}

function extractEnding(idea: string): string {
  if (/\bchanges?\s+(his|her|their)\s+destiny/i.test(idea)) {
    return 'Faith transforms fate — a quiet, powerful triumph'
  }
  return 'A earned resolution that lands emotionally and leaves hope'
}

/** STEP 1 — Understand the idea (automatic, no user prompts). */
export function understandStoryIdea(input: {
  idea: string
  durationSec?: number
  language?: string
  platform?: string
  audience?: string
}): StoryUnderstanding {
  const idea = input.idea.trim()
  const intent = parseCreatorIntentSync(idea)
  return {
    idea: intent.cleanTopic || idea,
    genre: detectGenre(idea),
    emotion: detectEmotion(idea),
    audience: input.audience?.trim() || 'General creators & story lovers',
    language: input.language?.trim() || 'en',
    platform: input.platform?.trim() || intent.platform || 'youtube_short',
    lengthSec: clampV4DurationSec(input.durationSec ?? 60),
    characters: extractCharacters(idea),
    setting: extractSetting(idea),
    conflict: extractConflict(idea),
    ending: extractEnding(idea),
  }
}
