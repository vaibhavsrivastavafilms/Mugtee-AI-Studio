import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { StoryBible } from '@/lib/cinematic/story-bible'
import { scenePacingRole } from '@/lib/cinematic/regen-context'
import {
  motionDirectorToSceneMotion,
  rulesMotionDirector,
  sceneUsesFlicker,
} from '@/lib/motion/motion-director-rules'
import type { SceneMotion, SceneMotionMap } from '@/lib/motion/scene-motion-types'

export type {
  MotionType,
  ParticleType,
  SceneMotion,
  SceneMotionMap,
  TransitionType,
} from '@/lib/motion/scene-motion-types'
export type MotionPresetId =
  | 'documentary_drift'
  | 'historical_push_in'
  | 'battle_tracking'
  | 'luxury_reveal'
  | 'emotional_close_up'
  | 'ancient_civilization'
  | 'push_in'
  | 'pull_out'
  | 'slow_pan_left'
  | 'slow_pan_right'
  | 'orbit'
  | 'depth_parallax'
  | 'subtle_zoom'

export type MotionPresetCategory = 'ken_burns' | 'pan' | 'drift' | 'orbit' | 'parallax'

export type RemotionMotionConfig = {
  scaleFrom: number
  scaleTo: number
  translateXFrom: number
  translateXTo: number
  translateYFrom: number
  translateYTo: number
  rotateFrom?: number
  rotateTo?: number
  /** Foreground layer drift for depth_parallax */
  parallaxOffset?: number
  easing?: 'linear' | 'ease-out'
}

export type FfmpegMotionFilter = {
  filter: string
}

export type MotionPreset = {
  id: MotionPresetId
  slug: MotionPresetId
  name: string
  description: string
  category: MotionPresetCategory
  remotionConfig: RemotionMotionConfig
  ffmpegFilter: FfmpegMotionFilter
}

export type SceneMotionSource = 'auto' | 'manual'

/** @deprecated Use SceneMotion */
export type SceneMotionEntry = SceneMotion

const PRESETS: MotionPreset[] = [
  {
    id: 'documentary_drift',
    slug: 'documentary_drift',
    name: 'Documentary Drift',
    description: 'Subtle handheld-style drift — observational documentary tone.',
    category: 'drift',
    remotionConfig: {
      scaleFrom: 1.04,
      scaleTo: 1.08,
      translateXFrom: -8,
      translateXTo: 10,
      translateYFrom: 4,
      translateYTo: -6,
      easing: 'linear',
    },
    ffmpegFilter: {
      filter:
        "zoompan=z='min(zoom+0.0008,1.08)':d=125:x='iw/2-(iw/zoom/2)+8*sin(on/20)':y='ih/2-(ih/zoom/2)+4*cos(on/25)'",
    },
  },
  {
    id: 'historical_push_in',
    slug: 'historical_push_in',
    name: 'Historical Push-In',
    description: 'Deliberate slow push — gravitas for history and legacy beats.',
    category: 'ken_burns',
    remotionConfig: {
      scaleFrom: 1,
      scaleTo: 1.14,
      translateXFrom: 0,
      translateXTo: 0,
      translateYFrom: 2,
      translateYTo: -4,
      easing: 'ease-out',
    },
    ffmpegFilter: {
      filter:
        "zoompan=z='min(zoom+0.0010,1.14)':d=125:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)",
    },
  },
  {
    id: 'battle_tracking',
    slug: 'battle_tracking',
    name: 'Battle Tracking',
    description: 'Low handheld tracking with tension shake — conflict sequences.',
    category: 'pan',
    remotionConfig: {
      scaleFrom: 1.12,
      scaleTo: 1.14,
      translateXFrom: -22,
      translateXTo: 22,
      translateYFrom: 6,
      translateYTo: -8,
      easing: 'linear',
    },
    ffmpegFilter: {
      filter:
        "zoompan=z=1.12:d=125:x='iw/2-(iw/zoom/2)+12*sin(on/8)':y='ih/2-(ih/zoom/2)+6*sin(on/11)'",
    },
  },
  {
    id: 'luxury_reveal',
    slug: 'luxury_reveal',
    name: 'Luxury Reveal',
    description: 'Elegant pull-back reveal with soft light drift — premium tone.',
    category: 'ken_burns',
    remotionConfig: {
      scaleFrom: 1.14,
      scaleTo: 1.04,
      translateXFrom: 0,
      translateXTo: 0,
      translateYFrom: -6,
      translateYTo: 0,
      easing: 'ease-out',
    },
    ffmpegFilter: {
      filter:
        "zoompan=z='if(lte(zoom,1.0),1.14,max(1.001,zoom-0.0009))':d=125:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)",
    },
  },
  {
    id: 'emotional_close_up',
    slug: 'emotional_close_up',
    name: 'Emotional Close-Up',
    description: 'Intimate slow push — faces, confession, and peak emotion.',
    category: 'ken_burns',
    remotionConfig: {
      scaleFrom: 1.02,
      scaleTo: 1.2,
      translateXFrom: 0,
      translateXTo: 0,
      translateYFrom: 0,
      translateYTo: -8,
      easing: 'ease-out',
    },
    ffmpegFilter: {
      filter:
        "zoompan=z='min(zoom+0.0016,1.2)':d=125:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)",
    },
  },
  {
    id: 'ancient_civilization',
    slug: 'ancient_civilization',
    name: 'Ancient Civilization',
    description: 'Layered parallax drift with atmospheric dust — ruins and epic past.',
    category: 'parallax',
    remotionConfig: {
      scaleFrom: 1.05,
      scaleTo: 1.13,
      translateXFrom: -14,
      translateXTo: 14,
      translateYFrom: 0,
      translateYTo: 0,
      parallaxOffset: 22,
      easing: 'ease-out',
    },
    ffmpegFilter: {
      filter:
        'split[a][b];[a]scale=1.08,crop=iw:ih[c];[b]scale=1.13,crop=iw:ih[d];[c][d]overlay',
    },
  },
  {
    id: 'push_in',
    slug: 'push_in',
    name: 'Push In',
    description: 'Slow Ken Burns push toward subject — hook and peak moments.',
    category: 'ken_burns',
    remotionConfig: {
      scaleFrom: 1,
      scaleTo: 1.18,
      translateXFrom: 0,
      translateXTo: 0,
      translateYFrom: 0,
      translateYTo: 0,
      easing: 'ease-out',
    },
    ffmpegFilter: {
      filter:
        "zoompan=z='min(zoom+0.0015,1.18)':d=125:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)",
    },
  },
  {
    id: 'pull_out',
    slug: 'pull_out',
    name: 'Pull Out',
    description: 'Reveal widening frame — tension release and context beats.',
    category: 'ken_burns',
    remotionConfig: {
      scaleFrom: 1.16,
      scaleTo: 1.02,
      translateXFrom: 0,
      translateXTo: 0,
      translateYFrom: 0,
      translateYTo: 0,
      easing: 'ease-out',
    },
    ffmpegFilter: {
      filter:
        "zoompan=z='if(lte(zoom,1.0),1.16,max(1.001,zoom-0.0012))':d=125:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)",
    },
  },
  {
    id: 'slow_pan_left',
    slug: 'slow_pan_left',
    name: 'Slow Pan Left',
    description: 'Horizontal drift left across the frame.',
    category: 'pan',
    remotionConfig: {
      scaleFrom: 1.1,
      scaleTo: 1.1,
      translateXFrom: 28,
      translateXTo: -28,
      translateYFrom: 0,
      translateYTo: 0,
      easing: 'linear',
    },
    ffmpegFilter: {
      filter: "zoompan=z=1.1:d=125:x='if(lte(on,1),0,x-1)':y=ih/2-(ih/zoom/2)",
    },
  },
  {
    id: 'slow_pan_right',
    slug: 'slow_pan_right',
    name: 'Slow Pan Right',
    description: 'Horizontal drift right across the frame.',
    category: 'pan',
    remotionConfig: {
      scaleFrom: 1.1,
      scaleTo: 1.1,
      translateXFrom: -28,
      translateXTo: 28,
      translateYFrom: 0,
      translateYTo: 0,
      easing: 'linear',
    },
    ffmpegFilter: {
      filter: "zoompan=z=1.1:d=125:x='if(lte(on,1),0,x+1)':y=ih/2-(ih/zoom/2)",
    },
  },
  {
    id: 'orbit',
    slug: 'orbit',
    name: 'Orbit',
    description: 'Gentle rotational orbit around center — dynamic without AI video.',
    category: 'orbit',
    remotionConfig: {
      scaleFrom: 1.08,
      scaleTo: 1.12,
      translateXFrom: 0,
      translateXTo: 0,
      translateYFrom: 0,
      translateYTo: 0,
      rotateFrom: -0.6,
      rotateTo: 0.6,
      easing: 'ease-out',
    },
    ffmpegFilter: {
      filter: 'rotate=0.006*sin(2*PI*t/8):c=none:ow=iw:oh=ih',
    },
  },
  {
    id: 'depth_parallax',
    slug: 'depth_parallax',
    name: 'Depth Parallax',
    description: 'Foreground/background separation via layered scale drift.',
    category: 'parallax',
    remotionConfig: {
      scaleFrom: 1.06,
      scaleTo: 1.14,
      translateXFrom: -12,
      translateXTo: 12,
      translateYFrom: 0,
      translateYTo: 0,
      parallaxOffset: 18,
      easing: 'ease-out',
    },
    ffmpegFilter: {
      filter:
        'split[a][b];[a]scale=1.08,crop=iw:ih[c];[b]scale=1.14,crop=iw:ih[d];[c][d]overlay',
    },
  },
  {
    id: 'subtle_zoom',
    slug: 'subtle_zoom',
    name: 'Subtle Zoom',
    description: 'Barely-there zoom — calm hold scenes and aftertaste.',
    category: 'ken_burns',
    remotionConfig: {
      scaleFrom: 1,
      scaleTo: 1.06,
      translateXFrom: 0,
      translateXTo: 0,
      translateYFrom: 0,
      translateYTo: 0,
      easing: 'ease-out',
    },
    ffmpegFilter: {
      filter:
        "zoompan=z='min(zoom+0.0006,1.06)':d=125:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)",
    },
  },
]

const PRESET_BY_ID = new Map(PRESETS.map((p) => [p.id, p]))

export const MOTION_PRESET_LIST = PRESETS

export function isMotionPresetId(value: string): value is MotionPresetId {
  return PRESET_BY_ID.has(value as MotionPresetId)
}

export function getMotionPreset(id: MotionPresetId): MotionPreset {
  return PRESET_BY_ID.get(id) ?? PRESET_BY_ID.get('documentary_drift')!
}

export function motionPresetLabel(id: MotionPresetId): string {
  return getMotionPreset(id).name
}

/** Role-based defaults when camera language does not match. */
const ROLE_DEFAULTS: Record<string, MotionPresetId> = {
  hook: 'historical_push_in',
  tension: 'documentary_drift',
  peak: 'emotional_close_up',
  aftertaste: 'luxury_reveal',
  bridge: 'slow_pan_right',
}

/** Alternating variety by scene index when heuristics tie. */
const INDEX_CYCLE: MotionPresetId[] = [
  'push_in',
  'slow_pan_right',
  'documentary_drift',
  'pull_out',
  'slow_pan_left',
  'subtle_zoom',
  'orbit',
  'depth_parallax',
]

function normalizeHint(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
}

function matchPresetFromHints(hints: string[]): MotionPresetId | null {
  const joined = normalizeHint(hints.filter(Boolean).join(' '))

  if (/\b(ancient|ruin|civilization|temple|pyramid|dust|sand)\b/.test(joined))
    return 'ancient_civilization'
  if (/\b(luxury|premium|opulent|jewel|gold|haute)\b/.test(joined)) return 'luxury_reveal'
  if (/\b(battle|war|fight|combat|siege|clash)\b/.test(joined)) return 'battle_tracking'
  if (/\b(history|historical|legacy|archive|century|era)\b/.test(joined))
    return 'historical_push_in'
  if (/\b(tear|grief|intimate|emotion|confess|close[\s-]?up|portrait)\b/.test(joined))
    return 'emotional_close_up'
  if (/\b(parallax|depth|layer|foreground)\b/.test(joined)) return 'depth_parallax'
  if (/\b(orbit|arc|circle|rotate|swing)\b/.test(joined)) return 'orbit'
  if (/\b(pull\s*out|pull\s*back|reveal|wide|establish)\b/.test(joined)) return 'pull_out'
  if (/\b(pan\s*left|left\s*pan|track\s*left)\b/.test(joined)) return 'slow_pan_left'
  if (/\b(pan\s*right|right\s*pan|track\s*right)\b/.test(joined)) return 'slow_pan_right'
  if (/\b(drift|handheld|documentary|observ)\b/.test(joined)) return 'documentary_drift'
  if (/\b(push\s*in|dolly\s*in|zoom\s*in|close)\b/.test(joined)) return 'push_in'
  if (/\b(subtle|static|hold|still)\b/.test(joined)) return 'subtle_zoom'
  if (/\b(zoom|ken\s*burns)\b/.test(joined)) return 'subtle_zoom'

  return null
}

export function selectMotionPresetForScene(
  scene: Pick<
    GeneratedScene,
    'cameraAngle' | 'movementStyle' | 'visualPrompt' | 'description' | 'title'
  >,
  sceneIndex: number,
  totalScenes: number,
  storyBible?: StoryBible | null
): MotionPresetId {
  const role = scenePacingRole(sceneIndex + 1, totalScenes)
  const hints = [
    scene.movementStyle,
    scene.cameraAngle,
    storyBible?.cameraLanguage,
    storyBible?.mood,
    scene.visualPrompt,
    scene.description,
    scene.title,
  ].filter((h): h is string => Boolean(h?.trim()))

  const matched = matchPresetFromHints(hints)
  if (matched) return matched

  return ROLE_DEFAULTS[role] ?? INDEX_CYCLE[sceneIndex % INDEX_CYCLE.length]
}

/** Assign motion presets for all scenes — skips manual overrides in existing map. */
export function assignSceneMotion(
  scenes: GeneratedScene[],
  storyBible?: StoryBible | null,
  existing?: SceneMotionMap | null
): SceneMotionMap {
  const total = scenes.length || 1
  const next: SceneMotionMap = { ...(existing ?? {}) }

  scenes.forEach((scene, i) => {
    const id = scene.id || `scene-${i + 1}`
    const current = next[id]
    if (current?.source === 'manual') return

    const directed = rulesMotionDirector({
      scene,
      sceneIndex: i,
      totalScenes: total,
      storyBible,
      mood: storyBible?.mood,
    })
    const mood = [
      storyBible?.mood,
      scene.lightingMood,
      scene.environment,
      scene.description,
    ]
      .filter(Boolean)
      .join(' ')
    next[id] = motionDirectorToSceneMotion(directed, sceneUsesFlicker(mood))
  })

  return next
}

export function parseSceneMotionMap(raw: unknown): SceneMotionMap {
  if (!raw || typeof raw !== 'object') return {}
  const map: SceneMotionMap = {}
  for (const [sceneId, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    const presetRaw = String(row.presetId ?? row.preset ?? '')
    if (!isMotionPresetId(presetRaw)) continue
    map[sceneId] = {
      presetId: presetRaw,
      motionType:
        typeof row.motionType === 'string' ? (row.motionType as SceneMotion['motionType']) : undefined,
      duration: typeof row.duration === 'number' ? row.duration : undefined,
      zoomLevel: typeof row.zoomLevel === 'number' ? row.zoomLevel : undefined,
      particleType:
        typeof row.particleType === 'string'
          ? (row.particleType as SceneMotion['particleType'])
          : undefined,
      transitionType:
        typeof row.transitionType === 'string'
          ? (row.transitionType as SceneMotion['transitionType'])
          : undefined,
      depthEnabled: typeof row.depthEnabled === 'boolean' ? row.depthEnabled : undefined,
      animationIntensity:
        typeof row.animationIntensity === 'number' ? row.animationIntensity : undefined,
      params:
        row.params && typeof row.params === 'object'
          ? (row.params as Partial<RemotionMotionConfig>)
          : undefined,
      source: row.source === 'manual' ? 'manual' : 'auto',
    }
  }
  return map
}

export function sceneMotionToGeneratedFields(
  sceneId: string,
  map: SceneMotionMap
): Pick<GeneratedScene, 'motionPresetId' | 'motionParams'> {
  const entry = map[sceneId]
  if (!entry) return {}
  return {
    motionPresetId: entry.presetId,
    motionParams: entry.params,
  }
}

export function applySceneMotionToScenes(
  scenes: GeneratedScene[],
  map: SceneMotionMap
): GeneratedScene[] {
  return scenes.map((scene, i) => {
    const id = scene.id || `scene-${i + 1}`
    const fields = sceneMotionToGeneratedFields(id, map)
    if (!fields.motionPresetId) return scene
    return { ...scene, ...fields }
  })
}
