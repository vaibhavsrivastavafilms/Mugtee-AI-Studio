/**
 * AGENT 4 — Character Director
 * MAIN characters only. Pixar-inspired stylised 3D turnaround sheets.
 */

import { buildCharacterBible } from '@/lib/production-os/v4/character-bible'
import type {
  CharacterBibleEntry,
  CreativeBrief,
  ProductionScreenplayScene,
} from '@/lib/mugtee-agents/types'

const STYLE =
  'Pixar-inspired stylised 3D animation, soft subsurface lighting, expressive eyes, family-friendly, child-safe, production-ready character sheet'

function isSacredFigure(name: string): boolean {
  return /jagannath|krishna|durga|hanuman|devi|ji\b/i.test(name)
}

function buildMainEntry(name: string, brief: CreativeBrief): CharacterBibleEntry {
  const sacred = isSacredFigure(name)
  const age = sacred
    ? 'timeless divine presence (stylised, non-photoreal)'
    : /\bdevotee\b|\bboy\b|\bgirl\b|\bchild/i.test(name) ||
        /\bdevotee\b|\bboy\b|\bgirl\b/i.test(brief.idea)
      ? '10–14'
      : '22–32'

  const appearance = sacred
    ? [
        'stylised divine form with warm compassionate eyes',
        'soft glowing aura, ornate but gentle jewellery',
        'reverent Pixar-inspired 3D design, never frightening',
        'family-friendly sacred portrayal',
      ].join(', ')
    : [
        'warm large expressive eyes',
        /\bvillage|india|temple|puri|jagannath/i.test(brief.setting)
          ? 'South Asian features, soft stylised skin'
          : 'soft stylised naturalistic features',
        'Pixar-inspired proportions, appealing silhouette',
        'family-friendly, child-safe',
      ].join(', ')

  const hair = sacred
    ? 'stylised traditional crown / hair ornament, identical in every frame'
    : 'neat dark hair with locked parting and volume in every frame'

  const outfit = sacred
    ? 'ornate yellow-saffron sacred garments with soft gold accents, locked design'
    : /\bvillage|temple|india|puri/i.test(brief.setting)
      ? 'simple cotton kurta in soft earth tones, worn but clean, locked colours'
      : 'simple everyday clothing in locked colour palette'

  const accessories = sacred
    ? 'gentle tilak, soft sacred ornaments — never weapons'
    : /faith|destiny|devotee|jagannath/i.test(brief.idea)
      ? 'simple prayer beads'
      : 'none — silhouette locked'

  const bodyShape = sacred
    ? 'dignified stylised divine proportions'
    : String(age).startsWith('10')
      ? 'youthful slim Pixar-style build'
      : 'appealing adult Pixar-style proportions'

  const base = buildCharacterBible({
    characterDescription: [
      name,
      appearance,
      `Age ${age}.`,
      `Hair: ${hair}.`,
      `Outfit: ${outfit}.`,
      `Accessories: ${accessories}.`,
      `Body: ${bodyShape}.`,
      STYLE,
      `Genre ${brief.genre}. Theme: ${brief.theme}.`,
      'Identical face, hair, outfit, proportions in every scene.',
    ].join(' '),
    title: name,
    voiceStyle:
      brief.language?.toLowerCase().startsWith('en')
        ? 'Warm clear dialogue — emotional and sincere'
        : 'Warm Hindi dialogue — emotional, clear, family-friendly',
  })

  const referencePrompt = [
    'Ultra detailed English character reference sheet,',
    STYLE + ',',
    'pure white seamless background, studio softbox lighting,',
    `character name ${name}, age ${age}, ${appearance},`,
    `hair ${hair}, outfit ${outfit}, accessories ${accessories}, body ${bodyShape},`,
    'consistent design bible, production ready, no watermark, no photoreal skin pores.',
  ].join(' ')

  const turnaroundPrompt = [
    referencePrompt,
    'full-body orthographic turnaround: Front, Back, Left, Right views side by side,',
    'identical design across all views, labelled view markers only.',
  ].join(' ')

  const faceLock = `${name}: ${appearance}; hair ${hair}; outfit ${outfit}`

  return {
    ...base,
    name,
    age,
    appearance,
    personality: sacred
      ? 'Compassionate, serene, quietly powerful, benevolent'
      : 'Hopeful, brave, emotionally open, kind',
    accessories,
    bodyShape,
    face: faceLock,
    hair,
    outfit,
    referencePrompt,
    turnaroundPrompt,
    animationStyle: 'pixar_stylised_3d',
    negativePrompt: [
      base.negativePrompt,
      'photoreal horror',
      'gore',
      'nsfw',
      'weapons',
      'scary deity',
      'inconsistent face',
      'wardrobe change',
      'age drift',
      'text overlay',
      'watermark',
    ].join(', '),
    expressions: ['happy', 'angry', 'shocked', 'warm neutral'],
    turnaround: {
      front: `${turnaroundPrompt} View: FRONT.`,
      back: `${turnaroundPrompt} View: BACK.`,
      left: `${turnaroundPrompt} View: LEFT PROFILE.`,
      right: `${turnaroundPrompt} View: RIGHT PROFILE.`,
    },
    expressionSheet: {
      happy: `${faceLock}, soft genuine smile, bright eyes, ${STYLE}, white background`,
      angry: `${faceLock}, controlled frustration, furrowed brows, never frightening, ${STYLE}, white background`,
      shocked: `${faceLock}, widened eyes, raised brows, soft surprise, ${STYLE}, white background`,
    },
  }
}

/** AGENT 4 — MAIN characters only. */
export function runCharacterDirector(
  brief: CreativeBrief,
  _screenplay: ProductionScreenplayScene[]
): CharacterBibleEntry[] {
  const names = brief.mainCharacters.length
    ? brief.mainCharacters
    : ['Protagonist']
  return names.slice(0, 3).map((n) => buildMainEntry(n, brief))
}
