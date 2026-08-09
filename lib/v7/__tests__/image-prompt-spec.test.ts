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
