/**
 * Scene-specific V7 image prompt specification — pure logic, no generation.
 */

import type { V7CharacterBible } from '@/agents/v7/character-director.server'
import type { V7CreativeBrief } from '@/types/v7/production'
import type { V7CreativeDirection } from '@/agents/v7/creative-director.server'
import type { V7ScriptDocument } from '@/agents/v7/script-writer.server'
import type { V7StoryboardDocument } from '@/agents/v7/storyboard.server'
import type { V7WorldBible } from '@/agents/v7/world-builder.server'

export type V7ScriptScene = V7ScriptDocument['scenes'][number]
export type V7StoryboardShot = V7StoryboardDocument['scenes'][number]['shots'][number]

function resolveStoryboardCamera(shot?: V7StoryboardShot, scriptScene?: V7ScriptScene): string {
  return (
    shot?.composition?.trim() ||
    shot?.camera?.trim() ||
    scriptScene?.camera?.trim() ||
    'Medium shot'
  )
}

export const V7_IMAGE_PROMPT_MIN_SCORE = 85

function textOverlayEnabled(): boolean {
  const raw = process.env.SHOW_ON_SCREEN_TEXT?.trim().toLowerCase()
  if (raw === 'false' || raw === '0' || raw === 'off' || raw === 'no') return false
  return true
}

export type V7SceneImageSpec = {
  sceneNumber: number
  duration: number
  purpose: string
  subject: string
  action: string
  location: string
  characters: string[]
  objects: string[]
  environment: string
  camera: string
  composition: string
  lighting: string
  time: string
  visualStyle: string
  continuity: string
  forbiddenElements: string[]
  requiredPromptTerms: string[]
  isGraphicScene: boolean
  isMacroFoodScene: boolean
  isHandActionScene: boolean
}

export type V7SceneImagePromptPackage = {
  spec: V7SceneImageSpec
  prompt: string
  negativePrompt: string
  score: V7SceneImagePromptScore
}

export type V7SceneImagePromptScore = {
  subjectRelevance: number
  actionRelevance: number
  objectRelevance: number
  locationRelevance: number
  characterRelevance: number
  compositionRelevance: number
  overall: number
}

export type V7SceneImagePromptValidation = {
  valid: boolean
  sceneNumber: number
  missingRequirements: string[]
  forbiddenTermsFound: string[]
  score: V7SceneImagePromptScore
  finalPrompt: string
  negativePrompt: string
}

const GRAPHIC_LOCATION_PATTERN = /graphic|overlay|cta|title\s*card/i
const KITCHEN_LOCATION_PATTERN = /kitchen|plating|macro/i
const DINING_LOCATION_PATTERN = /dining\s*room|restaurant/i

/** Macro food shots use plating-station wording — never "kitchen" in the positive prompt. */
function sanitizeMacroFoodLocation(location: string): string {
  return location
    .replace(/restaurant\s+kitchen\s*\/\s*plating\s+station/gi, 'Restaurant plating station')
    .replace(/\bkitchen\s*\/\s*plating\s+station/gi, 'plating station')
    .replace(/\bcommercial\s+kitchen\b/gi, 'plating station')
    .replace(/\bkitchen\b/gi, 'plating station')
    .replace(/\s+/g, ' ')
    .trim()
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'of',
  'in',
  'on',
  'at',
  'to',
  'for',
  'with',
  'over',
  'into',
  'from',
  'is',
  'are',
  'be',
  'being',
  'shot',
  'scene',
  'slow',
  'motion',
  'frame',
])

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Human-subject terms that may appear negated in faceless documentary style lines. */
const NEGATABLE_HUMAN_SUBJECT_TERMS = new Set(['people', 'person', 'crowd', 'couple'])

/**
 * Strip allowed faceless negations before forbidden-term checks.
 * "no visible people" must not count as a positive "people" subject.
 */
function stripAllowedFacelessNegations(text: string): string {
  return text
    .replace(/\bno visible people\b/g, ' ')
    .replace(/\bwithout visible people\b/g, ' ')
    .replace(/\bno people\b/g, ' ')
    .replace(/\bwithout people\b/g, ' ')
    .replace(/\bno visible person\b/g, ' ')
    .replace(/\bwithout person\b/g, ' ')
    .replace(/\bno person\b/g, ' ')
    .replace(/\bno visible crowd\b/g, ' ')
    .replace(/\bwithout crowd\b/g, ' ')
    .replace(/\bno crowd\b/g, ' ')
    .replace(/\bno visible couple\b/g, ' ')
    .replace(/\bwithout couple\b/g, ' ')
    .replace(/\bno couple\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isNegatableHumanSubjectTerm(term: string): boolean {
  const needle = normalizeToken(term)
  if (!needle) return false
  if (NEGATABLE_HUMAN_SUBJECT_TERMS.has(needle)) return true
  return needle.split(/\s+/).every((part) => NEGATABLE_HUMAN_SUBJECT_TERMS.has(part))
}

function promptContainsTerm(prompt: string, term: string): boolean {
  const hay = normalizeToken(prompt)
  const needle = normalizeToken(term)
  if (!needle) return false
  if (hay.includes(needle)) return true
  return needle.split(/\s+/).filter(Boolean).every((part) => hay.includes(part))
}

/** Forbidden positive-subject check — ignores negated faceless instructions. */
function promptContainsForbiddenPositiveTerm(prompt: string, term: string): boolean {
  const needle = normalizeToken(term)
  if (!needle) return false
  let hay = normalizeToken(prompt)
  if (isNegatableHumanSubjectTerm(needle)) {
    hay = stripAllowedFacelessNegations(hay)
  }
  // Require contiguous phrase match — do not match scattered tokens (e.g. "looking"
  // in "overlooking" + "at" + "Camera:" falsely hits "looking at camera").
  return hay.includes(needle)
}

function extractActionKeywords(action: string): string[] {
  return action
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
    .slice(0, 8)
}

function extractObjectsFromAction(action: string): string[] {
  const found = new Set<string>()
  const patterns: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\bsteak\b/i, label: 'steak' },
    { pattern: /\bcast iron\b/i, label: 'cast iron pan' },
    { pattern: /\boil\b/i, label: 'oil droplet' },
    { pattern: /\bherb powder\b/i, label: 'herb powder' },
    { pattern: /\bemulsion\b/i, label: 'emulsion' },
    { pattern: /\bdemi-glace\b/i, label: 'demi-glace' },
    { pattern: /\bprotein\b/i, label: 'protein' },
    { pattern: /\bcrystal glasses\b/i, label: 'crystal wine glasses' },
    { pattern: /\bglasses\b/i, label: 'wine glasses' },
    { pattern: /\btweezers\b/i, label: 'culinary tweezers' },
    { pattern: /\bmicro-herb\b/i, label: 'micro-herb' },
    { pattern: /\bceramic plate\b/i, label: 'artisanal ceramic plate' },
    { pattern: /\bplate\b/i, label: 'plate' },
    { pattern: /\bsteam\b/i, label: 'rising steam' },
    { pattern: /\bdish\b/i, label: 'finished plated dish' },
    { pattern: /\blogo\b/i, label: 'minimalist logo' },
    { pattern: /\btypography\b/i, label: 'serif typography' },
    { pattern: /\bsizzl/i, label: 'sizzling' },
    { pattern: /\bsear/i, label: 'searing meat' },
    { pattern: /\bsauce\b/i, label: 'sauce' },
    { pattern: /\bspice/i, label: 'spices' },
    { pattern: /\bmontage\b/i, label: 'montage' },
    { pattern: /\bpour/i, label: 'pouring' },
    { pattern: /\bdust/i, label: 'dusting' },
  ]

  for (const entry of patterns) {
    if (entry.pattern.test(action)) found.add(entry.label)
  }

  return [...found]
}

export function matchSceneCharactersToBible(
  sceneCharacterNames: string[],
  bible: V7CharacterBible | null | undefined
): V7CharacterBible['characters'] {
  if (sceneCharacterNames.length === 0 || !bible?.characters?.length) return []

  return bible.characters.filter((character) =>
    sceneCharacterNames.some((sceneName) => characterMatchesSceneName(sceneName, character))
  )
}

export function characterMatchesSceneName(
  sceneName: string,
  character: V7CharacterBible['characters'][number]
): boolean {
  const scene = sceneName.toLowerCase().trim()
  const name = character.name.toLowerCase()
  const role = character.role.toLowerCase()

  if (name === scene || name.includes(scene) || scene.includes(name)) return true
  if (role.includes(scene) || scene.includes(role)) return true
  if (scene.includes('chef') && (name.includes('chef') || role.includes('chef'))) return true
  if (scene.includes('couple') && (name.includes('couple') || role.includes('diner'))) return true
  if (scene.includes('elegant') && name.includes('couple')) return true
  return false
}

function resolveWorldLocation(
  world: V7WorldBible | null | undefined,
  location: string
): V7WorldBible['locations'][number] | null {
  const normalizedLocation = location.trim().toLowerCase()
  if (!world?.locations?.length) return null

  if (GRAPHIC_LOCATION_PATTERN.test(location)) return null

  const ranked = world.locations
    .map((entry) => {
      const name = entry.name.trim().toLowerCase()
      let score = 0
      if (normalizedLocation.includes(name) || name.includes(normalizedLocation)) score += 3
      if (DINING_LOCATION_PATTERN.test(normalizedLocation) && /dining|room|restaurant/i.test(name)) {
        score += 2
      }
      if (KITCHEN_LOCATION_PATTERN.test(normalizedLocation) && /kitchen|macro|plating/i.test(name)) {
        score += 2
      }
      return { entry, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  return ranked[0]?.entry ?? null
}

function buildSceneCharacterBlock(params: {
  sceneCharacters: string[]
  bible: V7CharacterBible | null | undefined
  handActionScene: boolean
}): string | null {
  const matched = matchSceneCharactersToBible(params.sceneCharacters, params.bible)
  if (matched.length === 0) return null

  return matched
    .map((character) => {
      if (params.handActionScene) {
        return [
          `${character.name} hand only`,
          `wardrobe ${character.costume}`,
          `accessories ${character.accessories.join(', ') || 'none'}`,
          'face not visible',
          'hands and action only',
        ].join('; ')
      }

      if (params.sceneCharacters.some((name) => /couple|diner|guest/i.test(name))) {
        return [
          `${character.name}`,
          `costume ${character.costume}`,
          `expressions ${character.expressions.join(', ') || 'natural'}`,
          'couple interacting naturally',
          'not looking at camera',
        ].join('; ')
      }

      return [
        `${character.name} (${character.role})`,
        `costume ${character.costume}`,
        `accessories ${character.accessories.join(', ') || 'none'}`,
      ].join('; ')
    })
    .join('. ')
}

function buildSceneEnvironmentBlock(params: {
  spec: Pick<V7SceneImageSpec, 'location' | 'lighting' | 'time' | 'visualStyle' | 'objects' | 'isGraphicScene'>
  world: V7WorldBible | null | undefined
}): string {
  if (params.spec.isGraphicScene) {
    return [
      'Minimalist dark luxury graphic design background',
      'elegant serif typography layout space',
      'subtle vignette',
      'non-photographic end card',
      'abstract dark textured backdrop',
    ].join(', ')
  }

  const matched = resolveWorldLocation(params.world, params.spec.location)
  if (matched) {
    return [
      matched.name,
      matched.architecture,
      `props ${matched.props.slice(0, 4).join(', ') || 'scene-specific props'}`,
      `textures ${matched.textures.slice(0, 3).join(', ') || 'natural materials'}`,
      params.spec.lighting,
      params.spec.time,
    ]
      .filter(Boolean)
      .join('. ')
  }

  return [
    params.spec.location,
    params.spec.lighting,
    params.spec.time,
    params.spec.visualStyle,
  ]
    .filter(Boolean)
    .join('. ')
}

function deriveForbiddenElements(params: {
  sceneCharacters: string[]
  location: string
  isGraphicScene: boolean
  isMacroFoodScene: boolean
  isHandActionScene: boolean
  isMontageScene: boolean
  isDiningScene: boolean
}): string[] {
  const forbidden = new Set<string>([
    'watermark',
    'cartoon',
    'anime',
    'low resolution',
    'duplicate limbs',
    'extra fingers',
  ])

  if (params.sceneCharacters.length === 0) {
    forbidden.add('chef portrait')
    forbidden.add('headshot')
    forbidden.add('face close-up')
    forbidden.add('human portrait')
    forbidden.add('looking at camera')
    forbidden.add('generic stock portrait')
    if (params.isMacroFoodScene) {
      forbidden.add('people')
      forbidden.add('couple')
      forbidden.add('dining room portrait')
    }
  }

  if (params.isHandActionScene) {
    forbidden.add('chef portrait')
    forbidden.add('full-body chef portrait')
    forbidden.add('face close-up')
  }

  if (
    params.isDiningScene &&
    !params.isMacroFoodScene &&
    !params.sceneCharacters.some((name) => /couple|diner/i.test(name))
  ) {
    forbidden.add('chef portrait')
    forbidden.add('kitchen')
  }

  if (params.sceneCharacters.some((name) => /couple|diner|elegant/i.test(name))) {
    forbidden.add('chef portrait')
    forbidden.add('kitchen')
    forbidden.add('plating station')
    forbidden.add('food preparation close-up')
  }

  if (params.isMontageScene) {
    forbidden.add('static chef portrait')
    forbidden.add('couple portrait')
    forbidden.add('headshot')
  }

  if (params.isGraphicScene) {
    forbidden.add('chef portrait')
    forbidden.add('people')
    forbidden.add('kitchen')
    forbidden.add('restaurant interior')
    forbidden.add('portrait')
    forbidden.add('human face')
  }

  if (KITCHEN_LOCATION_PATTERN.test(params.location) && !params.isGraphicScene) {
    forbidden.add('generic restaurant portrait')
  }

  return [...forbidden]
}

export function buildV7SceneImageSpec(params: {
  sceneNumber: number
  sceneId: string
  productionId: string
  scriptScene?: V7ScriptScene
  shot?: V7StoryboardShot
  brief: V7CreativeBrief
  direction: V7CreativeDirection
  characterBible?: V7CharacterBible | null
  worldBible?: V7WorldBible | null
}): V7SceneImageSpec {
  const scriptScene = params.scriptScene
  const shot = params.shot
  const action = normalizeText(scriptScene?.action ?? scriptScene?.narration ?? shot?.composition ?? '')
  const rawLocation = normalizeText(scriptScene?.location ?? params.brief.location ?? 'On location')
  const sceneCharacters = [...new Set((scriptScene?.characters ?? []).filter(Boolean))]
  const composition = normalizeText(shot?.composition ?? '')
  const camera = resolveStoryboardCamera(shot, scriptScene)
  const lighting = normalizeText(shot?.lighting ?? scriptScene?.lighting ?? params.direction.lighting)
  const isGraphicScene = GRAPHIC_LOCATION_PATTERN.test(rawLocation)
  const isMacroFoodScene =
    sceneCharacters.length === 0 &&
    !isGraphicScene &&
    (KITCHEN_LOCATION_PATTERN.test(rawLocation) ||
      /\bmacro\b/i.test(action) ||
      /\bsteak\b|\bdemi-glace\b|\btweezers\b|\bsizzl/i.test(action))
  const location = isMacroFoodScene ? sanitizeMacroFoodLocation(rawLocation) : rawLocation
  const isDiningScene = DINING_LOCATION_PATTERN.test(location)
  const isHandActionScene =
    sceneCharacters.some((name) => /chef/i.test(name)) &&
    /\bhand\b|\btweezers\b|\bdust/i.test(action)
  const isMontageScene = /\bmontage\b|\brapid\b|\bmultiple\b/i.test(action)

  const objects = extractObjectsFromAction(action)
  const worldLocation = resolveWorldLocation(params.worldBible ?? null, location)
  if (worldLocation) {
    for (const object of worldLocation.objects.slice(0, 3)) {
      if (sceneCharacters.length === 0 && /couple|diner|guest|chef/i.test(object)) continue
      if (
        /\bglass|\bwine|\bstemware|\bflute/i.test(object) &&
        !/\bglass|\bwine|\bclink|\btoast|\bpour|\bstemware/i.test(`${action} ${composition}`)
      ) {
        continue
      }
      if (!objects.some((entry) => promptContainsTerm(entry, object))) objects.push(object)
    }
  }

  const subject = isGraphicScene
    ? 'Minimalist luxury graphic CTA card'
    : composition || action.split('.')[0] || action

  const requiredPromptTerms = [
    ...objects.map((object) => object.toLowerCase()),
    ...extractActionKeywords(action).slice(0, 4),
    normalizeToken(location).split(/\s+/).filter((part) => part.length > 3)[0] ?? '',
  ].filter(Boolean)

  if (isMacroFoodScene) requiredPromptTerms.push('macro')
  if (isGraphicScene) {
    requiredPromptTerms.push('graphic', 'minimalist logo')
    if (textOverlayEnabled()) {
      requiredPromptTerms.push('book your table', 'link in bio')
    }
  }
  if (sceneCharacters.some((name) => /couple|diner|elegant/i.test(name))) {
    requiredPromptTerms.push('couple')
    const mentionsGlasses =
      /\bglasses\b|\bcrystal glass|\bwine glass|\bstemware|\bclink/i.test(action) ||
      /\bglasses\b|\bcrystal glass|\bwine glass|\bstemware/i.test(composition)
    if (mentionsGlasses) {
      requiredPromptTerms.push('glasses')
    }
  }

  const forbiddenElements = deriveForbiddenElements({
    sceneCharacters,
    location,
    isGraphicScene,
    isMacroFoodScene,
    isHandActionScene,
    isMontageScene,
    isDiningScene,
  })

  return {
    sceneNumber: params.sceneNumber,
    duration: scriptScene?.duration ?? shot?.timing ?? 5,
    purpose: scriptScene?.title ?? `Scene ${params.sceneNumber}`,
    subject,
    action,
    location,
    characters: sceneCharacters,
    objects,
    environment: buildSceneEnvironmentBlock({
      spec: {
        location,
        lighting,
        time: worldLocation?.timeOfDay ?? 'Night',
        visualStyle: params.brief.style,
        objects,
        isGraphicScene,
      },
      world: params.worldBible ?? null,
    }),
    camera,
    composition,
    lighting,
    time: worldLocation?.timeOfDay ?? 'Night',
    visualStyle: params.brief.style,
    continuity: `${params.productionId}:scene-${params.sceneNumber}`,
    forbiddenElements,
    requiredPromptTerms: [...new Set(requiredPromptTerms)],
    isGraphicScene,
    isMacroFoodScene,
    isHandActionScene,
  }
}

export function buildV7SceneImagePromptFromSpec(params: {
  spec: V7SceneImageSpec
  aspectRatio: string
  characterBible?: V7CharacterBible | null
  worldBible?: V7WorldBible | null
  narration?: string
  emotion?: string
  lens?: string
  movement?: string
}): { prompt: string; negativePrompt: string } {
  const { spec } = params
  const characterBlock = buildSceneCharacterBlock({
    sceneCharacters: spec.characters,
    bible: params.characterBible ?? null,
    handActionScene: spec.isHandActionScene,
  })

  const promptParts = [
    spec.isMacroFoodScene
      ? 'Extreme macro food cinematography, commercial gastronomy hero shot, shallow depth of field.'
      : null,
    spec.isGraphicScene
      ? 'Minimalist luxury graphic design composition for a restaurant advertisement end card.'
      : null,
    `Primary action: ${spec.action}`,
    `Primary subject: ${spec.subject}`,
    spec.objects.length > 0 ? `Required objects visible: ${spec.objects.join(', ')}` : null,
    `Setting: ${spec.location}`,
    spec.composition ? `Composition: ${spec.composition}` : null,
    `Camera: ${spec.camera}`,
    params.lens ? `Lens: ${params.lens}` : null,
    `Lighting: ${spec.lighting}`,
    params.emotion ? `Mood: ${params.emotion}` : null,
    params.movement ? `Camera movement intent: ${params.movement}` : null,
    `Environment: ${spec.environment}`,
    characterBlock ? `Characters (scene-required only): ${characterBlock}` : null,
    `Visual style: ${spec.visualStyle}`,
    `Aspect ratio: ${params.aspectRatio} vertical commercial frame`,
    'Photorealistic live-action cinematography, high dynamic range, film grain, anamorphic bokeh.',
    spec.isGraphicScene
      ? textOverlayEnabled()
        ? 'Required text: "Book your table via the link in bio".'
        : 'No on-screen text, captions, subtitles, or typography — brand logo mark only on a warm abstract background.'
      : params.narration
        ? `Story context: ${params.narration}`
        : null,
  ].filter(Boolean)

  const negativeTerms = [
    ...new Set(
      [
        ...spec.forbiddenElements,
        spec.characters.length === 0 ? 'people, couple, portrait, face, headshot' : null,
        spec.isGraphicScene ? 'text overlay, captions, subtitles, typography, words, letters' : null,
        spec.isMacroFoodScene ? 'chef portrait, dining room portrait, human face' : null,
      ].filter(Boolean)
    ),
  ]

  const negativePrompt = negativeTerms.join(', ')

  return {
    prompt: promptParts.join('\n'),
    negativePrompt,
  }
}

export function scoreV7SceneImagePrompt(params: {
  spec: V7SceneImageSpec
  prompt: string
  negativePrompt: string
  characterBible?: V7CharacterBible | null
}): V7SceneImagePromptScore {
  const prompt = params.prompt
  const negative = params.negativePrompt

  const objectHits =
    params.spec.objects.length === 0
      ? 1
      : params.spec.objects.filter((object) => promptContainsTerm(prompt, object)).length /
        params.spec.objects.length

  const actionHits =
    extractActionKeywords(params.spec.action).length === 0
      ? 1
      : extractActionKeywords(params.spec.action).filter((term) => promptContainsTerm(prompt, term))
          .length / extractActionKeywords(params.spec.action).length

  const locationHits = promptContainsTerm(prompt, params.spec.location) ? 1 : 0.5
  const compositionHits = params.spec.composition
    ? promptContainsTerm(prompt, params.spec.composition)
      ? 1
      : 0.4
    : 0.8

  let characterHits = 1
  if (params.spec.characters.length === 0) {
    const bibleNames = params.characterBible?.characters?.map((entry) => entry.name) ?? []
    const leaked = bibleNames.filter((name) => promptContainsTerm(prompt, name))
    characterHits = leaked.length === 0 ? 1 : Math.max(0, 1 - leaked.length * 0.35)
    if (/\bchef julian\b/i.test(prompt) && !params.spec.characters.some((name) => /chef/i.test(name))) {
      characterHits = Math.min(characterHits, 0.2)
    }
    if (
      /\bsophisticated couple\b/i.test(prompt) &&
      !params.spec.characters.some((name) => /couple/i.test(name))
    ) {
      characterHits = Math.min(characterHits, 0.2)
    }
  } else {
    characterHits = params.spec.characters.every((name) => promptContainsTerm(prompt, name)) ? 1 : 0.7
  }

  const subjectHits = promptContainsTerm(prompt, params.spec.subject) ? 1 : 0.6

  const forbiddenInPositive = params.spec.forbiddenElements.filter((term) =>
    promptContainsForbiddenPositiveTerm(prompt, term)
  )
  const penalty = forbiddenInPositive.length * 8
  const negativeCoverage = params.spec.forbiddenElements.some((term) => promptContainsTerm(negative, term))
    ? 1
    : 0.7

  const subjectRelevance = Math.round(Math.min(100, subjectHits * 100))
  const actionRelevance = Math.round(Math.min(100, actionHits * 100))
  const objectRelevance = Math.round(Math.min(100, objectHits * 100))
  const locationRelevance = Math.round(Math.min(100, locationHits * 100))
  const characterRelevance = Math.round(Math.min(100, characterHits * 100))
  const compositionRelevance = Math.round(Math.min(100, compositionHits * 100))

  const rawOverall =
    (subjectRelevance +
      actionRelevance +
      objectRelevance +
      locationRelevance +
      characterRelevance +
      compositionRelevance) /
      6 +
    (negativeCoverage >= 1 ? 0 : -5) -
    penalty

  return {
    subjectRelevance,
    actionRelevance,
    objectRelevance,
    locationRelevance,
    characterRelevance,
    compositionRelevance,
    overall: Math.max(0, Math.min(100, Math.round(rawOverall))),
  }
}

export function validateV7SceneImagePrompt(params: {
  spec: V7SceneImageSpec
  prompt: string
  negativePrompt: string
  characterBible?: V7CharacterBible | null
}): V7SceneImagePromptValidation {
  const score = scoreV7SceneImagePrompt(params)
  const missingRequirements = params.spec.requiredPromptTerms.filter(
    (term) => !promptContainsTerm(params.prompt, term)
  )

  const forbiddenTermsFound = params.spec.forbiddenElements.filter((term) =>
    promptContainsForbiddenPositiveTerm(params.prompt, term)
  )

  if (params.spec.characters.length === 0) {
    for (const character of params.characterBible?.characters ?? []) {
      const name = character.name.trim()
      if (name.length >= 8 && promptContainsTerm(params.prompt, name)) {
        forbiddenTermsFound.push(name)
      }
    }
  }

  if (params.spec.isGraphicScene) {
    for (const term of ['kitchen', 'cast iron pan', 'restaurant interior']) {
      if (promptContainsTerm(params.prompt, term)) forbiddenTermsFound.push(term)
    }
  }

  const valid =
    missingRequirements.length === 0 &&
    forbiddenTermsFound.length === 0 &&
    score.overall >= V7_IMAGE_PROMPT_MIN_SCORE

  return {
    valid,
    sceneNumber: params.spec.sceneNumber,
    missingRequirements,
    forbiddenTermsFound: [...new Set(forbiddenTermsFound)],
    score,
    finalPrompt: params.prompt,
    negativePrompt: params.negativePrompt,
  }
}

export function buildV7SceneImagePromptPackages(params: {
  brief: V7CreativeBrief
  direction: V7CreativeDirection
  script: V7ScriptDocument
  storyboard: V7StoryboardDocument
  scenes: Array<{ id: string; number: number }>
  productionId: string
  characterBible?: V7CharacterBible | null
  worldBible?: V7WorldBible | null
}): V7SceneImagePromptPackage[] {
  return params.scenes
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((scene) => {
      const scriptScene = params.script.scenes.find((entry) => entry.number === scene.number)
      const board = params.storyboard.scenes.find((entry) => entry.number === scene.number)
      const shot = board?.shots?.[0]
      const spec = buildV7SceneImageSpec({
        sceneNumber: scene.number,
        sceneId: scene.id,
        productionId: params.productionId,
        scriptScene,
        shot,
        brief: params.brief,
        direction: params.direction,
        characterBible: params.characterBible,
        worldBible: params.worldBible,
      })
      const { prompt, negativePrompt } = buildV7SceneImagePromptFromSpec({
        spec,
        aspectRatio: params.brief.aspectRatio ?? '9:16',
        characterBible: params.characterBible,
        worldBible: params.worldBible,
        narration: scriptScene?.narration,
        emotion: shot?.emotion ?? scriptScene?.emotion,
        lens: shot?.lens,
        movement: shot?.movement ?? scriptScene?.movement,
      })
      const score = scoreV7SceneImagePrompt({
        spec,
        prompt,
        negativePrompt,
        characterBible: params.characterBible,
      })

      return { spec, prompt, negativePrompt, score }
    })
}
