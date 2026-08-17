import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildV7SceneImagePromptFromSpec,
  buildV7SceneImageSpec,
  matchSceneCharactersToBible,
  validateV7SceneImagePrompt,
  V7_IMAGE_PROMPT_MIN_SCORE,
} from '@/lib/v7/image-prompt-spec.core'
import type { V7CharacterBible } from '@/agents/v7/character-director.server'
import type { V7CreativeBrief } from '@/types/v7/production'
import type { V7CreativeDirection } from '@/agents/v7/creative-director.server'
import type { V7ScriptDocument } from '@/agents/v7/script-writer.server'
import type { V7StoryboardDocument } from '@/agents/v7/storyboard.server'
import type { V7WorldBible } from '@/agents/v7/world-builder.server'

const brief: V7CreativeBrief = {
  title: 'The Art of the Plate',
  duration: 45,
  platform: 'Instagram',
  language: 'English',
  aspectRatio: '9:16',
  genre: 'Commercial',
  style: 'Cinematic Food Porn / High-End Gastronomy',
  sceneCount: 8,
  voiceDirection: 'Deep narrator',
  musicDirection: 'Jazz fusion',
  emotion: 'Sensual, sophisticated, and mouth-watering',
  audience: 'Foodies',
  characterConsistency: true,
}

const direction: V7CreativeDirection = {
  visualStyle: 'High-end cinematic minimalism',
  colorPalette: ['#0A0A0A', '#D4AF37'],
  lighting: 'Chiaroscuro',
  cameraLanguage: 'Extreme macro close-ups',
  animationStyle: 'Hyper-realistic slow-motion',
  editingStyle: 'Rhythmic and sensual',
  musicStyle: 'Jazz fusion',
  voiceStyle: 'Deep baritone',
  typography: 'Didot serif',
  moodBoard: ['Macro liquid droplets'],
}

const characterBible: V7CharacterBible = {
  characters: [
    {
      name: 'Chef Julian',
      role: 'Executive Chef',
      face: 'Mature focused face',
      hair: 'Salt-and-pepper hair',
      body: 'Lean athletic build',
      costume: 'Charcoal grey chef jacket',
      accessories: ['Professional culinary tweezers'],
      expressions: ['Intense concentration'],
      voice: 'N/A',
      negativePrompt: 'messy hair',
    },
    {
      name: 'The Sophisticated Couple',
      role: 'Luxury Diners',
      face: 'Elegant poised face',
      hair: 'Sleek low bun',
      body: 'Slender poised posture',
      costume: 'Silk slip dress and navy blazer',
      accessories: ['Crystal wine glasses'],
      expressions: ['Quiet sophistication'],
      voice: 'N/A',
      negativePrompt: 'casual attire',
    },
  ],
}

const worldBible: V7WorldBible = {
  locations: [
    {
      name: 'The Professional Kitchen - Macro Station',
      architecture: 'Industrial minimalist kitchen',
      props: ['Cast iron pans', 'Artisanal ceramic plates'],
      objects: ['Premium steak', 'Droplets of oil'],
      weather: 'Indoor controlled climate',
      lighting: 'Chiaroscuro spotlighting',
      textures: ['Searing meat crust'],
      timeOfDay: 'Night',
      colorPalette: ['#0A0A0A'],
    },
    {
      name: 'The Grand Dining Room',
      architecture: 'High-end luxury interior',
      props: ['Crystal stemware'],
      objects: ['Clinking glasses', 'Elegant couple'],
      weather: 'Indoor',
      lighting: 'Low-key ambient lighting',
      textures: ['Crystal refraction'],
      timeOfDay: 'Late Evening',
      colorPalette: ['#D4AF37'],
    },
  ],
}

const script: V7ScriptDocument = {
  scenes: [
    {
      number: 1,
      title: 'The Hook: The Sizzle',
      action:
        'Extreme macro shot of a premium steak hitting a hot cast iron pan. A single droplet of oil dances on the searing surface.',
      camera: 'Extreme Close-Up (ECU)',
      duration: 5,
      location: 'Kitchen - Macro View',
      characters: [],
      narration: 'Taste... the essence.',
      dialogue: '',
      lighting: 'Chiaroscuro',
      movement: 'Slow zoom',
      emotion: 'Intense craving',
      transition: 'Cut',
    },
    {
      number: 2,
      title: 'The Craft: The Dusting',
      action:
        "A chef's hand, steady and graceful, dusts a fine herb powder over a vibrant emulsion. The powder falls like snow in slow motion.",
      camera: 'Macro Tracking Shot',
      duration: 5,
      location: 'Kitchen - Plating Station',
      characters: ['Chef'],
      narration: 'Precision in every... detail.',
      dialogue: '',
      lighting: 'Side-lit',
      movement: 'Slow pan',
      emotion: 'Precision',
      transition: 'Cut',
    },
    {
      number: 3,
      title: 'The Texture: The Glaze',
      action:
        'A rich, dark demi-glace is poured over a piece of perfectly cooked protein. The liquid flows with heavy, luxurious viscosity.',
      camera: 'Extreme Close-Up (ECU)',
      duration: 6,
      location: 'Kitchen - Plating Station',
      characters: [],
      narration: 'A symphony of... velvet.',
      dialogue: '',
      lighting: 'Spotlight',
      movement: 'Tilt down',
      emotion: 'Seductive',
      transition: 'Cut',
    },
    {
      number: 4,
      title: 'The Atmosphere: The Dining Room',
      action:
        'A blurred, bokeh-heavy shot of a sophisticated couple clinking crystal glasses. The atmosphere is intimate and dimly lit.',
      camera: 'Medium Shot',
      duration: 5,
      location: 'Dining Room',
      characters: ['Elegant Couple'],
      narration: 'Where time... stands still.',
      dialogue: '',
      lighting: 'Low-key ambient',
      movement: 'Handheld sway',
      emotion: 'Sophistication',
      transition: 'Dissolve',
    },
    {
      number: 5,
      title: 'The Detail: The Garnish',
      action:
        'Using tweezers, the Chef places a single micro-herb onto a delicate arrangement on an artisanal ceramic plate.',
      camera: 'Macro Close-Up',
      duration: 5,
      location: 'Kitchen - Plating Station',
      characters: ['Chef'],
      narration: 'Artistry... you can taste.',
      dialogue: '',
      lighting: 'Pinpoint light',
      movement: 'Static',
      emotion: 'Focused',
      transition: 'Cut',
    },
    {
      number: 6,
      title: 'The Crescendo: The Final Plate',
      action:
        'A rapid montage of textures: searing meat, pouring sauce, dusting spices, and the final, perfect plate being slid across a dark table.',
      camera: 'Rapid cuts',
      duration: 6,
      location: 'Kitchen - Plating Station',
      characters: [],
      narration: 'Experience... the extraordinary.',
      dialogue: '',
      lighting: 'Dynamic chiaroscuro',
      movement: 'Fast cuts',
      emotion: 'Exhilarating',
      transition: 'Wipe',
    },
    {
      number: 7,
      title: 'The Reveal: The Masterpiece',
      action:
        'The completed dish sits center frame on a minimalist dark table. Steam rises in a delicate swirl.',
      camera: 'Slow orbit',
      duration: 6,
      location: 'Dining Room',
      characters: [],
      narration: 'Unrivaled. Unforgettable.',
      dialogue: '',
      lighting: 'High contrast',
      movement: 'Orbit',
      emotion: 'Awe',
      transition: 'Fade',
    },
    {
      number: 8,
      title: 'The CTA: The Invitation',
      action:
        "Minimalist logo fades in over a dark, textured background. Text appears in elegant Serif typography: 'Book your table via the link in bio.'",
      camera: 'Static',
      duration: 5,
      location: 'Graphic Overlay',
      characters: [],
      narration: 'Book your table. Link in bio.',
      dialogue: '',
      lighting: 'Subtle vignette',
      movement: 'None',
      emotion: 'Inviting',
      transition: 'Fade',
    },
  ],
}

const storyboard: V7StoryboardDocument = {
  scenes: script.scenes.map((scene) => ({
    number: scene.number,
    shots: [
      {
        camera: scene.camera,
        composition: scene.action.split('.')[0],
        lighting: scene.lighting,
        movement: scene.movement,
        timing: scene.duration,
        dialogue: scene.dialogue,
        emotion: scene.emotion,
        lens: '100mm Macro',
      },
    ],
  })),
}

function buildScenePrompt(sceneNumber: number) {
  const scriptScene = script.scenes.find((scene) => scene.number === sceneNumber)!
  const shot = storyboard.scenes.find((scene) => scene.number === sceneNumber)?.shots[0]
  const spec = buildV7SceneImageSpec({
    sceneNumber,
    sceneId: `scene-${sceneNumber}`,
    productionId: 'prod-test',
    scriptScene,
    shot,
    brief,
    direction,
    characterBible,
    worldBible,
  })
  const built = buildV7SceneImagePromptFromSpec({
    spec,
    aspectRatio: '9:16',
    characterBible,
    worldBible,
    narration: scriptScene.narration,
    emotion: scriptScene.emotion,
    lens: shot?.lens,
    movement: scriptScene.movement,
  })
  return { spec, ...built }
}

describe('V7 image prompt spec', () => {
  it('does not inject character bible when scene.characters is empty', () => {
    const { prompt } = buildScenePrompt(1)
    assert.doesNotMatch(prompt, /Chef Julian/i)
    assert.doesNotMatch(prompt, /Sophisticated Couple/i)
  })

  it('injects only scene-specific chef details for hand-action scenes', () => {
    const { prompt } = buildScenePrompt(2)
    assert.match(prompt, /hand only/i)
    assert.doesNotMatch(prompt, /Sophisticated Couple/i)
  })

  it('matches screenplay Chef and Elegant Couple aliases to bible entries', () => {
    assert.equal(matchSceneCharactersToBible(['Chef'], characterBible).length, 1)
    assert.equal(matchSceneCharactersToBible(['Elegant Couple'], characterBible).length, 1)
  })

  it('scene 1 contains steak, cast iron, oil, and macro language', () => {
    const { prompt } = buildScenePrompt(1)
    assert.match(prompt, /steak/i)
    assert.match(prompt, /cast iron/i)
    assert.match(prompt, /oil/i)
    assert.match(prompt, /macro/i)
    assert.doesNotMatch(prompt, /chef portrait/i)
  })

  it('scene 3 contains demi-glace pouring and protein language', () => {
    const { prompt } = buildScenePrompt(3)
    assert.match(prompt, /demi-glace/i)
    assert.match(prompt, /pour/i)
    assert.match(prompt, /protein/i)
  })

  it('scene 4 contains couple, glasses, and dining room context', () => {
    const { prompt, negativePrompt } = buildScenePrompt(4)
    assert.match(prompt, /couple/i)
    assert.match(prompt, /glasses/i)
    assert.match(prompt, /Dining Room/i)
    assert.match(negativePrompt, /chef/i)
    assert.match(negativePrompt, /kitchen/i)
  })

  it('scene 7 contains plated dish and steam without people', () => {
    const { prompt } = buildScenePrompt(7)
    assert.match(prompt, /dish/i)
    assert.match(prompt, /steam/i)
    assert.doesNotMatch(prompt, /Chef Julian/i)
  })

  it('scene 8 contains CTA graphic language and not kitchen environment', () => {
    const { prompt, spec } = buildScenePrompt(8)
    assert.match(prompt, /Book your table via the link in bio/i)
    assert.match(prompt, /graphic/i)
    assert.doesNotMatch(prompt, /Cast iron pans/i)
    assert.equal(spec.isGraphicScene, true)
  })

  it('scene 1 negative prompt forbids chef portrait and people', () => {
    const { negativePrompt } = buildScenePrompt(1)
    assert.match(negativePrompt, /chef portrait/i)
    assert.match(negativePrompt, /people/i)
  })

  it('validation fails when action is removed from prompt', () => {
    const { spec, negativePrompt } = buildScenePrompt(1)
    const validation = validateV7SceneImagePrompt({
      spec,
      prompt: 'generic restaurant portrait of a chef',
      negativePrompt,
      characterBible,
    })
    assert.equal(validation.valid, false)
    assert.ok(validation.score.overall < V7_IMAGE_PROMPT_MIN_SCORE)
  })

  it('all eight production scenes score at least 85', () => {
    for (let sceneNumber = 1; sceneNumber <= 8; sceneNumber++) {
      const { spec, prompt, negativePrompt } = buildScenePrompt(sceneNumber)
      const validation = validateV7SceneImagePrompt({
        spec,
        prompt,
        negativePrompt,
        characterBible,
      })
      assert.equal(
        validation.valid,
        true,
        `scene ${sceneNumber} failed: ${validation.missingRequirements.join(', ')} ${validation.forbiddenTermsFound.join(', ')} score=${validation.score.overall}`
      )
      assert.ok(validation.score.overall >= V7_IMAGE_PROMPT_MIN_SCORE)
    }
  })
})

describe('Table Tales scene 5 couple validation', () => {
  const tableTalesBrief: V7CreativeBrief = {
    title: 'Table Tales: Monsoon Serenity',
    duration: 45,
    platform: 'Instagram',
    language: 'English',
    aspectRatio: '9:16',
    genre: 'Lifestyle',
    style:
      'High-end lifestyle cinematography with moody, warm lighting and shallow depth of field.',
    sceneCount: 8,
    voiceDirection: 'Warm narrator',
    musicDirection: 'Ambient rain',
    emotion: 'Cozy and intimate',
    audience: 'Urban diners',
    characterConsistency: true,
  }

  const tableTalesDirection: V7CreativeDirection = {
    visualStyle: 'Moody monsoon lifestyle',
    colorPalette: ['#1A1A2E', '#D4AF37'],
    lighting: 'Chiaroscuro',
    cameraLanguage: 'Intimate close-ups',
    animationStyle: 'Slow motion',
    editingStyle: 'Gentle pacing',
    musicStyle: 'Ambient',
    voiceStyle: 'Warm',
    typography: 'Serif',
    moodBoard: ['Rain on glass'],
  }

  const tableTalesCharacterBible: V7CharacterBible = {
    characters: [
      {
        name: 'The Cozy Couple',
        role: 'Intimate diners',
        face: 'Soft features in shadow',
        hair: 'Natural styles',
        body: 'Relaxed posture',
        costume: 'Smart casual evening wear',
        accessories: ['None'],
        expressions: ['Quiet laughter'],
        voice: 'N/A',
        negativePrompt: 'posed portrait',
      },
    ],
  }

  const tableTalesScene5Script: V7ScriptDocument['scenes'][number] = {
    number: 5,
    title: 'The Connection',
    action:
      'A man and woman sit close together in a velvet armchair, sharing a quiet laugh, their faces partially in soft shadow.',
    camera: 'Medium Shot',
    duration: 6,
    location: 'Cozy Corner Nook',
    characters: ['A couple'],
    narration: 'Reconnect with what matters most.',
    dialogue: '',
    lighting: 'Low-key, intimate warm lighting.',
    movement: 'Slow zoom-in.',
    emotion: 'Intimate',
    transition: 'Slow dissolve',
  }

  const tableTalesScene5Shot: V7StoryboardDocument['scenes'][number]['shots'][number] = {
    lens: '35mm Prime',
    camera: 'Medium Shot',
    timing: 6,
    emotion: 'Intimate',
    dialogue: 'Reconnect with what matters most.',
    lighting: 'Low-key, intimate warm lighting',
    movement: 'Slow zoom-in',
    composition: 'Couple in velvet armchair, partially in shadow',
  }

  it('passes validation for couple armchair scene without wine glasses', () => {
    const spec = buildV7SceneImageSpec({
      sceneNumber: 5,
      sceneId: 'scene-5-table-tales',
      productionId: '88ea4d5d-9249-44a7-a62a-12355a1b4831',
      scriptScene: tableTalesScene5Script,
      shot: tableTalesScene5Shot,
      brief: tableTalesBrief,
      direction: tableTalesDirection,
      characterBible: tableTalesCharacterBible,
      worldBible: null,
    })

    const built = buildV7SceneImagePromptFromSpec({
      spec,
      aspectRatio: '9:16',
      characterBible: tableTalesCharacterBible,
      worldBible: null,
      narration: tableTalesScene5Script.narration,
      emotion: tableTalesScene5Script.emotion,
      lens: tableTalesScene5Shot.lens,
      movement: tableTalesScene5Script.movement,
    })

    const validation = validateV7SceneImagePrompt({
      spec,
      prompt: built.prompt,
      negativePrompt: built.negativePrompt,
      characterBible: tableTalesCharacterBible,
    })

    assert.equal(validation.valid, true)
    assert.equal(validation.score.overall, 100)
    assert.deepEqual(validation.missingRequirements, [])
    assert.doesNotMatch(spec.requiredPromptTerms.join(' '), /\bglasses\b/)
    assert.match(built.prompt, /couple/i)
    assert.match(built.prompt, /armchair/i)
  })

  it('still requires glasses when screenplay mentions crystal glasses', () => {
    const { spec, prompt, negativePrompt } = buildScenePrompt(4)
    assert.ok(spec.requiredPromptTerms.includes('glasses'))
    const validation = validateV7SceneImagePrompt({
      spec,
      prompt,
      negativePrompt,
      characterBible,
    })
    assert.equal(validation.valid, true)
    assert.match(prompt, /glasses/i)
  })

  it('fails when required objects are removed from prompt', () => {
    const spec = buildV7SceneImageSpec({
      sceneNumber: 5,
      sceneId: 'scene-5-table-tales',
      productionId: '88ea4d5d-9249-44a7-a62a-12355a1b4831',
      scriptScene: tableTalesScene5Script,
      shot: tableTalesScene5Shot,
      brief: tableTalesBrief,
      direction: tableTalesDirection,
      characterBible: tableTalesCharacterBible,
      worldBible: null,
    })

    const built = buildV7SceneImagePromptFromSpec({
      spec,
      aspectRatio: '9:16',
      characterBible: tableTalesCharacterBible,
      worldBible: null,
    })

    const validation = validateV7SceneImagePrompt({
      spec,
      prompt: 'generic empty restaurant interior',
      negativePrompt: built.negativePrompt,
      characterBible: tableTalesCharacterBible,
    })

    assert.equal(validation.valid, false)
    assert.ok(validation.missingRequirements.length > 0)
  })

  it('macro food scene at kitchen/plating station avoids forbidden kitchen term in prompt', () => {
    const macroSceneScript: V7ScriptDocument['scenes'][number] = {
      number: 3,
      title: 'Texture and Heat',
      action:
        'A silver spoon breaks through a soft, creamy texture of a warm dish, releasing a plume of steam.',
      camera: 'Spoon breaking creamy texture',
      duration: 5,
      location: 'Restaurant kitchen/plating station',
      characters: [],
      narration: 'Taste the rhythm of the season.',
      dialogue: '',
      lighting: 'Warm tungsten highlighting steam',
      movement: 'Static (High-frame-rate)',
      emotion: 'Sensory indulgence',
      transition: 'Cut',
    }

    const spec = buildV7SceneImageSpec({
      sceneNumber: 3,
      sceneId: 'scene-3-monsoon',
      productionId: 'c79ef12e-71fa-4ba9-a186-851efda10e90',
      scriptScene: macroSceneScript,
      shot: {
        camera: macroSceneScript.camera,
        composition: macroSceneScript.action.split('.')[0],
        lighting: macroSceneScript.lighting,
        movement: macroSceneScript.movement,
        timing: macroSceneScript.duration,
        dialogue: macroSceneScript.dialogue,
        emotion: macroSceneScript.emotion,
        lens: '100mm Macro',
      },
      brief: tableTalesBrief,
      direction: tableTalesDirection,
      characterBible: tableTalesCharacterBible,
      worldBible: null,
    })

    const built = buildV7SceneImagePromptFromSpec({
      spec,
      aspectRatio: '9:16',
      characterBible: tableTalesCharacterBible,
      worldBible: null,
      narration: macroSceneScript.narration,
      emotion: macroSceneScript.emotion,
      lens: '100mm Macro',
      movement: macroSceneScript.movement,
    })

    const validation = validateV7SceneImagePrompt({
      spec,
      prompt: built.prompt,
      negativePrompt: built.negativePrompt,
      characterBible: tableTalesCharacterBible,
    })

    assert.equal(spec.isMacroFoodScene, true)
    assert.doesNotMatch(built.prompt, /\bkitchen\b/i)
    assert.match(built.prompt, /plating station/i)
    assert.equal(validation.valid, true)
    assert.deepEqual(validation.forbiddenTermsFound, [])
  })
})

describe('faceless forbidden-term negation', () => {
  function facelessSpec(forbiddenElements: string[]) {
    return {
      sceneNumber: 4,
      duration: 5,
      purpose: 'Abandoned restaurant',
      subject: 'empty restaurant interior',
      action: 'dust motes drift through an empty dining room',
      location: 'Abandoned dining room',
      characters: [] as string[],
      objects: ['empty tables', 'dust motes'],
      environment: 'dark abandoned dining room with peeling paint',
      camera: 'wide establishing shot',
      composition: 'centered empty dining room with negative space',
      lighting: 'murky low-key shadow',
      time: 'Night',
      visualStyle: 'Cinematic faceless observational documentary, no visible people',
      continuity: 'test:scene-4',
      forbiddenElements,
      requiredPromptTerms: ['empty', 'dining room'],
      isGraphicScene: false,
      isMacroFoodScene: false,
      isHandActionScene: false,
    }
  }

  const forbidden = ['people', 'person', 'crowd', 'couple', 'watermark']

  function assertForbidden(prompt: string, term: string) {
    const validation = validateV7SceneImagePrompt({
      spec: facelessSpec(forbidden),
      prompt,
      negativePrompt: 'watermark, cartoon',
    })
    assert.ok(
      validation.forbiddenTermsFound.includes(term),
      `expected forbidden "${term}" in: ${prompt}`
    )
  }

  function assertAllowed(prompt: string) {
    const validation = validateV7SceneImagePrompt({
      spec: facelessSpec(forbidden),
      prompt,
      negativePrompt: 'watermark, cartoon',
    })
    assert.deepEqual(
      validation.forbiddenTermsFound.filter((t) =>
        ['people', 'person', 'crowd', 'couple'].includes(t)
      ),
      [],
      `unexpected human-subject forbidden hits for: ${prompt} -> ${validation.forbiddenTermsFound.join(', ')}`
    )
  }

  it('allows negated faceless people phrasing', () => {
    assertAllowed('cinematic empty restaurant, no visible people, empty dining room')
    assertAllowed('dark abandoned kitchen without people, empty dining room')
    assertAllowed('empty dining room, no people, dust motes drifting')
  })

  it('rejects positive human-subject mentions', () => {
    assertForbidden(
      'people eating inside the restaurant, empty dining room',
      'people'
    )
    assertForbidden('crowd walking through the street, empty dining room', 'crowd')
    assertForbidden('person standing near the building, empty dining room', 'person')
  })

  it('still rejects unrelated forbidden terms', () => {
    const validation = validateV7SceneImagePrompt({
      spec: facelessSpec(forbidden),
      prompt: 'empty dining room with watermark overlay, no visible people',
      negativePrompt: 'cartoon',
    })
    assert.ok(validation.forbiddenTermsFound.includes('watermark'))
  })

  it('does not false-positive multi-word forbidden phrases across unrelated tokens', () => {
    const validation = validateV7SceneImagePrompt({
      spec: facelessSpec([
        'looking at camera',
        'face close-up',
        'chef portrait',
        'people',
      ]),
      prompt:
        'Extreme macro raindrop on window overlooking stormy weather. Camera: centered impact. Lens: 100mm macro. empty dining room',
      negativePrompt: 'watermark',
    })
    assert.deepEqual(validation.forbiddenTermsFound, [])
  })
})
