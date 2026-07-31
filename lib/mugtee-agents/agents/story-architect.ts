/**
 * AGENT 2 — Story Engine
 * Original story only — never copy scripts or copyrighted dialogue.
 * Hindi, dialogue-driven, family-friendly. Scene pacing: 8–10 seconds.
 */

import type { CreativeBrief, StoryEngineOutput } from '@/lib/mugtee-agents/types'

const SEC_PER_SCENE_MIN = 8
const SEC_PER_SCENE_MAX = 10

export function sceneCountForDuration(durationSec: number): number {
  const avg = (SEC_PER_SCENE_MIN + SEC_PER_SCENE_MAX) / 2
  return Math.max(4, Math.min(22, Math.round(durationSec / avg)))
}

function hindiDialogue(brief: CreativeBrief, beat: 'open' | 'rise' | 'climax' | 'end'): string {
  const lead = brief.mainCharacters[0] ?? 'भक्त'
  const sacred = brief.mainCharacters.find((c) => /jagannath|krishna|ji/i.test(c))
  switch (beat) {
    case 'open':
      return sacred
        ? `${lead}: हे ${sacred}, आज भी मेरा विश्वास वही है… एक दिन सब बदल जाएगा।`
        : `${lead}: माँ, आज भी सपना वही है… एक दिन सब बदल जाएगा।`
    case 'rise':
      return `${lead}: डर लगता है… पर विश्वास छोड़ूँगा नहीं।`
    case 'climax':
      return sacred
        ? `${lead}: हे ${sacred}, अगर ईमान बाकी है, तो किस्मत भी रास्ता देगी!`
        : `${lead}: अगर ईमान बाकी है, तो किस्मत भी रास्ता देगी!`
    case 'end':
      return `${lead}: देखो… विश्वास ने सच में रास्ता खोल दिया।`
  }
}

function englishDialogue(brief: CreativeBrief, beat: 'open' | 'rise' | 'climax' | 'end'): string {
  const lead = brief.mainCharacters[0] ?? 'Protagonist'
  switch (beat) {
    case 'open':
      return `${lead}: I still believe tomorrow can be different.`
    case 'rise':
      return `${lead}: I'm afraid… but I won't let go of hope.`
    case 'climax':
      return `${lead}: If faith remains, destiny will open a door!`
    case 'end':
      return `${lead}: See… belief really did change everything.`
  }
}

function dialogueFor(
  brief: CreativeBrief,
  beat: 'open' | 'rise' | 'climax' | 'end'
): string {
  const lang = (brief.language || 'hi').toLowerCase()
  if (lang.startsWith('en')) return englishDialogue(brief, beat)
  return hindiDialogue(brief, beat)
}

/** AGENT 2 — original story inspired only by the user's idea (never a copy). */
export function runStoryEngine(brief: CreativeBrief): StoryEngineOutput {
  const lead = brief.mainCharacters[0] ?? 'Protagonist'
  const preserved = brief.mainCharacters.slice(1).join(', ')
  const count = sceneCountForDuration(brief.durationSec)
  const baseDur = brief.durationSec / count

  const beginning = `In ${brief.setting}, we meet ${lead}. Original tale sparked by: ${brief.idea}${preserved ? ` Preserved figures: ${preserved}.` : ''}`
  const middle = `${lead} faces ${brief.conflict.toLowerCase()}. Natural conversations deepen ${brief.emotion}.`
  const climax = `At the turning point, ${lead} must choose courage over fear. Theme: ${brief.theme}.`
  const ending = `${brief.ending} Moral: ${brief.moral}`

  const story = [
    beginning,
    middle,
    climax,
    ending,
    'ORIGINAL story — not based on any existing film or copyrighted script.',
    'Tone: Hindi dialogue-driven, emotional, family-friendly, child-safe.',
    `Style: ${brief.animationStyle}. Platform: ${brief.platform}. Genre: ${brief.genre}.`,
  ].join('\n\n')

  const sceneList = Array.from({ length: count }, (_, i) => {
    const sceneNumber = i + 1
    const t = i / Math.max(1, count - 1)
    const beat: 'open' | 'rise' | 'climax' | 'end' =
      t < 0.2 ? 'open' : t < 0.65 ? 'rise' : t < 0.88 ? 'climax' : 'end'
    const summary =
      beat === 'open'
        ? beginning
        : beat === 'rise'
          ? middle
          : beat === 'climax'
            ? climax
            : ending
    return {
      sceneNumber,
      summary: summary.slice(0, 220),
      dialogue: dialogueFor(brief, beat),
      durationSec: Math.max(
        SEC_PER_SCENE_MIN,
        Math.min(SEC_PER_SCENE_MAX, Math.round(baseDur * 10) / 10)
      ),
    }
  })

  // Fit total duration on last scene
  const used = sceneList.slice(0, -1).reduce((s, x) => s + x.durationSec, 0)
  const last = sceneList[sceneList.length - 1]
  if (last) {
    last.durationSec = Math.max(
      SEC_PER_SCENE_MIN,
      Math.round((brief.durationSec - used) * 10) / 10
    )
  }

  return {
    story,
    dialogueLanguage: brief.language || 'hi',
    familyFriendly: true,
    childSafe: true,
    original: true,
    sceneList,
    beginning,
    middle,
    climax,
    ending,
  }
}

/** @deprecated Use runStoryEngine */
export const runStoryArchitect = runStoryEngine
